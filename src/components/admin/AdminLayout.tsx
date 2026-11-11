import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { AfaqLogo } from '../brand/AfaqLogo';
import { useAuth } from '../../context/AuthContext';

export type AdminSectionPath =
  | '/admin'
  | '/admin/events'
  | '/admin/registrations'
  | '/admin/users';

export interface AdminLayoutProps {
  activePath: AdminSectionPath;
  onNavigateSection: (path: AdminSectionPath) => void;
  onNavigateSiteHome: () => void;
  onSignOutSuccess: () => void;
  children: React.ReactNode;
}

const ADMIN_NAV_ITEMS: Array<{
  path: AdminSectionPath;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    path: '/admin',
    label: 'لوحة التحكم',
    icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    path: '/admin/events',
    label: 'الفعاليات',
    icon: <CalendarDays className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    path: '/admin/registrations',
    label: 'التسجيلات',
    icon: <ClipboardList className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    icon: <Users className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />,
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activePath,
  onNavigateSection,
  onNavigateSiteHome,
  onSignOutSuccess,
  children,
}) => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeItem =
    ADMIN_NAV_ITEMS.find((item) => item.path === activePath) ?? ADMIN_NAV_ITEMS[0];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleSelectSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: AdminSectionPath
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigateSection(path);
  };

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    onSignOutSuccess();
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-50/30 md:flex-row">
      {/* Desktop Right-Side RTL Sidebar */}
      <aside
        aria-label="قائمة لوحة الأدمن"
        className="hidden md:flex md:w-68 md:shrink-0 md:flex-col md:justify-between border-e border-slate-200 bg-white sticky top-0 h-screen"
      >
        <div className="space-y-6 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSiteHome();
              }}
              aria-label="آفاق — العودة إلى الموقع"
              className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <AfaqLogo size="sm" />
            </a>
            <span className="rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 font-ui text-caption font-semibold text-brand-900">
              الأدمن
            </span>
          </div>

          <nav aria-label="أقسام لوحة التحكم" className="space-y-1.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = activePath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleSelectSection(e, item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 font-ui text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-brand-50 hover:text-brand-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-5 space-y-3">
          {user && (
            <div className="rounded-md bg-brand-50/60 px-3 py-2.5 space-y-0.5">
              <p className="truncate font-ui text-small font-semibold text-brand-900">
                {user.name}
              </p>
              <p className="truncate font-ui text-caption text-slate-600" dir="ltr">
                {user.email}
              </p>
            </div>
          )}

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSiteHome();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-small font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors"
          >
            <span>عرض الموقع</span>
            <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-error/30 bg-white px-4 py-2 font-ui text-small font-semibold text-error hover:border-error/50 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar with Dropdown Navigation */}
      <header className="md:hidden sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSiteHome();
              }}
              aria-label="آفاق — العودة إلى الموقع"
              className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <AfaqLogo size="sm" />
            </a>
            <span className="rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 font-ui text-caption font-semibold text-brand-900">
              الأدمن
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-dropdown"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-ui text-small font-semibold text-brand-900 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <span>{activeItem.label}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-brand-700 transition-transform duration-150 ${
                mobileMenuOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            id="admin-mobile-dropdown"
            className="border-t border-slate-200 bg-white px-4 py-4 shadow-md space-y-3"
          >
            <nav aria-label="قائمة لوحة التحكم للجوال" className="flex flex-col gap-1.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = activePath === item.path;
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={(e) => handleSelectSection(e, item.path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 font-ui text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                      isActive
                        ? 'bg-brand-700 text-white'
                        : 'text-slate-700 hover:bg-brand-50 hover:text-brand-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              {user && (
                <p className="px-1 font-ui text-caption text-slate-600 truncate">
                  {user.name} ({user.email})
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    onNavigateSiteHome();
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 font-ui text-small font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  <span>عرض الموقع</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-error/30 bg-white px-3 py-2 font-ui text-small font-semibold text-error hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-5 sm:p-8 lg:p-10 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
};
