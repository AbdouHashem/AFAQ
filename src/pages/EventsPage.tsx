import React from 'react';
import { ArrowRight, RotateCcw, Search } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/eventMeta';
import type { AfaqEvent, EventCategory } from '../types/event';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { FilterChip } from '../components/ui/FilterChip';
import { EventCard } from '../components/ui/EventCard';

export interface EventsPageProps {
  events: AfaqEvent[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: EventCategory | '';
  onCategoryChange: (category: EventCategory | '') => void;
  selectedOrganizer: string;
  onOrganizerChange: (organizer: string) => void;
  onClearAllFilters: () => void;
  onBack: () => void;
  onViewEventDetails: (event: AfaqEvent) => void;
}

const CATEGORY_CHIPS: Array<{ id: EventCategory | ''; label: string }> = [
  { id: '', label: 'الكل' },
  { id: 'workshop', label: 'ورشة' },
  { id: 'course', label: 'دورة' },
  { id: 'event', label: 'فعالية' },
];

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  isLoading,
  error,
  onRetry,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedOrganizer,
  onOrganizerChange,
  onClearAllFilters,
  onBack,
  onViewEventDetails,
}) => {
  const organizerOptions = Array.from(
    new Set(events.map((event) => event.organizer))
  ).map((organizer) => ({
    value: organizer,
    label: organizer,
  }));

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === '' || event.category === selectedCategory;
    const matchesOrganizer =
      selectedOrganizer === '' || event.organizer === selectedOrganizer;
    const matchesQuery =
      normalizedQuery === '' ||
      event.title.toLowerCase().includes(normalizedQuery) ||
      event.organizer.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesOrganizer && matchesQuery;
  });

  const hasActiveFilters =
    selectedCategory !== '' || selectedOrganizer !== '' || normalizedQuery !== '';

  const searchValidationError =
    searchQuery.trim().length > 100
      ? 'نص البحث طويل جدًا (الحد الأقصى 100 حرف).'
      : undefined;

  return (
    <main id="main-content" tabIndex={-1} className="py-8 md:py-12 focus:outline-none">
      <div className="afaq-container space-y-8">
        {/* Back Navigation + Page Header */}
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
            <h1 className="text-h1 font-bold text-brand-900">كل الفعاليات</h1>
            <p className="max-w-2xl text-body text-slate-600">
              تصفح جميع الورش والدورات التدريبية والفعاليات المنشورة في محافظة الفيوم، وابحث بالعنوان أو الجهة المنظمة.
            </p>
          </div>
        </div>

        {/* Search & Filters Panel */}
        <section
          aria-label="البحث وتصفية الفعاليات"
          className="rounded-lg border border-slate-200 bg-brand-50/40 p-4 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <SearchInput
                label="بحث بالعنوان أو الجهة المنظمة"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onClear={() => onSearchChange('')}
                maxLength={105}
                error={searchValidationError}
                placeholder="ابحث بعنوان الفعالية أو اسم الجهة المنظمة..."
              />
            </div>

            <div className="md:col-span-5">
              <Select
                label="الجهة المنظمة"
                placeholder="كل الجهات المنظمة"
                options={organizerOptions}
                value={selectedOrganizer}
                onChange={(e) => onOrganizerChange(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter Chips + Clear Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div
              role="group"
              aria-label="تصفية حسب التصنيف"
              className="flex flex-wrap items-center gap-2"
            >
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onCategoryChange(chip.id)}
                    className={`min-h-10 rounded-full border px-4 py-1.5 font-ui text-small font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                      isActive
                        ? 'border-accent-400 bg-accent-100 text-brand-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-accent-200 hover:bg-accent-50 hover:text-brand-900'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearAllFilters}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-ui text-small font-semibold text-brand-700 hover:bg-brand-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>مسح الفلاتر</span>
              </button>
            )}
          </div>
        </section>

        {/* Active Filter Chips & Results Count */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedCategory !== '' && (
            <FilterChip
              label={`التصنيف: ${CATEGORY_LABELS[selectedCategory]}`}
              onRemove={() => onCategoryChange('')}
            />
          )}
          {selectedOrganizer !== '' && (
            <FilterChip
              label={`المنظم: ${selectedOrganizer}`}
              onRemove={() => onOrganizerChange('')}
            />
          )}
          {normalizedQuery !== '' && (
            <FilterChip
              label={`بحث: ${searchQuery.trim()}`}
              onRemove={() => onSearchChange('')}
            />
          )}
          {!isLoading && !error && (
            <span className="ms-auto font-ui text-small text-slate-600 tabular-nums">
              عرض {filteredEvents.length} من أصل {events.length} فعاليات
            </span>
          )}
        </div>

        {/* Loading, Error, Grid, or Empty State */}
        {isLoading ? (
          <div
            role="status"
            aria-label="جارٍ تحميل قائمة الفعاليات"
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
                onClick={onRetry}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                detailsLabel="التفاصيل"
                onViewDetails={onViewEventDetails}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-brand-50/30 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-xs">
              <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h2 className="text-h4 font-bold text-brand-900">
              {events.length === 0
                ? 'لا توجد فعاليات منشورة حاليًا'
                : 'مفيش نتائج مطابقة لبحثك حاليًا'}
            </h2>
            <p className="mt-2 max-w-md text-small text-slate-600">
              {events.length === 0
                ? 'سيتم إضافة فعاليات وورش جديدة في الفيوم قريبًا. يمكنك العودة لاحقًا لاستكشاف الفرص المتاحة.'
                : 'جرّب تغيير كلمات البحث أو اختيار تصنيف آخر، أو امسح الفلاتر لعرض جميع الفعاليات المنشورة.'}
            </p>
            {hasActiveFilters && (
              <div className="mt-6">
                <Button variant="outline" size="md" onClick={onClearAllFilters}>
                  مسح الفلاتر
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
