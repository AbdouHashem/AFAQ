import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Mail,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { useAuth } from '../../context/AuthContext';
import type { AdminUserItem } from '../../types/admin';

export const AdminUsersPage: React.FC = () => {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAdminUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        }

        const res = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const payload = (await res.json().catch(() => ({}))) as {
          users?: AdminUserItem[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(
            payload.error || 'تعذر تحميل قائمة المستخدمين حاليًا.'
          );
        }

        setUsers(Array.isArray(payload.users) ? payload.users : []);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل قائمة المستخدمين.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchAdminUsers();
    return () => controller.abort();
  }, [getIdToken, reloadTick]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleRefresh = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header + Total Count */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold text-brand-900">المستخدمون</h1>
          <p className="text-body text-slate-600">
            قائمة الحسابات المسجّلة عبر جوجل وعدد الفعاليات لكل مستخدم (للعرض فقط).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-md border border-brand-200 bg-white px-4 py-2 shadow-xs">
            <Users
              className="h-4 w-4 shrink-0 text-brand-700"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="font-ui text-small text-slate-600">
              إجمالي المستخدمين:
            </span>
            <span className="font-ui text-body font-bold text-brand-900 tabular-nums">
              {isLoading ? '...' : users.length}
            </span>
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
      </div>

      {/* Search Bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <SearchInput
              aria-label="ابحث بالاسم أو البريد الإلكتروني"
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              disabled={isLoading && users.length === 0}
            />
          </div>

          {!isLoading && !error && users.length > 0 && (
            <p className="font-ui text-small text-slate-600 tabular-nums">
              {hasSearch
                ? `النتائج المطابقة: ${filteredUsers.length} من ${users.length}`
                : 'الترتيب: الأحدث دخولًا أولًا'}
            </p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="جارٍ تحميل قائمة المستخدمين"
          className="space-y-4"
        >
          <span className="sr-only">جارٍ تحميل قائمة المستخدمين...</span>

          {/* Desktop Table Skeleton */}
          <div
            className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            aria-hidden="true"
          >
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-4 px-6 py-4"
                >
                  <div className="h-4 w-36 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-48 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded-sm bg-slate-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Card Skeleton */}
          <div className="space-y-3 md:hidden" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="h-5 w-40 animate-pulse rounded-sm bg-slate-100" />
                <div className="h-4 w-56 animate-pulse rounded-sm bg-slate-100" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-error/25 bg-red-50/60 px-6 py-12 text-center space-y-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
            <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-h4 font-bold text-brand-900">
              تعذر تحميل المستخدمين
            </h2>
            <p className="text-body text-slate-700">{error}</p>
          </div>
          <Button variant="primary" size="sm" onClick={handleRefresh}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty State: No Users Yet */}
      {!isLoading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-xs space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-brand-50 text-brand-600">
            <Users className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-h3 font-bold text-brand-900">
              لا يوجد مستخدمون مسجّلون حتى الآن
            </h2>
            <p className="text-body text-slate-600 leading-[1.7]">
              سيظهر هنا كل مستخدم يقوم بتسجيل الدخول بحساب جوجل على المنصة تلقائيًا.
            </p>
          </div>
        </div>
      )}

      {/* Empty Search Results State */}
      {!isLoading && !error && users.length > 0 && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-14 text-center shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-brand-50/70 text-brand-500">
            <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-h4 font-bold text-brand-900">
              لا توجد حسابات مطابقة للبحث
            </h2>
            <p className="text-body text-slate-600">
              جرّب البحث باسم آخر أو بريد إلكتروني مختلف.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            onClick={() => setSearchQuery('')}
          >
            مسح البحث
          </Button>
        </div>
      )}

      {/* Desktop Table + Mobile Cards */}
      {!isLoading && !error && filteredUsers.length > 0 && (
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
                      تاريخ أول دخول
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3.5 text-start font-ui text-small font-semibold text-brand-900 whitespace-nowrap"
                    >
                      عدد الفعاليات المسجّل بها
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((account) => (
                    <tr
                      key={account.id}
                      className="transition-colors hover:bg-brand-50/30"
                    >
                      <td className="px-6 py-4 align-middle font-medium text-brand-900">
                        {account.name}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span
                          dir="ltr"
                          className="inline-block font-ui text-small text-slate-700"
                        >
                          {account.email}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-small text-slate-600 whitespace-nowrap tabular-nums">
                        <span>{account.dateArabic}</span>
                        <span
                          className="mx-1.5 text-slate-400"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span>{account.timeArabic}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-full border border-slate-200 bg-brand-50/60 px-2.5 py-0.5 font-ui text-small font-semibold text-brand-900 tabular-nums">
                          {account.registrationsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((account) => (
              <article
                key={account.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-brand-900">{account.name}</h2>
                  <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 font-ui text-caption font-semibold text-brand-900 tabular-nums">
                    {account.registrationsCount}{' '}
                    {account.registrationsCount === 1 ? 'فعالية' : 'فعاليات'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-small text-slate-700">
                  <Mail
                    className="h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span dir="ltr" className="truncate font-ui">
                    {account.email}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-caption text-slate-600 tabular-nums">
                  <Calendar
                    className="h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span>
                    أول دخول: {account.dateArabic} · {account.timeArabic}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
