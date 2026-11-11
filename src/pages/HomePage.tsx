import React, { useState } from 'react';
import { Calendar, GraduationCap, RotateCcw, Users } from 'lucide-react';
import { CATEGORIES, HERO_LANDSCAPE_IMAGE } from '../data/eventMeta';
import type { AfaqEvent, EventCategory } from '../types/event';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { EventCard } from '../components/ui/EventCard';

export interface HomePageProps {
  events: AfaqEvent[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSearchEvents: (query: string) => void;
  onViewAllEvents: () => void;
  onExploreCategory: (category: EventCategory) => void;
  onViewEventDetails: (event: AfaqEvent) => void;
}

const CATEGORY_ICONS: Record<EventCategory, React.ReactNode> = {
  workshop: <GraduationCap className="h-6 w-6 text-brand-700" strokeWidth={1.75} aria-hidden="true" />,
  course: <Calendar className="h-6 w-6 text-brand-700" strokeWidth={1.75} aria-hidden="true" />,
  event: <Users className="h-6 w-6 text-brand-700" strokeWidth={1.75} aria-hidden="true" />,
};

const REGISTRATION_STEPS = [
  {
    number: '01',
    title: 'تصفح واختر الفعالية',
    description:
      'ابحث بالعنوان أو الجهة المنظمة، أو استكشف ورش العمل والدورات والفعاليات المتاحة في الفيوم.',
  },
  {
    number: '02',
    title: 'سجّل دخولك بحساب جوجل',
    description:
      'ادخل بضغطة واحدة باستخدام حساب جوجل الخاص بك دون الحاجة لإنشاء كلمات مرور أو ملء استمارات معقدة.',
  },
  {
    number: '03',
    title: 'أكّد تسجيلك وتابع مواعيدك',
    description:
      'احجز مقعدك فورًا في الفعالية التي تناسبك، وراجع كل تسجيلاتك القادمة بسهولة من مكان واحد.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  events,
  isLoading,
  error,
  onRetry,
  onSearchEvents,
  onViewAllEvents,
  onExploreCategory,
  onViewEventDetails,
}) => {
  const [heroQuery, setHeroQuery] = useState('');
  const [searchError, setSearchError] = useState<string | undefined>(undefined);

  const latestEvents = events.slice(0, 6);

  const handleHeroSearchChange = (value: string) => {
    setHeroQuery(value);
    if (value.trim().length > 100) {
      setSearchError('نص البحث طويل جدًا (الحد الأقصى 100 حرف).');
    } else if (searchError) {
      setSearchError(undefined);
    }
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroQuery.trim();
    if (trimmed.length === 1) {
      setSearchError('يرجى كتابة حرفين على الأقل للبحث.');
      return;
    }
    if (trimmed.length > 100) {
      setSearchError('نص البحث طويل جدًا (الحد الأقصى 100 حرف).');
      return;
    }
    setSearchError(undefined);
    if (trimmed.length > 0) {
      onSearchEvents(trimmed);
    } else {
      onViewAllEvents();
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      {/* 1. Hero Section */}
      <section className="pt-6 pb-12 md:pt-8 md:pb-16">
        <div className="afaq-container">
          <div className="relative overflow-hidden rounded-2xl bg-brand-900 shadow-md">
            {/* Fayoum Landscape Image */}
            <img
              src={HERO_LANDSCAPE_IMAGE}
              alt="منظر طبيعي لبحيرة قارون والنخيل والجبال في الفيوم"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* Deep Blue Gradient Overlay for Crisp Arabic Text Contrast */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-l from-brand-900/95 via-brand-800/85 to-brand-700/35"
            />

            <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
              <div className="max-w-2xl space-y-6">
                <div className="space-y-4">
                  <h1 className="font-sans text-[clamp(2.25rem,4.5vw,3rem)] font-bold leading-[1.2] text-white [text-wrap:balance]">
                    اكتشف آفاقك الجديدة
                  </h1>
                  <p className="max-w-xl text-body-lg text-brand-100 leading-[1.7]">
                    تعلّم، شارك، وتطوّر في مجتمع واحد. دليلك لاكتشاف أحدث الورش والدورات والفعاليات الشبابية في الفيوم والتسجيل فيها من مكان واحد.
                  </p>
                </div>

                {/* Search + Primary Hero Action */}
                <form
                  onSubmit={handleHeroSearchSubmit}
                  noValidate
                  className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-start"
                >
                  <div className="flex-1">
                    <SearchInput
                      value={heroQuery}
                      onChange={(e) => handleHeroSearchChange(e.target.value)}
                      onClear={() => {
                        setHeroQuery('');
                        setSearchError(undefined);
                      }}
                      maxLength={105}
                      error={searchError}
                      placeholder="ابحث عن فعالية، دورة، أو جهة منظمة..."
                      aria-label="ابحث عن فعاليات أو دورات في الفيوم"
                      className="border-white/20 bg-white/95 shadow-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    withArrow
                    className="sm:w-auto w-full"
                  >
                    ابدأ الاستكشاف
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Latest Events Section (6 Cards + "View All" Button) */}
      <section id="latest-events" className="py-12 md:py-16">
        <div className="afaq-container space-y-8">
          <div className="space-y-2">
            <h2 className="text-h2 font-bold text-brand-900">أحدث الفعاليات</h2>
            <p className="text-body text-slate-600">
              فرص تعلم ومشاركة قريبة منك في مختلف مراكز محافظة الفيوم
            </p>
          </div>

          {isLoading ? (
            <div
              role="status"
              aria-label="جارٍ تحميل أحدث الفعاليات"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
                >
                  <div className="aspect-video w-full animate-pulse bg-slate-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-6 w-3/4 animate-pulse rounded-sm bg-slate-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-slate-100" />
                    <div className="h-4 w-2/3 animate-pulse rounded-sm bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-12 text-center">
              <p className="text-body font-medium text-brand-900">{error}</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="md"
                  icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                  onClick={onRetry}
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ) : latestEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-12 text-center">
              <p className="text-h4 font-bold text-brand-900">
                لا توجد فعاليات منشورة حاليًا
              </p>
              <p className="mt-2 text-small text-slate-600">
                سيتم إضافة فعاليات وورش جديدة في الفيوم قريبًا.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onViewDetails={onViewEventDetails}
                />
              ))}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              href="/events"
              variant="outline"
              size="lg"
              withArrow
              onClick={(e) => {
                e.preventDefault();
                onViewAllEvents();
              }}
            >
              عرض الجميع
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Browse by Category Section (3 Cards) */}
      <section
        id="categories"
        className="border-t border-slate-100 bg-brand-50/40 py-14 md:py-20"
      >
        <div className="afaq-container space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-h2 font-bold text-brand-900">تصفح حسب التصنيف</h2>
            <p className="text-body text-slate-600">
              اختر نوع النشاط الذي يناسب أهدافك الآن وانتقل مباشرة إلى الفعاليات المرتبطة به
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {CATEGORIES.map((category) => {
              const count = events.filter(
                (evt) => evt.category === category.id
              ).length;

              return (
                <article
                  key={category.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:border-brand-200 hover:shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-accent-50 border border-accent-100">
                        {CATEGORY_ICONS[category.id]}
                      </div>
                      <span className="font-ui text-small font-medium text-slate-600 tabular-nums">
                        {isLoading ? '...' : `${count} متاحة الآن`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-h3 font-bold text-brand-900">
                        {category.label}
                      </h3>
                      <p className="text-small text-slate-600 leading-[1.7]">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Button
                      href={`/events?category=${category.id}`}
                      variant="outline"
                      size="md"
                      withArrow
                      className="w-full justify-between"
                      onClick={(e) => {
                        e.preventDefault();
                        onExploreCategory(category.id);
                      }}
                    >
                      استكشف
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. How to Register Section (3 Steps) */}
      <section id="how-to-register" className="py-14 md:py-20">
        <div className="afaq-container space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-h2 font-bold text-brand-900">إزاي تسجل</h2>
            <p className="text-body text-slate-600">
              ثلاث خطوات بسيطة تفصلك عن حجز مكانك في أي ورشة أو دورة أو فعالية في الفيوم
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {REGISTRATION_STEPS.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-3 border-t-2 border-accent-500 pt-5"
              >
                <span className="font-ui text-h3 font-bold text-accent-800 tabular-nums">
                  {step.number}
                </span>
                <h3 className="text-h4 font-bold text-brand-900">{step.title}</h3>
                <p className="text-small text-slate-600 leading-[1.7]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
