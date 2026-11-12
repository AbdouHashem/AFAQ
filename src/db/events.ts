import { and, count, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { events, registrations } from './schema.ts';
import { deleteEventMediaByUrl } from './media.ts';
import type { AfaqEvent, EventCategory, EventStatus } from '../types/event.ts';
import type { AdminEventItem } from '../types/admin.ts';

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

function mapEventRow(row: typeof events.$inferSelect): AfaqEvent {
  const startsDate = new Date(row.startsAt);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    categoryLabel: CATEGORY_LABELS[row.category],
    dateArabic: formatArabicDate(startsDate),
    timeArabic: formatArabicTime(startsDate),
    startsAt: startsDate.toISOString(),
    location: row.location,
    organizer: row.organizer,
    coverImageUrl: row.coverImageUrl ?? undefined,
    status: row.status,
  };
}

export async function getPublishedEvents(): Promise<AfaqEvent[]> {
  try {
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.status, 'published'))
      .orderBy(desc(events.createdAt), desc(events.startsAt));

    return rows.map(mapEventRow);
  } catch (error) {
    console.error('Database query failed in getPublishedEvents:', error);
    throw new Error('تعذر تحميل الفعاليات حاليًا. يرجى المحاولة لاحقًا.', {
      cause: error,
    });
  }
}

export async function getPublishedEventById(
  id: string
): Promise<AfaqEvent | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  try {
    const rows = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.status, 'published')))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return mapEventRow(rows[0]);
  } catch (error) {
    console.error('Database query failed in getPublishedEventById:', error);
    throw new Error('تعذر تحميل تفاصيل الفعالية حاليًا. يرجى المحاولة لاحقًا.', {
      cause: error,
    });
  }
}

export class EventValidationError extends Error {
  statusCode: number;
  fieldErrors?: Record<string, string>;
  constructor(
    message: string,
    statusCode = 400,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

export interface AdminEventInput {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  startsAt?: unknown;
  location?: unknown;
  organizer?: unknown;
  coverImageUrl?: unknown;
  status?: unknown;
}

const VALID_EVENT_CATEGORIES: EventCategory[] = ['workshop', 'course', 'event'];
const VALID_EVENT_STATUSES: EventStatus[] = ['draft', 'published', 'hidden'];

function validateEventInput(input: AdminEventInput, partial = false) {
  const updates: Partial<typeof events.$inferInsert> = {};
  const fieldErrors: Record<string, string> = {};

  if (!partial || input.title !== undefined) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) {
      fieldErrors.title = 'عنوان الفعالية مطلوب.';
    } else if (title.length > 200) {
      fieldErrors.title = 'عنوان الفعالية يجب ألا يتجاوز 200 حرف.';
    } else {
      updates.title = title;
    }
  }

  if (!partial || input.description !== undefined) {
    const description =
      typeof input.description === 'string' ? input.description.trim() : '';
    if (!description) {
      fieldErrors.description = 'وصف الفعالية مطلوب.';
    } else {
      updates.description = description;
    }
  }

  if (!partial || input.category !== undefined) {
    if (
      typeof input.category !== 'string' ||
      !VALID_EVENT_CATEGORIES.includes(input.category as EventCategory)
    ) {
      fieldErrors.category = 'يرجى اختيار تصنيف صالح للفعالية.';
    } else {
      updates.category = input.category as EventCategory;
    }
  }

  if (!partial || input.startsAt !== undefined) {
    const rawDate =
      typeof input.startsAt === 'string' ? input.startsAt.trim() : '';
    if (!rawDate) {
      fieldErrors.startsAt = 'تاريخ ووقت الفعالية مطلوبان.';
    } else {
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) {
        fieldErrors.startsAt = 'تاريخ ووقت الفعالية غير صالحين.';
      } else {
        updates.startsAt = parsedDate;
      }
    }
  }

  if (!partial || input.location !== undefined) {
    const location =
      typeof input.location === 'string' ? input.location.trim() : '';
    if (!location) {
      fieldErrors.location = 'مكان الفعالية مطلوب.';
    } else {
      updates.location = location;
    }
  }

  if (!partial || input.organizer !== undefined) {
    const organizer =
      typeof input.organizer === 'string' ? input.organizer.trim() : '';
    if (!organizer) {
      fieldErrors.organizer = 'اسم الجهة المنظمة مطلوب.';
    } else {
      updates.organizer = organizer;
    }
  }

  if (input.coverImageUrl !== undefined) {
    if (input.coverImageUrl === null || input.coverImageUrl === '') {
      updates.coverImageUrl = null;
    } else if (typeof input.coverImageUrl === 'string') {
      const trimmedUrl = input.coverImageUrl.trim();
      if (!trimmedUrl) {
        updates.coverImageUrl = null;
      } else if (
        trimmedUrl.startsWith('/') ||
        trimmedUrl.startsWith('https://') ||
        trimmedUrl.startsWith('http://')
      ) {
        updates.coverImageUrl = trimmedUrl;
      } else {
        fieldErrors.coverImageUrl =
          'رابط صورة الغلاف يجب أن يبدأ بـ / أو https://.';
      }
    } else {
      fieldErrors.coverImageUrl = 'رابط صورة الغلاف غير صالح.';
    }
  }

  if (!partial || input.status !== undefined) {
    const status = input.status ?? 'draft';
    if (
      typeof status !== 'string' ||
      !VALID_EVENT_STATUSES.includes(status as EventStatus)
    ) {
      fieldErrors.status = 'حالة الفعالية غير صالحة.';
    } else {
      updates.status = status as EventStatus;
    }
  }

  const firstError = Object.values(fieldErrors)[0];
  if (firstError) {
    throw new EventValidationError(firstError, 400, fieldErrors);
  }

  return updates;
}

export async function getAllEventsForAdmin(): Promise<AdminEventItem[]> {
  try {
    const [rows, registrationCounts] = await Promise.all([
      db.select().from(events).orderBy(desc(events.createdAt)),
      db
        .select({
          eventId: registrations.eventId,
          total: count(),
        })
        .from(registrations)
        .where(eq(registrations.status, 'active'))
        .groupBy(registrations.eventId),
    ]);

    const countMap = new Map<string, number>();
    for (const item of registrationCounts) {
      countMap.set(item.eventId, Number(item.total ?? 0));
    }

    return rows.map((row) => ({
      ...mapEventRow(row),
      registrationsCount: countMap.get(row.id) ?? 0,
    }));
  } catch (error) {
    console.error('Database query failed in getAllEventsForAdmin:', error);
    throw new Error('تعذر تحميل قائمة الفعاليات للمشرف حاليًا.', {
      cause: error,
    });
  }
}

export async function getEventByIdForAdmin(
  id: string
): Promise<AdminEventItem | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  try {
    const [rows, activeCountRows] = await Promise.all([
      db.select().from(events).where(eq(events.id, id)).limit(1),
      db
        .select({ total: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, id),
            eq(registrations.status, 'active')
          )
        ),
    ]);

    if (rows.length === 0) {
      return null;
    }

    return {
      ...mapEventRow(rows[0]),
      registrationsCount: Number(activeCountRows[0]?.total ?? 0),
    };
  } catch (error) {
    console.error('Database query failed in getEventByIdForAdmin:', error);
    throw new Error('تعذر تحميل بيانات الفعالية حاليًا.', { cause: error });
  }
}

export async function createEventAsAdmin(
  input: AdminEventInput
): Promise<AdminEventItem> {
  const values = validateEventInput(input, false) as typeof events.$inferInsert;

  try {
    const inserted = await db.insert(events).values(values).returning();
    return {
      ...mapEventRow(inserted[0]),
      registrationsCount: 0,
    };
  } catch (error) {
    console.error('Database query failed in createEventAsAdmin:', error);
    throw new Error('تعذر إنشاء الفعالية حاليًا.', { cause: error });
  }
}

export async function updateEventAsAdmin(
  id: string,
  input: AdminEventInput
): Promise<AdminEventItem> {
  if (!UUID_REGEX.test(id)) {
    throw new EventValidationError('معرّف الفعالية غير صالح.', 400);
  }

  const updates = validateEventInput(input, true);
  if (Object.keys(updates).length === 0) {
    throw new EventValidationError('لا توجد بيانات لتحديث الفعالية.', 400);
  }

  try {
    const existingRows =
      updates.coverImageUrl !== undefined
        ? await db
            .select({ coverImageUrl: events.coverImageUrl })
            .from(events)
            .where(eq(events.id, id))
            .limit(1)
        : [];

    const [updated, activeCountRows] = await Promise.all([
      db.update(events).set(updates).where(eq(events.id, id)).returning(),
      db
        .select({ total: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, id),
            eq(registrations.status, 'active')
          )
        ),
    ]);

    if (updated.length === 0) {
      throw new EventValidationError('الفعالية غير موجودة.', 404);
    }

    if (
      updates.coverImageUrl !== undefined &&
      existingRows[0]?.coverImageUrl &&
      existingRows[0].coverImageUrl !== updated[0].coverImageUrl
    ) {
      await deleteEventMediaByUrl(existingRows[0].coverImageUrl);
    }

    return {
      ...mapEventRow(updated[0]),
      registrationsCount: Number(activeCountRows[0]?.total ?? 0),
    };
  } catch (error) {
    if (error instanceof EventValidationError) {
      throw error;
    }
    console.error('Database query failed in updateEventAsAdmin:', error);
    throw new Error('تعذر تحديث الفعالية حاليًا.', { cause: error });
  }
}

export async function deleteEventAsAdmin(id: string): Promise<void> {
  if (!UUID_REGEX.test(id)) {
    throw new EventValidationError('معرّف الفعالية غير صالح.', 400);
  }

  try {
    const deleted = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning({
        id: events.id,
        coverImageUrl: events.coverImageUrl,
      });

    if (deleted.length === 0) {
      throw new EventValidationError('الفعالية غير موجودة.', 404);
    }

    if (deleted[0].coverImageUrl) {
      await deleteEventMediaByUrl(deleted[0].coverImageUrl);
    }
  } catch (error) {
    if (error instanceof EventValidationError) {
      throw error;
    }
    console.error('Database query failed in deleteEventAsAdmin:', error);
    throw new Error('تعذر حذف الفعالية حاليًا.', { cause: error });
  }
}
