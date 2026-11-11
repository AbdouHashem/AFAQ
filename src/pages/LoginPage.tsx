import React, { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { AfaqLogo } from '../components/brand/AfaqLogo';
import { useAuth } from '../context/AuthContext';

export interface LoginPageProps {
  onBack: () => void;
  onSuccessRedirect: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBack,
  onSuccessRedirect,
}) => {
  const {
    user,
    authLoading,
    signInLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
  } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !signInLoading && user && !redirectedRef.current) {
      redirectedRef.current = true;
      onSuccessRedirect();
    }
  }, [authLoading, signInLoading, user, onSuccessRedirect]);

  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const handleGoogleSignIn = async () => {
    const ok = await signInWithGoogle();
    if (ok && !redirectedRef.current) {
      redirectedRef.current = true;
      onSuccessRedirect();
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="py-10 md:py-16 focus:outline-none">
      <div className="afaq-container space-y-8">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-small font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>رجوع</span>
          </button>
        </div>

        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <AfaqLogo size="lg" showEnglishSub />

            <div className="space-y-2">
              <h1 className="text-h2 font-bold text-brand-900">
                تسجيل الدخول
              </h1>
              <p className="text-small text-slate-600">
                ادخل بحساب جوجل الخاص بك لاكتشاف فعاليات الفيوم وحجز مكانك بسهولة من مكان واحد.
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="flex w-full items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-start text-small text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="font-ui leading-snug">{authError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={signInLoading || authLoading}
              onClick={handleGoogleSignIn}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-brand-700 bg-brand-700 px-6 py-3 font-ui text-body font-semibold text-white shadow-xs transition-colors duration-150 hover:bg-brand-800 active:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
            >
              {signInLoading || authLoading ? (
                <>
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span>
                    {authLoading ? 'جارٍ التحقق من الجلسة...' : 'جارٍ تسجيل الدخول...'}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                  </span>
                  <span>الدخول بحساب جوجل</span>
                </>
              )}
            </button>

            <p className="text-caption text-slate-600">
              يتم إنشاء حسابك تلقائيًا عند تسجيل الدخول لأول مرة باستخدام اسمك وبريدك في جوجل.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
