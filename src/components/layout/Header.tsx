import React, { useEffect, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { AfaqLogo } from '../brand/AfaqLogo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export interface HeaderProps {
  currentPath: '/' | '/events' | '/event-details' | '/login' | '/my-registrations';
  onNavigateHome: () => void;
  onNavigateEvents: () => void;
  onNavigateMyRegistrations: () => void;
  onLoginClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigateHome,
  onNavigateEvents,
  onNavigateMyRegistrations,
  onLoginClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, authLoading, signOut } = useAuth();

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

  const handleHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigateHome();
  };

  const handleEvents = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigateEvents();
  };

  const handleMyRegistrations = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigateMyRegistrations();
  };

  const handleLogin = () => {
    setMobileMenuOpen(false);
    onLoginClick();
  };

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="afaq-container flex h-16 items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          onClick={handleHome}
          aria-label="آفاق — الصفحة الرئيسية"
          className="inline-flex items-center whitespace-nowrap shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <AfaqLogo size="md" />
        </a>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-8 text-body font-medium text-slate-600"
        >
          <a
            href="/"
            onClick={handleHome}
            aria-current={currentPath === '/' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 py-1 hover:text-brand-700 hover:underline underline-offset-8 decoration-2 decoration-accent-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm ${
              currentPath === '/'
                ? 'font-semibold text-brand-900 underline'
                : 'text-slate-600'
            }`}
          >
            الرئيسية
          </a>
          <a
            href="/events"
            onClick={handleEvents}
            aria-current={
              currentPath === '/events' || currentPath === '/event-details'
                ? 'page'
                : undefined
            }
            className={`whitespace-nowrap shrink-0 py-1 hover:text-brand-700 hover:underline underline-offset-8 decoration-2 decoration-accent-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm ${
              currentPath === '/events' || currentPath === '/event-details'
                ? 'font-semibold text-brand-900 underline'
                : 'text-slate-600'
            }`}
          >
            الفعاليات
          </a>
          {user && (
            <a
              href="/my-registrations"
              onClick={handleMyRegistrations}
              aria-current={
                currentPath === '/my-registrations' ? 'page' : undefined
              }
              className={`whitespace-nowrap shrink-0 py-1 hover:text-brand-700 hover:underline underline-offset-8 decoration-2 decoration-accent-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm ${
                currentPath === '/my-registrations'
                  ? 'font-semibold text-brand-900 underline'
                  : 'text-slate-600'
              }`}
            >
              تسجيلاتي
            </a>
          )}
        </nav>

        {/* Zone 3: Auth State Action (Desktop) + Mobile Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-3">
            {authLoading ? (
              <div
                aria-hidden="true"
                className="h-9 w-28 animate-pulse rounded-full bg-slate-100"
              />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="max-w-44 truncate font-ui text-small font-semibold text-brand-900">
                  {user.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                  onClick={handleSignOut}
                >
                  تسجيل الخروج
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={handleLogin}>
                تسجيل الدخول
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 shadow-sm">
          <nav aria-label="قائمة الجوال" className="flex flex-col gap-2">
            <a
              href="/"
              onClick={handleHome}
              aria-current={currentPath === '/' ? 'page' : undefined}
              className={`rounded-md px-3 py-2.5 font-ui text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                currentPath === '/'
                  ? 'bg-brand-50 text-brand-900 font-semibold'
                  : 'text-slate-700 hover:bg-brand-50'
              }`}
            >
              الرئيسية
            </a>
            <a
              href="/events"
              onClick={handleEvents}
              aria-current={
                currentPath === '/events' || currentPath === '/event-details'
                  ? 'page'
                  : undefined
              }
              className={`rounded-md px-3 py-2.5 font-ui text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                currentPath === '/events' || currentPath === '/event-details'
                  ? 'bg-brand-50 text-brand-900 font-semibold'
                  : 'text-slate-700 hover:bg-brand-50'
              }`}
            >
              الفعاليات
            </a>
            {user && (
              <a
                href="/my-registrations"
                onClick={handleMyRegistrations}
                aria-current={
                  currentPath === '/my-registrations' ? 'page' : undefined
                }
                className={`rounded-md px-3 py-2.5 font-ui text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                  currentPath === '/my-registrations'
                    ? 'bg-brand-50 text-brand-900 font-semibold'
                    : 'text-slate-700 hover:bg-brand-50'
                }`}
              >
                تسجيلاتي
              </a>
            )}

            <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
              {authLoading ? (
                <div
                  aria-hidden="true"
                  className="h-10 w-full animate-pulse rounded-full bg-slate-100"
                />
              ) : user ? (
                <>
                  <p className="px-3 font-ui text-small font-semibold text-brand-900 truncate">
                    {user.name}
                  </p>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    icon={<LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                    onClick={handleSignOut}
                  >
                    تسجيل الخروج
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleLogin}
                >
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
