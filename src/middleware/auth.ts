import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import { isUserAdmin } from '../db/roles.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرّح: يرجى تسجيل الدخول أولًا.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email ?? `${decodedToken.uid}@users.afaq.local`;
    const name = decodedToken.name ?? email.split('@')[0] ?? 'مستخدم آفاق';
    await getOrCreateUser(decodedToken.uid, name, email);

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'غير مصرّح: جلسة غير صالحة أو منتهية.' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'غير مصرّح: يرجى تسجيل الدخول أولًا.' });
  }

  try {
    const isAdmin = await isUserAdmin(uid);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: 'غير مصرّح: هذه الصلاحية مخصصة للمشرفين فقط.' });
    }
    next();
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return res
      .status(500)
      .json({ error: 'تعذر التحقق من صلاحيات المشرف حاليًا.' });
  }
};
