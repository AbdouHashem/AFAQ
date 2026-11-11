import { and, asc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { events } from './schema.ts';
import type { AfaqEvent, EventCategory } from '../types/event.ts';

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
      .orderBy(asc(events.startsAt));

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
