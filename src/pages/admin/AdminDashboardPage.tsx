import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  EyeOff,
  FileEdit,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { AdminSectionPath } from '../../components/admin/AdminLayout';
import type { AdminDashboardData } from '../../types/admin';

export interface AdminDashboardPageProps {
  onNavigateSection: (path: AdminSectionPath) => void;
}

interface StatCardConfig {
  id: string;
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  iconBoxClass: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onNavigateSection,
}) => {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const handleRefresh = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        }

        const res = await fetch('/api/admin/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const payload = (await res.json().catch(() => ({}))) as Partial<
          AdminDashboardData & { error?: string }
        >;

        if (!res.ok) {
          throw new Error(
            payload.error || 'تعذر تحميل بيانات لوحة التحكم حاليًا.'
          );
        }

        if (!payload.stats || !Array.isArray(payload.recentRegistrations)) {
          throw new Error('استجابة غير متوقعة من الخادم.');
        }

        setData({
          stats: payload.stats,
          recentRegistrations: payload.recentRegistrations,
        });
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل بيانات لوحة التحكم.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => controller.abort();
  }, [getIdToken, reloadTick]);

  const statCards: StatCardConfig[] = data
    ? [
        {
          id: 'published',
          label: 'فعاليات منشورة',
          value: data.stats.publishedEventsCount,
          helper: 'ظاهرة حاليًا للشباب',
          icon: <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-emerald-50 text-success border-emerald-200/80',
        },
        {
          id: 'draft',
          label: 'فعاليات مسودة',
          value: data.stats.draftEventsCount,
          helper: 'قيد الإعداد والمراجعة',
          icon: <FileEdit className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        },
        {
          id: 'hidden',
          label: 'فعاليات مخفية',
          value: data.stats.hiddenEventsCount,
          helper: 'غير معروضة للعامة',
          icon: <EyeOff className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-slate-100 text-slate-600 border-slate-200',
        },
        {
          id: 'upcoming',
          label: 'فعاليات قادمة',
          value: data.stats.upcomingEventsCount,
          helper: 'منشورة وتبدأ لاحقًا',
          icon: <CalendarClock className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-accent-50 text-accent-800 border-accent-200',
        },
        {
          id: 'registrations',
          label: 'إجمالي التسجيلات',
          value: data.stats.totalRegistrationsCount,
          helper: 'تسجيلات نشطة حالية',
          icon: <ClipboardList className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-brand-50 text-brand-700 border-brand-200',
        },
        {
          id: 'users',
          label: 'إجمالي المستخدمين',
          value: data.stats.totalUsersCount,
          helper: 'حسابات سجّلت دخول بجوجل',
          icon: <UserCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />,
          iconBoxClass: 'bg-sky-50 text-sky-700 border-sky-200',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold text-brand-900">لوحة التحكم</h1>
          <p className="text-body text-slate-600">
            نظرة عامة على حالة الفعاليات وأحدث تسجيلات المشاركين في منصة آفاق.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          icon={
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
        >
          تحديث البيانات
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="جارٍ تحميل إحصائيات لوحة التحكم"
          className="space-y-8"
        >
          <span className="sr-only">جارٍ تحميل بيانات لوحة التحكم...</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-24 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-9 w-9 animate-pulse rounded-md bg-slate-100" />
                </div>
                <div className="h-9 w-16 animate-pulse rounded-sm bg-slate-100" />
                <div className="h-3.5 w-28 animate-pulse rounded-sm bg-slate-100" />
              </div>
            ))}
          </div>

          <div
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="h-6 w-40 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-5 w-28 animate-pulse rounded-sm bg-slate-100" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-3 gap-4 px-6 py-4"
                >
                  <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-48 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-28 animate-pulse rounded-sm bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-lg border border-error/25 bg-red-50/70 p-6 text-center space-y-4"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
            <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-h4 font-bold text-brand-900">
              تعذر تحميل الإحصائيات
            </h2>
            <p className="text-body text-slate-700">{error}</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleRefresh}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Populated Content */}
      {!isLoading && !error && data && (
        <>
          {/* KPI Stat Cards */}
          <section aria-label="إحصائيات المنصة" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((card) => (
                <article
                  key={card.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-ui text-small font-semibold text-slate-700">
                      {card.label}
                    </h2>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${card.iconBoxClass}`}
                    >
                      {card.icon}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="font-ui text-h1 font-bold text-brand-900 tabular-nums leading-none">
                      {card.value}
                    </p>
                    <p className="text-caption text-slate-500">{card.helper}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Latest 5 Registrations Table */}
          <section
            aria-labelledby="recent-registrations-heading"
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div className="space-y-0.5">
                <h2
                  id="recent-registrations-heading"
                  className="text-h4 font-bold text-brand-900"
                >
                  آخر 5 تسجيلات
                </h2>
                <p className="text-small text-slate-600">
                  أحدث المشاركين المسجلين في فعاليات المنصة.
                </p>
              </div>

              <a
                href="/admin/registrations"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateSection('/admin/registrations');
                }}
                className="font-ui text-small font-semibold text-brand-700 hover:text-accent-700 hover:underline underline-offset-4 whitespace-nowrap shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                عرض كل التسجيلات
              </a>
            </div>

            {data.recentRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-brand-50/70 text-brand-500">
                  <ClipboardList
                    className="h-6 w-6"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-h4 font-bold text-brand-900">
                    لا توجد تسجيلات حتى الآن
                  </h3>
                  <p className="text-small text-slate-600 leading-[1.7]">
                    ستظهر هنا أحدث 5 تسجيلات للمشاركين فور قيام أي مستخدم بالتسجيل في فعالية منشورة.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateSection('/admin/events')}
                  >
                    استعراض الفعاليات
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-start">
                  <thead>
                    <tr className="border-b border-slate-200 bg-brand-50/40">
                      <th
                        scope="col"
                        className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                      >
                        اسم المستخدم
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                      >
                        الفعالية
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                      >
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentRegistrations.map((reg) => (
                      <tr
                        key={reg.id}
                        className="transition-colors hover:bg-brand-50/30"
                      >
                        <td className="px-6 py-4 align-middle">
                          <div className="font-medium text-brand-900">
                            {reg.userName}
                          </div>
                          <div
                            className="font-ui text-caption text-slate-500"
                            dir="ltr"
                          >
                            {reg.userEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle text-small font-medium text-slate-800">
                          {reg.eventTitle}
                        </td>
                        <td className="px-6 py-4 align-middle text-small text-slate-600 whitespace-nowrap tabular-nums">
                          <span>{reg.dateArabic}</span>
                          <span className="mx-1.5 text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span>{reg.timeArabic}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
