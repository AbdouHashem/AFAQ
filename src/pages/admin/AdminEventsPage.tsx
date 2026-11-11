import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { FilterChip } from '../../components/ui/FilterChip';
import { useAuth } from '../../context/AuthContext';
import type { AdminEventItem } from '../../types/admin';
import type { EventStatus } from '../../types/event';

export interface AdminEventsPageProps {
  onCreateEvent: () => void;
  onEditEvent: (eventId: string) => void;
  initialSuccessMessage?: string | null;
  onConsumeSuccessMessage?: () => void;
  onEventsMutated?: () => void;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'published', label: 'منشورة' },
  { value: 'draft', label: 'مسودة' },
  { value: 'hidden', label: 'مخفية' },
];

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

const EventThumbnail: React.FC<{
  src?: string;
  alt: string;
  sizeClass?: string;
}> = ({ src, alt, sizeClass = 'h-12 w-20' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-sm border border-slate-200 bg-brand-50 ${sizeClass}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50 text-brand-400">
          <GraduationCap className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export const AdminEventsPage: React.FC<AdminEventsPageProps> = ({
  onCreateEvent,
  onEditEvent,
  initialSuccessMessage,
  onConsumeSuccessMessage,
  onEventsMutated,
}) => {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminEventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const lastDeleteTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialSuccessMessage) {
      setFeedbackMessage(initialSuccessMessage);
      onConsumeSuccessMessage?.();
    }
  }, [initialSuccessMessage, onConsumeSuccessMessage]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAdminEvents() {
      setIsLoading(true);
      setError(null);

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

        setEvents(Array.isArray(payload.events) ? payload.events : []);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل الفعاليات.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchAdminEvents();
    return () => controller.abort();
  }, [getIdToken, reloadTick]);

  useEffect(() => {
    if (!deleteTarget) {
      lastDeleteTriggerRef.current?.focus();
      return;
    }

    lastDeleteTriggerRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      deleteDialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) {
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget, deleting]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const matchesStatus =
        statusFilter === 'all' || event.status === statusFilter;
      const matchesTitle =
        !q || event.title.toLowerCase().includes(q);
      return matchesStatus && matchesTitle;
    });
  }, [events, searchQuery, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleToggleVisibility = async (event: AdminEventItem) => {
    const nextStatus: EventStatus =
      event.status === 'published' ? 'hidden' : 'published';

    setTogglingId(event.id);
    setActionError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setActionError('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        return;
      }

      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(event.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        event?: AdminEventItem;
        error?: string;
      };

      if (!res.ok || !data.event) {
        setActionError(data.error || 'تعذر تغيير حالة الفعالية حاليًا.');
        return;
      }

      setEvents((prev) =>
        prev.map((item) => (item.id === data.event!.id ? data.event! : item))
      );
      setFeedbackMessage(
        nextStatus === 'published'
          ? `تم نشر فعالية «${data.event.title}» وأصبحت ظاهرة للمستخدمين.`
          : `تم إخفاء فعالية «${data.event.title}» عن العرض العام.`
      );
      onEventsMutated?.();
    } catch {
      setActionError('تعذر الاتصال بالخادم أثناء تحديث حالة الفعالية.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenDeleteConfirm = (event: AdminEventItem) => {
    setDeleteError(null);
    setActionError(null);
    setDeleteTarget(event);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setDeleteError('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        return;
      }

      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setDeleteError(data.error || 'تعذر حذف الفعالية حاليًا.');
        return;
      }

      const deletedTitle = deleteTarget.title;
      setEvents((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedbackMessage(
        `تم حذف فعالية «${deletedTitle}» وجميع التسجيلات المرتبطة بها.`
      );
      onEventsMutated?.();
    } catch {
      setDeleteError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold text-brand-900">الفعاليات</h1>
          <p className="text-body text-slate-600">
            إدارة الورش والدورات والفعاليات، ومتابعة حالتها وعدد المسجّلين فيها.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onCreateEvent}
          icon={<Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />}
        >
          فعالية جديدة
        </Button>
      </div>

      {/* Feedback & Error Banners */}
      {feedbackMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 rounded-lg border border-green-600/30 bg-green-50 px-5 py-3.5 text-brand-900"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-success"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="font-ui text-small font-semibold text-brand-900">
              {feedbackMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            aria-label="إخفاء رسالة النجاح"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-green-100 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-error/30 bg-red-50 px-5 py-3.5 text-error"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="font-ui text-small font-semibold">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="إخفاء رسالة الخطأ"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-error hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-8">
            <SearchInput
              aria-label="بحث بعنوان الفعالية"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="ابحث بعنوان الفعالية..."
              disabled={isLoading}
            />
          </div>

          <div className="md:col-span-4">
            <Select
              aria-label="فلترة حسب الحالة"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | EventStatus)
              }
              options={STATUS_FILTER_OPTIONS}
              disabled={isLoading}
            />
          </div>
        </div>

        {!isLoading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="font-ui text-small text-slate-600 tabular-nums">
              عرض <span className="font-semibold text-brand-900">{filteredEvents.length}</span>{' '}
              من أصل <span className="font-semibold text-brand-900">{events.length}</span>{' '}
              فعالية
            </p>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {searchQuery.trim() && (
                  <FilterChip
                    label={`البحث: ${searchQuery.trim()}`}
                    onRemove={() => setSearchQuery('')}
                  />
                )}
                {statusFilter !== 'all' && (
                  <FilterChip
                    label={`الحالة: ${STATUS_BADGE_MAP[statusFilter].label}`}
                    onRemove={() => setStatusFilter('all')}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="جارٍ تحميل الفعاليات"
          className="space-y-4"
        >
          <span className="sr-only">جارٍ تحميل قائمة الفعاليات...</span>

          {/* Desktop Skeleton Table */}
          <div
            className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            aria-hidden="true"
          >
            <div className="grid grid-cols-7 gap-4 border-b border-slate-200 bg-brand-50/40 px-5 py-3.5">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-4 w-20 animate-pulse rounded-sm bg-slate-200/70"
                />
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-7 items-center gap-4 px-5 py-4"
                >
                  <div className="h-12 w-20 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-36 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-10 animate-pulse rounded-sm bg-slate-100" />
                  <div className="flex gap-2">
                    <div className="h-9 w-16 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-9 w-16 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Skeleton Cards */}
          <div className="space-y-3 md:hidden" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-22 shrink-0 animate-pulse rounded-sm bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 animate-pulse rounded-sm bg-slate-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-slate-100" />
                  </div>
                </div>
                <div className="h-9 w-full animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-error/25 bg-red-50/60 px-6 py-14 text-center space-y-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
            <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-h4 font-bold text-brand-900">
              تعذر تحميل الفعاليات
            </h2>
            <p className="text-body text-slate-700">{error}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            onClick={() => setReloadTick((prev) => prev + 1)}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty States */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-brand-50/70 text-brand-700">
            <Calendar className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-h4 font-bold text-brand-900">
              {events.length === 0
                ? 'لا توجد فعاليات مضافة حتى الآن'
                : 'لا توجد فعاليات مطابقة لبحثك'}
            </h2>
            <p className="text-small text-slate-600 leading-[1.7]">
              {events.length === 0
                ? 'ابدأ بإضافة أول ورشة أو دورة أو فعالية لتظهر في قائمة الإدارة وتتمكن من نشرها للشباب.'
                : 'جرّب البحث بعنوان مختلف أو غيّر فلتر الحالة لعرض باقي الفعاليات.'}
            </p>
          </div>
          {events.length === 0 ? (
            <Button
              variant="primary"
              size="md"
              onClick={onCreateEvent}
              icon={<Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            >
              فعالية جديدة
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              مسح الفلاتر
            </Button>
          )}
        </div>
      )}

      {/* Populated Views */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-start">
                <thead>
                  <tr className="border-b border-slate-200 bg-brand-50/40">
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      الصورة
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      العنوان
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      التصنيف
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      التاريخ
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      الحالة
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      المسجّلون
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((event) => {
                    const statusMeta = STATUS_BADGE_MAP[event.status];
                    const isPublished = event.status === 'published';
                    const isRowBusy = togglingId === event.id;

                    return (
                      <tr
                        key={event.id}
                        className="transition-colors hover:bg-brand-50/30"
                      >
                        <td className="px-4 py-3.5 align-middle">
                          <EventThumbnail
                            src={event.coverImageUrl}
                            alt={event.title}
                          />
                        </td>

                        <td className="px-4 py-3.5 align-middle max-w-xs">
                          <div className="font-semibold text-brand-900 line-clamp-2">
                            {event.title}
                          </div>
                          <div className="mt-0.5 text-caption text-slate-500 truncate">
                            {event.organizer}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-middle text-small text-slate-700 whitespace-nowrap">
                          {event.categoryLabel}
                        </td>

                        <td className="px-4 py-3.5 align-middle text-small text-slate-700 whitespace-nowrap tabular-nums">
                          <div>{event.dateArabic}</div>
                          <div className="text-caption text-slate-500">
                            {event.timeArabic}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 font-ui text-caption font-semibold whitespace-nowrap ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-middle font-ui text-small font-semibold text-brand-900 tabular-nums whitespace-nowrap">
                          {event.registrationsCount}
                        </td>

                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEditEvent(event.id)}
                              disabled={isRowBusy}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-ui text-caption font-semibold text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(event)}
                              disabled={isRowBusy}
                              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-caption font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer ${
                                isPublished
                                  ? 'border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70'
                                  : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
                              }`}
                            >
                              {isRowBusy ? (
                                <Loader2
                                  className="h-3.5 w-3.5 shrink-0 animate-spin"
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              ) : isPublished ? (
                                <EyeOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                              )}
                              <span>{isPublished ? 'إخفاء' : 'نشر'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteConfirm(event)}
                              disabled={isRowBusy}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-error/30 bg-white px-3 py-1.5 font-ui text-caption font-semibold text-error hover:border-error/50 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredEvents.map((event) => {
              const statusMeta = STATUS_BADGE_MAP[event.status];
              const isPublished = event.status === 'published';
              const isRowBusy = togglingId === event.id;

              return (
                <article
                  key={event.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <EventThumbnail
                      src={event.coverImageUrl}
                      alt={event.title}
                      sizeClass="h-16 w-24"
                    />

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-body font-bold text-brand-900 leading-snug line-clamp-2">
                          {event.title}
                        </h2>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-ui text-caption font-semibold whitespace-nowrap ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <p className="text-caption text-slate-500 truncate">
                        {event.organizer}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-small text-slate-600">
                    <span>{event.categoryLabel}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} aria-hidden="true" />
                      <span>{event.dateArabic}</span>
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-ui font-semibold text-brand-900 tabular-nums">
                      <Users className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} aria-hidden="true" />
                      <span>{event.registrationsCount} مسجّل</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onEditEvent(event.id)}
                      disabled={isRowBusy}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 font-ui text-small font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(event)}
                      disabled={isRowBusy}
                      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-2 font-ui text-small font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer ${
                        isPublished
                          ? 'border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70'
                          : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
                      }`}
                    >
                      {isRowBusy ? (
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      ) : isPublished ? (
                        <EyeOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      )}
                      <span>{isPublished ? 'إخفاء' : 'نشر'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDeleteConfirm(event)}
                      disabled={isRowBusy}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-error/30 bg-white px-3 py-2 font-ui text-small font-semibold text-error hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>حذف</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 px-4 backdrop-blur-xs"
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div
            ref={deleteDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-dialog-title"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-md space-y-5 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2
                  id="delete-event-dialog-title"
                  className="text-h3 font-bold text-brand-900"
                >
                  حذف الفعالية نهائيًا
                </h2>
                <p className="text-small text-slate-600">
                  هل أنت متأكد من رغبتك في حذف هذه الفعالية؟
                </p>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="إغلاق نافذة تأكيد الحذف"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-brand-50/40 p-4 space-y-1.5">
              <h3 className="text-h4 font-bold text-brand-900">
                {deleteTarget.title}
              </h3>
              <p className="text-small text-slate-600 tabular-nums">
                {deleteTarget.dateArabic} · {deleteTarget.registrationsCount} مسجّل نشط
              </p>
            </div>

            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-small text-error"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
              <p className="font-ui font-medium leading-relaxed">
                تنبيه مهم: عند تأكيد الحذف، سيتم حذف الفعالية نهائيًا، كما أن كل التسجيلات المرتبطة بالفعالية ستُحذف أيضًا ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-small text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="font-ui leading-snug">{deleteError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="md"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                تراجع
              </Button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-error bg-error px-5 py-2.5 font-ui text-small font-semibold text-white shadow-xs transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              >
                {deleting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
                <span>{deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
