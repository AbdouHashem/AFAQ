import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { tryParseJson } from '../lib/safe-json';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  authLoading: boolean;
  signInLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء نافذة تسجيل الدخول بحساب جوجل. يمكنك المحاولة مرة أخرى.';
    case 'auth/popup-blocked':
      return 'المتصفح منع فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مجددًا.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
    case 'auth/account-exists-with-different-credential':
      return 'هذا البريد الإلكتروني مرتبط بطريقة تسجيل دخول مختلفة.';
    case 'auth/too-many-requests':
      return 'تم إجراء عدة محاولات متتالية. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب. يرجى التواصل مع إدارة المنصة.';
    case 'auth/unauthorized-domain':
      return 'نطاق هذا الرابط غير مضاف في النطاقات المسموح بها في Firebase Authentication. أضف رابط الموقع من إعدادات Authentication في Firebase Console.';
    default:
      return error instanceof Error && error.message.includes('تعذر')
        ? error.message
        : 'حدث خطأ أثناء تسجيل الدخول بحساب جوجل. يرجى المحاولة مرة أخرى.';
  }
}

function buildFallbackUser(firebaseUser: User): AuthUser {
  const fallbackName =
    firebaseUser.displayName ??
    firebaseUser.email?.split('@')[0] ??
    'مستخدم آفاق';

  return {
    id: firebaseUser.uid,
    name: fallbackName,
    email: firebaseUser.email ?? '',
    isAdmin: false,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncUserWithBackend(
  firebaseUser: User,
  maxAttempts = 3
): Promise<{ user: AuthUser; token: string }> {
  const token = await firebaseUser.getIdToken();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await tryParseJson<{ user?: AuthUser; error?: string }>(res);

      if (!res.ok || !data) {
        const retryable = !data || res.status >= 500;
        lastError = new Error(
          data?.error ||
            'تعذر مزامنة بيانات حسابك مع الخادم. يرجى المحاولة مرة أخرى.'
        );
        if (retryable && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw lastError;
      }

      const syncedUser = data.user
        ? {
            ...data.user,
            isAdmin: Boolean(data.user.isAdmin),
          }
        : buildFallbackUser(firebaseUser);

      return {
        token,
        user: syncedUser,
      };
    } catch (err) {
      lastError =
        err instanceof Error
          ? err
          : new Error('تعذر مزامنة بيانات حسابك مع الخادم.');
      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw (
    lastError ??
    new Error('تعذر مزامنة بيانات حسابك مع الخادم. يرجى المحاولة مرة أخرى.')
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const inMemoryTokenRef = useRef<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        inMemoryTokenRef.current = null;
        setAuthLoading(false);
        return;
      }

      try {
        const synced = await syncUserWithBackend(firebaseUser);
        if (!active) return;
        inMemoryTokenRef.current = synced.token;
        setUser(synced.user);
      } catch {
        if (!active) return;
        setUser(buildFallbackUser(firebaseUser));
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    setSignInLoading(true);
    try {
      googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const synced = await syncUserWithBackend(credential.user);
      inMemoryTokenRef.current = synced.token;
      setUser(synced.user);
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setSignInLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
    setUser(null);
    inMemoryTokenRef.current = null;
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    const freshToken = await auth.currentUser.getIdToken();
    inMemoryTokenRef.current = freshToken;
    return freshToken ?? inMemoryTokenRef.current;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        signInLoading,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
