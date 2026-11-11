import { and, count, desc, eq, gt } from 'drizzle-orm';
import { db } from './index.ts';
import { events, registrations, users } from './schema.ts';
import type {
  AdminDashboardData,
  AdminDashboardStats,
  AdminRecentRegistration,
} from '../types/admin.ts';

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

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const now = new Date();

    const [
      statusCounts,
      upcomingResult,
      registrationsResult,
      usersResult,
      recentRows,
    ] = await Promise.all([
      db
        .select({
          status: events.status,
          total: count(),
        })
        .from(events)
        .groupBy(events.status),
      db
        .select({ total: count() })
        .from(events)
        .where(and(eq(events.status, 'published'), gt(events.startsAt, now))),
      db
        .select({ total: count() })
        .from(registrations)
        .where(eq(registrations.status, 'active')),
      db.select({ total: count() }).from(users),
      db
        .select({
          id: registrations.id,
          userName: users.name,
          userEmail: users.email,
          eventId: registrations.eventId,
          eventTitle: events.title,
          createdAt: registrations.createdAt,
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .innerJoin(events, eq(registrations.eventId, events.id))
        .where(eq(registrations.status, 'active'))
        .orderBy(desc(registrations.createdAt))
        .limit(5),
    ]);

    const stats: AdminDashboardStats = {
      draftEventsCount: 0,
      publishedEventsCount: 0,
      hiddenEventsCount: 0,
      totalRegistrationsCount: Number(registrationsResult[0]?.total ?? 0),
      upcomingEventsCount: Number(upcomingResult[0]?.total ?? 0),
      totalUsersCount: Number(usersResult[0]?.total ?? 0),
    };

    for (const row of statusCounts) {
      const value = Number(row.total ?? 0);
      if (row.status === 'draft') {
        stats.draftEventsCount = value;
      } else if (row.status === 'published') {
        stats.publishedEventsCount = value;
      } else if (row.status === 'hidden') {
        stats.hiddenEventsCount = value;
      }
    }

    const recentRegistrations: AdminRecentRegistration[] = recentRows.map(
      (row) => {
        const createdDate = new Date(row.createdAt);
        return {
          id: row.id,
          userName: row.userName,
          userEmail: row.userEmail,
          eventId: row.eventId,
          eventTitle: row.eventTitle,
          createdAt: createdDate.toISOString(),
          dateArabic: formatArabicDate(createdDate),
          timeArabic: formatArabicTime(createdDate),
        };
      }
    );

    return {
      stats,
      recentRegistrations,
    };
  } catch (error) {
    console.error('Database query failed in getAdminDashboardData:', error);
    throw new Error('تعذر تحميل إحصائيات لوحة التحكم حاليًا.', {
      cause: error,
    });
  }
}
