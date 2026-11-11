import React from 'react';
import { AfaqLogo } from '../brand/AfaqLogo';
import type { EventCategory } from '../../types/event';

export interface FooterProps {
  onNavigateHome: () => void;
  onNavigateHomeSection: (sectionId: 'categories' | 'how-to-register') => void;
  onNavigateEvents: () => void;
  onExploreCategory: (category: EventCategory) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateHomeSection,
  onNavigateEvents,
  onExploreCategory,
}) => {
  return (
    <footer className="border-t border-slate-200 bg-brand-50/50">
      <div className="afaq-container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              aria-label="آفاق — العودة إلى الصفحة الرئيسية"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm"
            >
              <AfaqLogo size="md" showEnglishSub />
            </a>
            <p className="max-w-sm text-small text-slate-600 leading-relaxed">
              منصة تجمع الفعاليات والورش والدورات التدريبية للشباب في محافظة الفيوم في مكان واحد سهل الاستكشاف والتسجيل.
            </p>
            <p className="font-ui text-small font-semibold text-brand-700">
              أفق أوسع... من الفيوم
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="font-ui text-small font-bold text-brand-900">روابط المنصة</h2>
            <ul className="space-y-2.5 text-small text-slate-600">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateHome();
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  الرئيسية
                </a>
              </li>
              <li>
                <a
                  href="/events"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateEvents();
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  أحدث الفعاليات
                </a>
              </li>
              <li>
                <a
                  href="/#categories"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateHomeSection('categories');
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  تصفح حسب التصنيف
                </a>
              </li>
              <li>
                <a
                  href="/#how-to-register"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateHomeSection('how-to-register');
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  إزاي تسجل
                </a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="md:col-span-4 space-y-3">
            <h2 className="font-ui text-small font-bold text-brand-900">التصنيفات</h2>
            <ul className="space-y-2.5 text-small text-slate-600">
              <li>
                <a
                  href="/events?category=workshop"
                  onClick={(e) => {
                    e.preventDefault();
                    onExploreCategory('workshop');
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  ورش العمل التطبيقية
                </a>
              </li>
              <li>
                <a
                  href="/events?category=course"
                  onClick={(e) => {
                    e.preventDefault();
                    onExploreCategory('course');
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  الدورات التدريبية
                </a>
              </li>
              <li>
                <a
                  href="/events?category=event"
                  onClick={(e) => {
                    e.preventDefault();
                    onExploreCategory('event');
                  }}
                  className="inline-block rounded-sm hover:text-brand-700 hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                >
                  الفعاليات والملتقيات الشبابية
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-caption text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} آفاق (AFAQ). جميع الحقوق محفوظة.</p>
          <p>مصممة لشباب الفيوم — اكتشف آفاقك الجديدة</p>
        </div>
      </div>
    </footer>
  );
};
