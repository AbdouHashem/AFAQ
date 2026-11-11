import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Mail,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import type {
  AdminEventItem,
  AdminEventRegistrationItem,
} from '../../types/admin';
import type { EventStatus } from '../../types/event';

const STATUS_BADGE_MAP: Record<
  EventStatus,
  { label: string; badgeClass: string }
> = {
  published: {
    label: 'منشورة',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  draft: {
    label: 'مسودة',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  hidden: {
    label: 'مخفية',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-700',
  },
};

export const AdminRegistrationsPage: React.FC = () => {
  const { getIdToken } = useAuth();

  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsReloadTick, setEventsReloadTick] = useState(0);

  const [selectedEventId, setSelectedEventId] = useState('');

  const [registrations, setRegistrations] = useState<
    AdminEventRegistrationItem[]
  >([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regsError, setRegsError] = useState<string | null>(null);
  const [regsReloadTick, setRegsReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAdminEvents() {
      setEventsLoading(true);
      setEventsError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        }

        const res = await fetch('/api/admin/events', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const payload = (await res.json().catch(() => ({}))) as {
          events?: AdminEventItem[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(
            payload.error || 'تعذر تحميل قائمة الفعاليات حاليًا.'
          );
        }

        const loadedEvents = Array.isArray(payload.events)
          ? payload.events
          : [];
        setEvents(loadedEvents);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setEventsError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل قائمة الفعاليات.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    }

    fetchAdminEvents();
    return () => controller.abort();
  }, [getIdToken, eventsReloadTick]);

  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      setRegsError(null);
      setRegsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchEventRegistrations() {
      setRegsLoading(true);
      setRegsError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        }

        const res = await fetch(
          `/api/admin/registrations?eventId=${encodeURIComponent(
            selectedEventId
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const payload = (await res.json().catch(() => ({}))) as {
          registrations?: AdminEventRegistrationItem[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(
            payload.error || 'تعذر تحميل قائمة المسجّلين حاليًا.'
          );
        }

        setRegistrations(
          Array.isArray(payload.registrations) ? payload.registrations : []
        );
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setRegsError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل المسجّلين.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setRegsLoading(false);
        }
      }
    }

    fetchEventRegistrations();
    return () => controller.abort();
  }, [selectedEventId, getIdToken, regsReloadTick]);

  const selectedEvent = useMemo(
    () => events.find((ev) => ev.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const eventOptions = useMemo(
    () =>
      events.map((ev) => ({
        value: ev.id,
        label: `${ev.title} — ${STATUS_BADGE_MAP[ev.status].label} (${ev.registrationsCount})`,
      })),
    [events]
  );

  const handleRefresh = useCallback(() => {
    setEventsReloadTick((prev) => prev + 1);
    if (selectedEventId) {
      setRegsReloadTick((prev) => prev + 1);
    }
  }, [selectedEventId]);

  const isAnyLoading = eventsLoading || regsLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold text-brand-900">التسجيلات</h1>
          <p className="text-body text-slate-600">
            استعرض قائمة المسجّلين في كل فعالية وإجمالي عدد المشاركين (للعرض فقط).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isAnyLoading}
          icon={
            <RefreshCw
              className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
        >
          تحديث البيانات
        </Button>
      </div>

      {/* Events Loading State */}
      {eventsLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="جارٍ تحميل قائمة الفعاليات"
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-xs"
        >
          <span className="sr-only">جارٍ تحميل قائمة الفعاليات...</span>
          <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" aria-hidden="true" />
          <div className="h-12 w-full max-w-xl animate-pulse rounded-md bg-slate-100" aria-hidden="true" />
        </div>
      )}

      {/* Events Load Error State */}
      {!eventsLoading && eventsError && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-error/25 bg-red-50/60 px-6 py-12 text-center space-y-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
            <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-h4 font-bold text-brand-900">
              تعذر تحميل قائمة الفعاليات
            </h2>
            <p className="text-body text-slate-700">{eventsError}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setEventsReloadTick((prev) => prev + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty System State (No Events at all) */}
      {!eventsLoading && !eventsError && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-xs space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-brand-50 text-brand-600">
            <Calendar className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-h3 font-bold text-brand-900">
              لا توجد فعاليات حتى الآن
            </h2>
            <p className="text-body text-slate-600">
              أضف فعالية أولاً لتتمكن من اختيارها ومتابعة المسجّلين بها من هنا.
            </p>
          </div>
        </div>
      )}

      {/* Event Selector + Registrations Section */}
      {!eventsLoading && !eventsError && events.length > 0 && (
        <>
          <section
            aria-label="اختيار الفعالية"
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="max-w-xl">
              <Select
                id="admin-registrations-event-select"
                label="اختر الفعالية"
                placeholder="— اختر فعالية لعرض المسجّلين —"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={eventOptions}
              />
            </div>
          </section>

          {/* Prompt to Select an Event */}
          {!selectedEventId && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-brand-50/30 px-6 py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-xs">
                <Users className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-h4 font-bold text-brand-900">
                  اختر فعالية من القائمة أعلاه
                </h2>
                <p className="text-body text-slate-600 leading-[1.7]">
                  عند اختيار أي فعالية ستظهر بيانات جميع المشاركين المسجّلين بها وإجمالي عددهم.
                </p>
              </div>
            </div>
          )}

          {/* Selected Event Details + Registrants */}
          {selectedEventId && (
            <section
              aria-labelledby="selected-event-registrations-heading"
              className="space-y-5"
            >
              {/* Summary Bar with Event Metadata & Total Count */}
              {selectedEvent && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2
                        id="selected-event-registrations-heading"
                        className="text-h3 font-bold text-brand-900"
                      >
                        {selectedEvent.title}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-ui text-caption font-semibold ${
                          STATUS_BADGE_MAP[selectedEvent.status].badgeClass
                        }`}
                      >
                        {STATUS_BADGE_MAP[selectedEvent.status].label}
                      </span>
                    </div>
                    <p className="font-ui text-small text-slate-600">
                      <span>{selectedEvent.categoryLabel}</span>
                      <span className="mx-2 text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span>{selectedEvent.dateArabic}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-brand-200 bg-brand-50/60 px-4 py-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-brand-700 border border-brand-200">
                      <UserCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-ui text-caption font-medium text-slate-600">
                        إجمالي المسجّلين
                      </p>
                      <p className="font-ui text-h3 font-bold text-brand-900 tabular-nums leading-tight">
                        {regsLoading ? '...' : registrations.length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Registrants */}
              {regsLoading && (
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="جارٍ تحميل قائمة المسجّلين"
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
                >
                  <span className="sr-only">جارٍ تحميل قائمة المسجّلين...</span>
                  <div className="divide-y divide-slate-100">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-3 md:gap-4"
                        aria-hidden="true"
                      >
                        <div className="h-4 w-36 animate-pulse rounded-sm bg-slate-100" />
                        <div className="h-4 w-52 animate-pulse rounded-sm bg-slate-100" />
                        <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registrants Fetch Error */}
              {!regsLoading && regsError && (
                <div
                  role="alert"
                  className="flex flex-col items-center justify-center rounded-lg border border-error/25 bg-red-50/60 px-6 py-12 text-center space-y-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
                    <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-h4 font-bold text-brand-900">
                      تعذر تحميل المسجّلين
                    </h3>
                    <p className="text-body text-slate-700">{regsError}</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setRegsReloadTick((prev) => prev + 1)}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}

              {/* Empty State: No Registrations for Selected Event */}
              {!regsLoading && !regsError && registrations.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-14 text-center shadow-xs space-y-3">
                  <div className="flex h-13 w-13 items-center justify-center rounded-full border border-slate-200 bg-brand-50/70 text-brand-500">
                    <ClipboardList
                      className="h-6 w-6"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-h4 font-bold text-brand-900">
                      لا توجد تسجيلات لهذه الفعالية حتى الآن
                    </h3>
                    <p className="text-body text-slate-600 leading-[1.7]">
                      لم يقم أي مشارك بالتسجيل في هذه الفعالية بعد. ستظهر بيانات المسجّلين هنا بمجرد تسجيلهم.
                    </p>
                  </div>
                </div>
              )}

              {/* Desktop Table + Mobile Cards */}
              {!regsLoading && !regsError && registrations.length > 0 && (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-start">
                        <thead>
                          <tr className="border-b border-slate-200 bg-brand-50/40">
                            <th
                              scope="col"
                              className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                            >
                              الاسم
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                            >
                              البريد الإلكتروني
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                            >
                              تاريخ التسجيل
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {registrations.map((reg) => (
                            <tr
                              key={reg.id}
                              className="transition-colors hover:bg-brand-50/30"
                            >
                              <td className="px-6 py-4 align-middle font-medium text-brand-900">
                                {reg.userName}
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <span
                                  dir="ltr"
                                  className="inline-block font-ui text-small text-slate-700"
                                >
                                  {reg.userEmail}
                                </span>
                              </td>
                              <td className="px-6 py-4 align-middle text-small text-slate-600 whitespace-nowrap tabular-nums">
                                <span>{reg.dateArabic}</span>
                                <span
                                  className="mx-1.5 text-slate-400"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                                <span>{reg.timeArabic}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="space-y-3 md:hidden">
                    {registrations.map((reg) => (
                      <article
                        key={reg.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2.5"
                      >
                        <h3 className="font-bold text-brand-900">
                          {reg.userName}
                        </h3>
                        <div className="flex items-center gap-2 text-small text-slate-700">
                          <Mail
                            className="h-4 w-4 shrink-0 text-slate-400"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          <span dir="ltr" className="truncate font-ui">
                            {reg.userEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-caption text-slate-600 tabular-nums">
                          <Calendar
                            className="h-4 w-4 shrink-0 text-slate-400"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          <span>
                            {reg.dateArabic} · {reg.timeArabic}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
