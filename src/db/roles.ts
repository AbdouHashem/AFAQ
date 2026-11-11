import { and, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { userRoles } from './schema.ts';

export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.role, 'admin')))
      .limit(1);

    return rows.length > 0;
  } catch (error) {
    console.error('Database error in isUserAdmin:', error);
    throw new Error('تعذر التحقق من صلاحيات المستخدم.', { cause: error });
  }
}
