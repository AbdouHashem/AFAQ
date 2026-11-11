import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export interface UnauthorizedPageProps {
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  onNavigateHome,
  onNavigateLogin,
}) => {
  const { user } = useAuth();

  return (
    <main id="main-content" tabIndex={-1} className="py-14 md:py-20 focus:outline-none">
      <div className="afaq-container">
        <div
          role="alert"
          className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-14 text-center shadow-xs"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-error/20 bg-red-50 text-error">
            <ShieldAlert className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </div>

          <h1 className="text-h1 font-bold text-brand-900">غير مصرّح</h1>
          <p className="mt-3 max-w-md text-body text-slate-600 leading-[1.7]">
            {user
              ? 'عذرًا، هذا الحساب لا يملك صلاحية الوصول إلى لوحة التحكم. هذه الصفحة مخصصة لمشرفي منصة آفاق فقط.'
              : 'عذرًا، يجب تسجيل الدخول بحساب مشرف مصرّح له للوصول إلى لوحة التحكم.'}
          </p>

          {user && (
            <p className="mt-2 font-ui text-small text-slate-600">
              الحساب الحالي:{' '}
              <span className="font-semibold text-brand-900" dir="ltr">
                {user.email}
              </span>
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!user && (
              <Button variant="secondary" size="md" withArrow onClick={onNavigateLogin}>
                تسجيل الدخول بحساب جوجل
              </Button>
            )}
            <Button variant={user ? 'primary' : 'outline'} size="md" onClick={onNavigateHome}>
              العودة إلى الرئيسية
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};
