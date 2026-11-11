import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import type { UserRegistrationItem } from '../types/event';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export interface MyRegistrationsPageProps {
  onBack: () => void;
  onBrowseEvents: () => void;
  onOpenEvent: (eventId: string) => void;
  onRequireLogin: () => void;
}

export const MyRegistrationsPage: React.FC<MyRegistrationsPageProps> = ({
  onBack,
  onBrowseEvents,
  onOpenEvent,
  onRequireLogin,
}) => {
  const { user, authLoading, getIdToken } = useAuth();
  const [registrations, setRegistrations] = useState<UserRegistrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [cancelTarget, setCancelTarget] = useState<UserRegistrationItem | null>(
    null
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const cancelDialogRef = useRef<HTMLDivElement | null>(null);
  const lastCancelTriggerRef = useRef<HTMLElement | null>(null);

  // Protect route: redirect unauthenticated visitors to /login
  useEffect(() => {
    if (!authLoading && !user) {
      onRequireLogin();
    }
  }, [authLoading, user, onRequireLogin]);

  useEffect(() => {
    if (!cancelTarget) {
      lastCancelTriggerRef.current?.focus();
      return;
    }

    lastCancelTriggerRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      cancelDialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cancelling) {
        setCancelTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelTarget, cancelling]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegistrations() {
      if (authLoading || !user) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          onRequireLogin();
          return;
        }

        const res = await fetch('/api/registrations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (res.status === 401) {
          onRequireLogin();
          return;
        }

        if (!res.ok) {
          throw new Error('تعذر تحميل تسجيلاتك حاليًا. يرجى المحاولة مرة أخرى.');
        }

        const data = (await res.json()) as {
          registrations?: UserRegistrationItem[];
        };
        setRegistrations(
          Array.isArray(data.registrations) ? data.registrations : []
        );
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل تسجيلاتك.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadRegistrations();
    return () => controller.abort();
  }, [authLoading, user, getIdToken, reloadTick, onRequireLogin]);

  const handleOpenCancelConfirm = (item: UserRegistrationItem) => {
    setCancelError(null);
    setCancelTarget(item);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setCancelTarget(null);
        onRequireLogin();
        return;
      }

      const res = await fetch(
        `/api/registrations/event/${encodeURIComponent(cancelTarget.eventId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 401) {
        setCancelTarget(null);
        onRequireLogin();
        return;
      }

      if (res.status === 404 || res.status === 409) {
        setRegistrations((prev) =>
          prev.filter((item) => item.eventId !== cancelTarget.eventId)
        );
        setCancelTarget(null);
        setStatusMessage(
          data.error ?? `تم إلغاء تسجيلك في «${cancelTarget.eventTitle}».`
        );
        return;
      }

      if (!res.ok) {
        setCancelError(
          data.error ?? 'تعذر إلغاء التسجيل حاليًا. يرجى المحاولة مرة أخرى.'
        );
        return;
      }

      const cancelledTitle = cancelTarget.eventTitle;
      setRegistrations((prev) =>
        prev.filter((item) => item.eventId !== cancelTarget.eventId)
      );
      setCancelTarget(null);
      setStatusMessage(`تم إلغاء تسجيلك في «${cancelledTitle}» بنجاح.`);
    } catch {
      setCancelError(
        'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مجددًا.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || !user) {
    return (
      <main id="main-content" tabIndex={-1} className="py-10 md:py-14 focus:outline-none">
        <div
          role="status"
          aria-label="جارٍ التحقق من الجلسة"
          className="afaq-container space-y-6"
        >
          <div className="h-10 w-24 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
          <div className="h-10 w-48 animate-pulse rounded-sm bg-slate-100" aria-hidden="true" />
          <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 w-full animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="py-8 md:py-12 focus:outline-none">
      <div className="afaq-container space-y-8">
        {/* Back Button + Page Header */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-small font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>رجوع</span>
          </button>

          <div className="space-y-2">
            <h1 className="text-h1 font-bold text-brand-900">تسجيلاتي</h1>
            <p className="max-w-2xl text-body text-slate-600">
              الفعاليات والورش والدورات التي سجّلت بها، مرتبة حسب الموعد الأقرب أولًا.
            </p>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 rounded-lg border border-green-600/30 bg-green-50 px-5 py-4 text-brand-900"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-success"
                strokeWidth={2}
                aria-hidden="true"
              />
              <p className="font-ui text-small font-semibold text-brand-900">
                {statusMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="إخفاء الرسالة"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-green-100 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Loading, Error, Empty, or Registrations List */}
        {isLoading ? (
          <div
            role="status"
            aria-label="جارٍ تحميل تسجيلاتك"
            className="space-y-4"
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="h-32 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-16 text-center"
          >
            <p className="text-body font-medium text-brand-900">{error}</p>
            <div className="mt-5">
              <Button
                variant="outline"
                size="md"
                icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                onClick={() => setReloadTick((prev) => prev + 1)}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-xs">
              <Calendar className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h2 className="text-h4 font-bold text-brand-900">
              لم تسجّل في أي فعالية بعد
            </h2>
            <p className="mt-2 max-w-md text-small text-slate-600">
              استكشف أحدث الورش والدورات التدريبية والفعاليات المتاحة في الفيوم وسجّل في الفعالية التي تناسب اهتماماتك.
            </p>
            <div className="mt-6">
              <Button
                href="/events"
                variant="primary"
                size="md"
                withArrow
                onClick={(e) => {
                  e.preventDefault();
                  onBrowseEvents();
                }}
              >
                تصفح الفعاليات
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-200 sm:flex-row sm:items-center"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-accent-500 px-3 py-0.5 font-ui text-caption font-semibold text-brand-900">
                      {item.categoryLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-ui text-caption font-semibold text-success">
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span>مسجّل</span>
                    </span>
                  </div>

                  <h2 className="text-h4 font-bold text-brand-900">
                    {item.eventTitle}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-slate-600">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Calendar
                        className="h-4 w-4 shrink-0 text-brand-500"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>
                        {item.dateArabic} · {item.timeArabic}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-4 w-4 shrink-0 text-brand-500"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>{item.eventLocation}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Users
                        className="h-4 w-4 shrink-0 text-brand-500"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>{item.eventOrganizer}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenCancelConfirm(item)}
                    className="inline-flex items-center justify-center rounded-full border border-error/30 bg-white px-4 py-2 font-ui text-small font-semibold text-error hover:border-error/50 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    إلغاء التسجيل
                  </button>
                  <a
                    href={`/events/${item.eventId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenEvent(item.eventId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-700 px-4 py-2 font-ui text-small font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors whitespace-nowrap"
                  >
                    <span>عرض التفاصيل</span>
                    <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Registration Confirmation Dialog */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 px-4 backdrop-blur-xs"
          onClick={() => {
            if (!cancelling) setCancelTarget(null);
          }}
        >
          <div
            ref={cancelDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-registration-title"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-md space-y-5 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2
                  id="cancel-registration-title"
                  className="text-h3 font-bold text-brand-900"
                >
                  إلغاء التسجيل
                </h2>
                <p className="text-small text-slate-600">
                  هل أنت متأكد من رغبتك في إلغاء تسجيلك في هذه الفعالية؟
                </p>
              </div>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
                aria-label="إغلاق نافذة إلغاء التسجيل"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-brand-50/50 p-4 space-y-2.5">
              <h3 className="font-sans text-h4 font-bold text-brand-900">
                {cancelTarget.eventTitle}
              </h3>
              <div className="flex items-center gap-2 text-small text-slate-700">
                <Calendar
                  className="h-4 w-4 shrink-0 text-brand-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {cancelTarget.dateArabic} · {cancelTarget.timeArabic}
                </span>
              </div>
              <div className="flex items-center gap-2 text-small text-slate-700">
                <MapPin
                  className="h-4 w-4 shrink-0 text-brand-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>{cancelTarget.eventLocation}</span>
              </div>
            </div>

            {cancelError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-small text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="font-ui leading-snug">{cancelError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="md"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
              >
                تراجع
              </Button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-error bg-error px-5 py-2.5 font-ui text-small font-semibold text-white shadow-xs transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              >
                {cancelling && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
                <span>{cancelling ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
