import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { events, registrations, users } from './schema.ts';
import type { EventCategory, UserRegistrationItem } from '../types/event.ts';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_LABELS: Record<EventCategory, string> = {
  workshop: 'ورشة عمل',
  course: 'دورة',
  event: 'فعالية',
};

function formatArabicDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(date);
}

function formatArabicTime(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Cairo',
  })
    .format(date)
    .replace('ص', 'صباحًا')
    .replace('م', 'مساءً');
}

export async function getUserRegistrations(
  userId: string
): Promise<UserRegistrationItem[]> {
  try {
    const rows = await db
      .select({
        id: registrations.id,
        eventId: registrations.eventId,
        status: registrations.status,
        createdAt: registrations.createdAt,
        eventTitle: events.title,
        eventCategory: events.category,
        eventStartsAt: events.startsAt,
        eventLocation: events.location,
        eventOrganizer: events.organizer,
        eventCoverImageUrl: events.coverImageUrl,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.status, 'active'),
          eq(events.status, 'published')
        )
      )
      .orderBy(asc(events.startsAt));

    return rows.map((row) => {
      const startsDate = new Date(row.eventStartsAt);
      return {
        id: row.id,
        eventId: row.eventId,
        status: row.status,
        createdAt: new Date(row.createdAt).toISOString(),
        eventTitle: row.eventTitle,
        eventCategory: row.eventCategory,
        categoryLabel: CATEGORY_LABELS[row.eventCategory],
        eventStartsAt: startsDate.toISOString(),
        dateArabic: formatArabicDate(startsDate),
        timeArabic: formatArabicTime(startsDate),
        eventLocation: row.eventLocation,
        eventOrganizer: row.eventOrganizer,
        eventCoverImageUrl: row.eventCoverImageUrl ?? undefined,
      };
    });
  } catch (error) {
    console.error('Database query failed in getUserRegistrations:', error);
    throw new Error('تعذر تحميل التسجيلات الخاصة بك حاليًا.', {
      cause: error,
    });
  }
}

export async function isUserRegisteredForEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  if (!UUID_REGEX.test(eventId)) {
    return false;
  }

  try {
    const existing = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.eventId, eventId),
          eq(registrations.status, 'active')
        )
      )
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    console.error('Database query failed in isUserRegisteredForEvent:', error);
    throw new Error('تعذر التحقق من حالة التسجيل حاليًا.', {
      cause: error,
    });
  }
}

export class RegistrationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createUserRegistration(userId: string, eventId: string) {
  if (!UUID_REGEX.test(eventId)) {
    throw new RegistrationError('معرّف الفعالية غير صالح.', 400);
  }

  try {
    const publishedEvent = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.status, 'published')))
      .limit(1);

    if (publishedEvent.length === 0) {
      throw new RegistrationError(
        'الفعالية غير موجودة أو غير متاحة للتسجيل.',
        404
      );
    }

    const existing = await db
      .select({ id: registrations.id, status: registrations.status })
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.eventId, eventId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        throw new RegistrationError('أنت مسجل بالفعل في هذه الفعالية.', 409);
      }

      const reactivated = await db
        .update(registrations)
        .set({
          status: 'active',
          cancelledAt: null,
          createdAt: new Date(),
        })
        .where(
          and(
            eq(registrations.id, existing[0].id),
            eq(registrations.status, 'cancelled')
          )
        )
        .returning();

      if (reactivated.length === 0) {
        throw new RegistrationError('أنت مسجل بالفعل في هذه الفعالية.', 409);
      }

      return reactivated[0];
    }

    const inserted = await db
      .insert(registrations)
      .values({
        userId,
        eventId,
        status: 'active',
        cancelledAt: null,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    if (error instanceof RegistrationError) {
      throw error;
    }
    const pgCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
    if (pgCode === '23505') {
      throw new RegistrationError('أنت مسجل بالفعل في هذه الفعالية.', 409);
    }
    console.error('Database query failed in createUserRegistration:', error);
    throw new Error('تعذر إتمام التسجيل حاليًا. يرجى المحاولة لاحقًا.', {
      cause: error,
    });
  }
}

export async function cancelUserRegistration(userId: string, eventId: string) {
  if (!UUID_REGEX.test(eventId)) {
    throw new RegistrationError('معرّف الفعالية غير صالح.', 400);
  }

  try {
    const updated = await db
      .update(registrations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.eventId, eventId),
          eq(registrations.status, 'active')
        )
      )
      .returning();

    if (updated.length > 0) {
      return updated[0];
    }

    const existing = await db
      .select({ status: registrations.status })
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.eventId, eventId)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].status === 'cancelled') {
      throw new RegistrationError(
        'تم إلغاء تسجيلك في هذه الفعالية مسبقًا.',
        409
      );
    }

    throw new RegistrationError(
      'لا يوجد تسجيل نشط لك في هذه الفعالية.',
      404
    );
  } catch (error) {
    if (error instanceof RegistrationError) {
      throw error;
    }
    console.error('Database query failed in cancelUserRegistration:', error);
    throw new Error('تعذر إلغاء التسجيل حاليًا. يرجى المحاولة لاحقًا.', {
      cause: error,
    });
  }
}

export async function getAllRegistrationsForAdmin(eventId?: string) {
  if (eventId !== undefined && !UUID_REGEX.test(eventId)) {
    throw new RegistrationError('معرّف الفعالية غير صالح.', 400);
  }

  try {
    const whereClause = eventId
      ? and(
          eq(registrations.status, 'active'),
          eq(registrations.eventId, eventId)
        )
      : eq(registrations.status, 'active');

    const rows = await db
      .select({
        id: registrations.id,
        userId: registrations.userId,
        userName: users.name,
        userEmail: users.email,
        eventId: registrations.eventId,
        eventTitle: events.title,
        createdAt: registrations.createdAt,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(users, eq(registrations.userId, users.id))
      .where(whereClause)
      .orderBy(desc(registrations.createdAt));

    return rows.map((row) => {
      const createdDate = new Date(row.createdAt);
      return {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        createdAt: createdDate.toISOString(),
        dateArabic: formatArabicDate(createdDate),
        timeArabic: formatArabicTime(createdDate),
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllRegistrationsForAdmin:', error);
    throw new Error('تعذر تحميل تسجيلات الفعاليات حاليًا.', { cause: error });
  }
}
