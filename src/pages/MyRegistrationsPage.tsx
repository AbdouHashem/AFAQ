import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  MapPin,
  RotateCcw,
  Users,
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

  // Protect route: redirect unauthenticated visitors to /login
  useEffect(() => {
    if (!authLoading && !user) {
      onRequireLogin();
    }
  }, [authLoading, user, onRequireLogin]);

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

                <div className="shrink-0">
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
    </main>
  );
};
