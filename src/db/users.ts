import { count, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { registrations, users } from './schema.ts';
import type { AdminUserItem } from '../types/admin.ts';

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

export async function getOrCreateUser(id: string, name: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        id,
        name,
        email,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name,
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('تعذر حفظ بيانات المستخدم في قاعدة البيانات.', {
      cause: error,
    });
  }
}

export async function getAllUsersForAdmin(): Promise<AdminUserItem[]> {
  try {
    const [userRows, regCounts] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      db
        .select({
          userId: registrations.userId,
          total: count(),
        })
        .from(registrations)
        .where(eq(registrations.status, 'active'))
        .groupBy(registrations.userId),
    ]);

    const countMap = new Map<string, number>();
    for (const row of regCounts) {
      countMap.set(row.userId, Number(row.total ?? 0));
    }

    return userRows.map((row) => {
      const createdDate = new Date(row.createdAt);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: createdDate.toISOString(),
        dateArabic: formatArabicDate(createdDate),
        timeArabic: formatArabicTime(createdDate),
        registrationsCount: countMap.get(row.id) ?? 0,
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllUsersForAdmin:', error);
    throw new Error('تعذر تحميل قائمة المستخدمين حاليًا.', { cause: error });
  }
}
