import { db } from './index.ts';
import { users } from './schema.ts';

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
