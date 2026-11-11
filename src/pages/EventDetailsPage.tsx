import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import type { AfaqEvent } from '../types/event';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export interface EventDetailsPageProps {
  eventId: string;
  onBackToEvents: () => void;
  onRequireLogin: (event: AfaqEvent) => void;
  onNavigateMyRegistrations: () => void;
  onEventResolved?: (event: AfaqEvent | null) => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  eventId,
  onBackToEvents,
  onRequireLogin,
  onNavigateMyRegistrations,
  onEventResolved,
}) => {
  const { user, authLoading, getIdToken } = useAuth();

  const [event, setEvent] = useState<AfaqEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvent() {
      setIsLoading(true);
      setNotFound(false);
      setError(null);
      setImageError(false);

      try {
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
          signal: controller.signal,
        });

        if (res.status === 404) {
          setEvent(null);
          setNotFound(true);
          onEventResolved?.(null);
          return;
        }

        if (!res.ok) {
          throw new Error('تعذر تحميل تفاصيل الفعالية حاليًا.');
        }

        const data = (await res.json()) as { event?: AfaqEvent };
        if (!data.event) {
          setEvent(null);
          setNotFound(true);
          onEventResolved?.(null);
          return;
        }

        setEvent(data.event);
        onEventResolved?.(data.event);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل تفاصيل الفعالية.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadEvent();
    return () => controller.abort();
  }, [eventId, reloadTick, onEventResolved]);

  // Check if current logged-in user is already registered for this event
  useEffect(() => {
    let active = true;

    async function checkRegistrationStatus() {
      if (!user || !event || event.status !== 'published') {
        setIsRegistered(false);
        setCheckingRegistration(false);
        return;
      }

      setCheckingRegistration(true);
      try {
        const token = await getIdToken();
        if (!token || !active) return;

        const res = await fetch(
          `/api/registrations/event/${encodeURIComponent(event.id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as { registered?: boolean };
          setIsRegistered(Boolean(data.registered));
        }
      } catch (err) {
        console.error('Failed to check registration status:', err);
      } finally {
        if (active) {
          setCheckingRegistration(false);
        }
      }
    }

    checkRegistrationStatus();
    return () => {
      active = false;
    };
  }, [user, event, getIdToken]);

  useEffect(() => {
    if (!confirmOpen) {
      lastTriggerRef.current?.focus();
      return;
    }

    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmOpen, submitting]);

  const handlePrimaryRegisterClick = () => {
    if (!event) return;

    if (!user) {
      onRequireLogin(event);
      return;
    }

    if (isRegistered) {
      return;
    }

    setSubmitError(null);
    setConfirmOpen(true);
  };

  const handleConfirmRegistration = async () => {
    if (!event) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setConfirmOpen(false);
        onRequireLogin(event);
        return;
      }

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId: event.id }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 409) {
        setIsRegistered(true);
        setSubmitError(data.error ?? 'أنت مسجّل بالفعل في هذه الفعالية.');
        return;
      }

      if (res.status === 401) {
        setConfirmOpen(false);
        onRequireLogin(event);
        return;
      }

      if (!res.ok) {
        setSubmitError(
          data.error ?? 'تعذر إتمام التسجيل حاليًا. يرجى المحاولة مرة أخرى.'
        );
        return;
      }

      setIsRegistered(true);
      setConfirmOpen(false);
      setSuccessMessage('تم تسجيلك في الفعالية بنجاح! يمكنك متابعة جميع فعالياتك من صفحة تسجيلاتي.');
    } catch {
      setSubmitError('تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مجددًا.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main id="main-content" tabIndex={-1} className="py-8 md:py-12 focus:outline-none">
        <div
          role="status"
          aria-label="جارٍ تحميل تفاصيل الفعالية"
          className="afaq-container space-y-8"
        >
          <div className="h-10 w-24 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
          <div className="aspect-video w-full animate-pulse rounded-2xl bg-slate-100 lg:max-h-96" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" aria-hidden="true">
            <div className="space-y-4 lg:col-span-8">
              <div className="h-8 w-2/3 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-24 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="hidden lg:block lg:col-span-4">
              <div className="h-56 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main id="main-content" tabIndex={-1} className="py-14 md:py-20 focus:outline-none">
        <div className="afaq-container">
          <div
            role="alert"
            className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-16 text-center"
          >
            <p className="text-body font-medium text-brand-900">{error}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                onClick={() => setReloadTick((prev) => prev + 1)}
              >
                إعادة المحاولة
              </Button>
              <Button variant="primary" size="md" onClick={onBackToEvents}>
                الرجوع إلى الفعاليات
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !event || event.status !== 'published') {
    return (
      <main id="main-content" tabIndex={-1} className="py-14 md:py-20 focus:outline-none">
        <div className="afaq-container">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-xs">
              <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h1 className="text-h2 font-bold text-brand-900">الفعالية غير موجودة</h1>
            <p className="mt-3 text-body text-slate-600">
              عذرًا، لم نتمكن من العثور على الفعالية المطلوبة أو ربما لم تعد متاحة للعرض حاليًا.
            </p>
            <div className="mt-8">
              <Button variant="primary" size="md" onClick={onBackToEvents}>
                الرجوع إلى الفعاليات
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const paragraphs = event.description
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const isButtonDisabled = authLoading || checkingRegistration || isRegistered;
  const buttonText = checkingRegistration
    ? 'جارٍ التحقق...'
    : isRegistered
      ? 'أنت مسجّل بالفعل'
      : 'سجّل الآن';

  return (
    <main id="main-content" tabIndex={-1} className="pt-8 pb-28 md:pt-12 lg:pb-12 focus:outline-none">
      <div className="afaq-container space-y-8">
        {/* Back Button preserving applied search & filters */}
        <div>
          <button
            type="button"
            onClick={onBackToEvents}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-small font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>رجوع</span>
          </button>
        </div>

        {/* Success Message Banner after Registration */}
        {successMessage && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-lg border border-green-600/30 bg-green-50 px-5 py-4 text-brand-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-success"
                strokeWidth={2}
                aria-hidden="true"
              />
              <p className="font-ui text-small font-semibold text-brand-900">
                {successMessage}
              </p>
            </div>
            <a
              href="/my-registrations"
              onClick={(e) => {
                e.preventDefault();
                onNavigateMyRegistrations();
              }}
              className="inline-flex items-center gap-1.5 rounded-sm font-ui text-small font-bold text-brand-700 hover:text-accent-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <span>عرض تسجيلاتي</span>
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        )}

        {/* Large Cover Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-brand-50 shadow-sm lg:max-h-96">
          {event.coverImageUrl && !imageError ? (
            <img
              src={event.coverImageUrl}
              alt={event.title}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-50 via-white to-accent-50 px-6 text-center">
              <GraduationCap
                className="h-12 w-12 text-brand-400"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="font-ui text-body font-semibold text-brand-700">
                {event.title}
              </span>
            </div>
          )}
        </div>

        {/* Main Content + Sticky Registration Sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Event Header & Full Description */}
          <article className="space-y-8 lg:col-span-8">
            <header className="space-y-4 border-b border-slate-200 pb-6">
              <div>
                <span className="inline-flex items-center rounded-full bg-accent-500 px-3.5 py-1 font-ui text-small font-semibold text-brand-900">
                  {event.categoryLabel}
                </span>
              </div>

              <h1 className="text-h1 font-bold text-brand-900 leading-tight [text-wrap:balance]">
                {event.title}
              </h1>

              {/* Key Metadata Grid */}
              <dl className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-brand-50/40 p-3.5">
                  <Calendar
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-ui text-caption text-slate-600">التاريخ</dt>
                    <dd className="font-ui text-small font-semibold text-brand-900 tabular-nums">
                      {event.dateArabic}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-brand-50/40 p-3.5">
                  <Clock
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-ui text-caption text-slate-600">الوقت</dt>
                    <dd className="font-ui text-small font-semibold text-brand-900 tabular-nums">
                      {event.timeArabic}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-brand-50/40 p-3.5">
                  <MapPin
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-ui text-caption text-slate-600">المكان</dt>
                    <dd className="font-ui text-small font-semibold text-brand-900">
                      {event.location}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-brand-50/40 p-3.5">
                  <Users
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-ui text-caption text-slate-600">الجهة المنظمة</dt>
                    <dd className="font-ui text-small font-semibold text-brand-900">
                      {event.organizer}
                    </dd>
                  </div>
                </div>
              </dl>
            </header>

            {/* Full Description */}
            <section aria-labelledby="event-description-heading" className="space-y-4">
              <h2
                id="event-description-heading"
                className="text-h3 font-bold text-brand-900"
              >
                عن الفعالية
              </h2>
              <div className="space-y-4 text-body text-slate-700 leading-[1.7]">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          </article>

          {/* Sticky Registration Card (Desktop & Tablet) */}
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="space-y-1.5">
                <h2 className="text-h4 font-bold text-brand-900">التسجيل في الفعالية</h2>
                <p className="text-small text-slate-600">
                  {isRegistered
                    ? 'تم حجز مقعدك في هذه الفعالية بنجاح.'
                    : 'احجز مكانك الآن لتصلك تفاصيل الحضور وتتابع تسجيلاتك من حسابك.'}
                </p>
              </div>

              <div className="space-y-2.5 border-t border-b border-slate-100 py-4 text-small text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>التصنيف</span>
                  <span className="font-ui font-semibold text-brand-900">
                    {event.categoryLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>الموعد</span>
                  <span className="font-ui font-semibold text-brand-900 tabular-nums">
                    {event.dateArabic} · {event.timeArabic}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>المنظم</span>
                  <span className="font-ui font-semibold text-brand-900 text-end">
                    {event.organizer}
                  </span>
                </div>
              </div>

              <Button
                variant={isRegistered ? 'outline' : 'secondary'}
                size="lg"
                withArrow={!isRegistered && !checkingRegistration}
                disabled={isButtonDisabled}
                className="w-full"
                onClick={handlePrimaryRegisterClick}
              >
                {buttonText}
              </Button>

              {isRegistered && (
                <div className="text-center">
                  <a
                    href="/my-registrations"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateMyRegistrations();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-sm font-ui text-small font-semibold text-accent-800 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    <span>عرض تسجيلاتي</span>
                    <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Fixed Bottom CTA Bar (Mobile & Tablet) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-md">
        <div className="afaq-container flex items-center justify-between gap-4 px-0">
          <div className="min-w-0">
            <p className="truncate font-ui text-small font-bold text-brand-900">
              {event.title}
            </p>
            <p className="truncate font-ui text-caption text-slate-600 tabular-nums">
              {event.dateArabic} · {event.timeArabic}
            </p>
          </div>
          <Button
            variant={isRegistered ? 'outline' : 'secondary'}
            size="md"
            withArrow={!isRegistered && !checkingRegistration}
            disabled={isButtonDisabled}
            onClick={handlePrimaryRegisterClick}
          >
            {buttonText}
          </Button>
        </div>
      </div>

      {/* Registration Confirmation Dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 px-4 backdrop-blur-xs"
          onClick={() => {
            if (!submitting) setConfirmOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-registration-title"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-md space-y-5 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2
                  id="confirm-registration-title"
                  className="text-h3 font-bold text-brand-900"
                >
                  تأكيد التسجيل
                </h2>
                <p className="text-small text-slate-600">
                  راجع تفاصيل الفعالية قبل تأكيد تسجيلك:
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                aria-label="إغلاق نافذة التأكيد"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-brand-50/50 p-4 space-y-2.5">
              <h3 className="font-sans text-h4 font-bold text-brand-900">
                {event.title}
              </h3>
              <div className="flex items-center gap-2 text-small text-slate-700">
                <Calendar
                  className="h-4 w-4 shrink-0 text-brand-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {event.dateArabic} · {event.timeArabic}
                </span>
              </div>
              <div className="flex items-center gap-2 text-small text-slate-700">
                <MapPin
                  className="h-4 w-4 shrink-0 text-brand-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>{event.location}</span>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-small text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="font-ui leading-snug">{submitError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="md"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
              >
                إغلاق
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={submitting || isRegistered}
                onClick={handleConfirmRegistration}
                icon={
                  submitting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : undefined
                }
              >
                {submitting ? 'جارٍ التأكيد...' : 'تأكيد التسجيل'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
