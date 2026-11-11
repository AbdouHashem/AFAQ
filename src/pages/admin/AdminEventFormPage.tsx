import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import {
  compressCoverImageFile,
  formatArabicFileSize,
} from '../../lib/image-compression';
import type { AdminEventItem } from '../../types/admin';
import type { EventCategory, EventStatus } from '../../types/event';

export interface AdminEventFormPageProps {
  mode: 'create' | 'edit';
  eventId?: string | null;
  onCancelToList: () => void;
  onSuccessToList: (successMessage: string) => void;
}

type FieldErrorKey =
  | 'title'
  | 'description'
  | 'category'
  | 'startsAt'
  | 'location'
  | 'organizer'
  | 'coverImageUrl';

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

const CATEGORY_OPTIONS = [
  { value: 'workshop', label: 'ورشة عمل' },
  { value: 'course', label: 'دورة' },
  { value: 'event', label: 'فعالية' },
];

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'مسودة',
  published: 'منشورة',
  hidden: 'مخفية',
};

function formatPartsInCairo(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getNum = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: getNum('year'),
    month: getNum('month'),
    day: getNum('day'),
    hour: getNum('hour') % 24,
    minute: getNum('minute'),
  };
}

function isoToCairoInput(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return '';
  const p = formatPartsInCairo(parsed);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

function cairoInputToIso(inputValue: string): string | null {
  const match = inputValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, yStr, mStr, dStr, hhStr, mmStr] = match;
  const targetUtcMs = Date.UTC(
    Number(yStr),
    Number(mStr) - 1,
    Number(dStr),
    Number(hhStr),
    Number(mmStr)
  );
  if (Number.isNaN(targetUtcMs)) return null;

  const cairoAtGuess = formatPartsInCairo(new Date(targetUtcMs));
  const cairoAtGuessMs = Date.UTC(
    cairoAtGuess.year,
    cairoAtGuess.month - 1,
    cairoAtGuess.day,
    cairoAtGuess.hour,
    cairoAtGuess.minute
  );
  const offsetMs = cairoAtGuessMs - targetUtcMs;
  return new Date(targetUtcMs - offsetMs).toISOString();
}

const FieldErrorText: React.FC<{ id: string; message?: string }> = ({
  id,
  message,
}) => {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm bg-red-50 px-2.5 py-1 text-caption font-ui font-medium text-error"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
};

export const AdminEventFormPage: React.FC<AdminEventFormPageProps> = ({
  mode,
  eventId,
  onCancelToList,
  onSuccessToList,
}) => {
  const { getIdToken } = useAuth();

  const [loadingEvent, setLoadingEvent] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<EventStatus | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('workshop');
  const [startsAtInput, setStartsAtInput] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<
    'draft' | 'published' | null
  >(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessNote, setUploadSuccessNote] = useState<string | null>(
    null
  );
  const [previewError, setPreviewError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode === 'create') {
      setLoadingEvent(false);
      setLoadError(null);
      setCurrentStatus(null);
      setTitle('');
      setDescription('');
      setCategory('workshop');
      setStartsAtInput('');
      setLocation('');
      setOrganizer('');
      setCoverImageUrl('');
      setFieldErrors({});
      setSubmitError(null);
      setUploadError(null);
      setUploadSuccessNote(null);
      setPreviewError(false);
      return;
    }

    if (!eventId) {
      setLoadingEvent(false);
      setLoadError('معرّف الفعالية غير موجود.');
      return;
    }

    const controller = new AbortController();

    async function fetchEventForEdit() {
      setLoadingEvent(true);
      setLoadError(null);
      setFieldErrors({});
      setSubmitError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        }

        const res = await fetch(
          `/api/admin/events/${encodeURIComponent(eventId!)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const payload = (await res.json().catch(() => ({}))) as {
          event?: AdminEventItem;
          error?: string;
        };

        if (!res.ok || !payload.event) {
          throw new Error(
            payload.error || 'تعذر تحميل بيانات الفعالية المطلوبة.'
          );
        }

        const ev = payload.event;
        setTitle(ev.title);
        setDescription(ev.description);
        setCategory(ev.category);
        setStartsAtInput(isoToCairoInput(ev.startsAt));
        setLocation(ev.location);
        setOrganizer(ev.organizer);
        setCoverImageUrl(ev.coverImageUrl ?? '');
        setCurrentStatus(ev.status);
        setPreviewError(false);
        setUploadError(null);
        setUploadSuccessNote(null);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل بيانات الفعالية.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingEvent(false);
        }
      }
    }

    fetchEventForEdit();
    return () => controller.abort();
  }, [mode, eventId, getIdToken, reloadTick]);

  useEffect(() => {
    setPreviewError(false);
  }, [coverImageUrl]);

  const clearFieldError = (field: FieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploadSuccessNote(null);
    clearFieldError('coverImageUrl');
    setUploadingImage(true);

    try {
      const compressed = await compressCoverImageFile(file);
      const token = await getIdToken();
      if (!token) {
        throw new Error('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
      }

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataUrl: compressed.dataUrl }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        url?: string;
        sizeBytes?: number;
        error?: string;
      };

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || 'تعذر رفع الصورة حاليًا.');
      }

      setCoverImageUrl(payload.url);
      setPreviewError(false);
      setUploadSuccessNote(
        `تم ضغط الصورة ورفعها بنجاح (${formatArabicFileSize(
          payload.sizeBytes ?? compressed.sizeBytes
        )} بدل ${formatArabicFileSize(compressed.originalSizeBytes)}).`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverImageUrl('');
    setUploadError(null);
    setUploadSuccessNote(null);
    setPreviewError(false);
    clearFieldError('coverImageUrl');
  };

  const validateClientFields = (): {
    errors: FieldErrors;
    isoStartsAt: string | null;
  } => {
    const errors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();
    const trimmedOrganizer = organizer.trim();
    const trimmedCover = coverImageUrl.trim();

    if (!trimmedTitle) {
      errors.title = 'عنوان الفعالية مطلوب.';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'عنوان الفعالية يجب ألا يتجاوز 200 حرف.';
    }

    if (!trimmedDescription) {
      errors.description = 'وصف الفعالية مطلوب.';
    }

    if (!['workshop', 'course', 'event'].includes(category)) {
      errors.category = 'يرجى اختيار تصنيف صالح للفعالية.';
    }

    let isoStartsAt: string | null = null;
    if (!startsAtInput.trim()) {
      errors.startsAt = 'تاريخ ووقت الفعالية مطلوبان.';
    } else {
      isoStartsAt = cairoInputToIso(startsAtInput.trim());
      if (!isoStartsAt) {
        errors.startsAt = 'تاريخ ووقت الفعالية غير صالحين.';
      }
    }

    if (!trimmedLocation) {
      errors.location = 'مكان الفعالية مطلوب.';
    }

    if (!trimmedOrganizer) {
      errors.organizer = 'اسم الجهة المنظمة مطلوب.';
    }

    if (
      trimmedCover &&
      !trimmedCover.startsWith('/') &&
      !trimmedCover.startsWith('https://') &&
      !trimmedCover.startsWith('http://')
    ) {
      errors.coverImageUrl = 'رابط صورة الغلاف يجب أن يبدأ بـ / أو https://.';
    }

    return { errors, isoStartsAt };
  };

  const handleSave = async (targetStatus: 'draft' | 'published') => {
    setSubmitError(null);
    const { errors, isoStartsAt } = validateClientFields();

    if (Object.keys(errors).length > 0 || !isoStartsAt) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmittingAction(targetStatus);

    try {
      const token = await getIdToken();
      if (!token) {
        setSubmitError('تعذر التحقق من جلسة المشرف. يرجى إعادة تسجيل الدخول.');
        return;
      }

      const isEdit = mode === 'edit' && Boolean(eventId);
      const endpoint = isEdit
        ? `/api/admin/events/${encodeURIComponent(eventId!)}`
        : '/api/admin/events';

      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          startsAt: isoStartsAt,
          location: location.trim(),
          organizer: organizer.trim(),
          coverImageUrl: coverImageUrl.trim(),
          status: targetStatus,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        event?: AdminEventItem;
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!res.ok || !payload.event) {
        if (payload.fieldErrors && Object.keys(payload.fieldErrors).length > 0) {
          setFieldErrors(payload.fieldErrors);
        }
        setSubmitError(
          payload.error || 'تعذر حفظ بيانات الفعالية. يرجى مراجعة الحقول.'
        );
        return;
      }

      const actionSuccessMessage =
        targetStatus === 'published'
          ? isEdit
            ? `تم تحديث ونشر فعالية «${payload.event.title}» بنجاح.`
            : `تم إنشاء ونشر فعالية «${payload.event.title}» بنجاح.`
          : isEdit
            ? `تم حفظ تعديلات فعالية «${payload.event.title}» كمسودة بنجاح.`
            : `تم حفظ فعالية «${payload.event.title}» كمسودة بنجاح.`;

      onSuccessToList(actionSuccessMessage);
    } catch {
      setSubmitError(
        'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const isBusy = submittingAction !== null || uploadingImage;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header + Back */}
      <div className="space-y-4 border-b border-slate-200 pb-5">
        <button
          type="button"
          onClick={onCancelToList}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-small font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>العودة إلى الفعاليات</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-h1 font-bold text-brand-900">
              {mode === 'create' ? 'إضافة فعالية جديدة' : 'تعديل الفعالية'}
            </h1>
            <p className="text-body text-slate-600">
              {mode === 'create'
                ? 'أكمل بيانات الفعالية ثم اختر حفظها كمسودة أو نشرها مباشرة.'
                : 'عدّل تفاصيل الفعالية الحالية ثم احفظ التغييرات كمسودة أو انشرها.'}
            </p>
          </div>

          {mode === 'edit' && currentStatus && !loadingEvent && !loadError && (
            <p className="font-ui text-small text-slate-600">
              الحالة الحالية:{' '}
              <span className="font-semibold text-brand-900">
                {STATUS_LABELS[currentStatus]}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Loading State for Edit Mode */}
      {loadingEvent && (
        <div
          role="status"
          aria-busy="true"
          aria-label="جارٍ تحميل بيانات الفعالية"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-5"
        >
          <span className="sr-only">جارٍ تحميل بيانات الفعالية...</span>
          <div className="space-y-2" aria-hidden="true">
            <div className="h-4 w-28 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2" aria-hidden="true">
            <div className="h-4 w-24 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-32 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
        </div>
      )}

      {/* Load Error State */}
      {!loadingEvent && loadError && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-error/25 bg-red-50/60 px-6 py-14 text-center space-y-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-white text-error">
            <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-h4 font-bold text-brand-900">
              تعذر تحميل الفعالية
            </h2>
            <p className="text-body text-slate-700">{loadError}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
              onClick={() => setReloadTick((prev) => prev + 1)}
            >
              إعادة المحاولة
            </Button>
            <Button variant="primary" size="sm" onClick={onCancelToList}>
              العودة إلى القائمة
            </Button>
          </div>
        </div>
      )}

      {/* Event Form */}
      {!loadingEvent && !loadError && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave('published');
          }}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-6"
        >
          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block mb-1.5 font-ui text-small font-medium text-brand-900"
            >
              عنوان الفعالية <span className="text-error">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              required
              value={title}
              disabled={submittingAction !== null}
              aria-invalid={Boolean(fieldErrors.title) || undefined}
              aria-describedby={
                fieldErrors.title ? 'event-title-error' : undefined
              }
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError('title');
              }}
              placeholder="مثال: ورشة أساسيات التصميم الجرافيكي"
              className={`h-12 w-full rounded-md border bg-white px-4 font-ui text-small text-brand-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                fieldErrors.title
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
              }`}
            />
            <FieldErrorText id="event-title-error" message={fieldErrors.title} />
          </div>

          {/* Category + Starts At */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              id="event-category"
              label="التصنيف *"
              value={category}
              disabled={submittingAction !== null}
              error={fieldErrors.category}
              onChange={(e) => {
                setCategory(e.target.value as EventCategory);
                clearFieldError('category');
              }}
              options={CATEGORY_OPTIONS}
            />

            <div>
              <label
                htmlFor="event-starts-at"
                className="block mb-1.5 font-ui text-small font-medium text-brand-900"
              >
                التاريخ والوقت (بتوقيت القاهرة) <span className="text-error">*</span>
              </label>
              <input
                id="event-starts-at"
                type="datetime-local"
                required
                value={startsAtInput}
                disabled={submittingAction !== null}
                aria-invalid={Boolean(fieldErrors.startsAt) || undefined}
                aria-describedby={
                  fieldErrors.startsAt ? 'event-starts-at-error' : undefined
                }
                onChange={(e) => {
                  setStartsAtInput(e.target.value);
                  clearFieldError('startsAt');
                }}
                dir="ltr"
                className={`h-12 w-full rounded-md border bg-white px-4 font-ui text-small text-brand-900 tabular-nums transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                  fieldErrors.startsAt
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
                }`}
              />
              <FieldErrorText
                id="event-starts-at-error"
                message={fieldErrors.startsAt}
              />
            </div>
          </div>

          {/* Location + Organizer */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="event-location"
                className="block mb-1.5 font-ui text-small font-medium text-brand-900"
              >
                المكان <span className="text-error">*</span>
              </label>
              <input
                id="event-location"
                type="text"
                required
                value={location}
                disabled={submittingAction !== null}
                aria-invalid={Boolean(fieldErrors.location) || undefined}
                aria-describedby={
                  fieldErrors.location ? 'event-location-error' : undefined
                }
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearFieldError('location');
                }}
                placeholder="مثال: مركز إبداع مصر الرقمية — الفيوم"
                className={`h-12 w-full rounded-md border bg-white px-4 font-ui text-small text-brand-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                  fieldErrors.location
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
                }`}
              />
              <FieldErrorText
                id="event-location-error"
                message={fieldErrors.location}
              />
            </div>

            <div>
              <label
                htmlFor="event-organizer"
                className="block mb-1.5 font-ui text-small font-medium text-brand-900"
              >
                الجهة المنظمة <span className="text-error">*</span>
              </label>
              <input
                id="event-organizer"
                type="text"
                required
                value={organizer}
                disabled={submittingAction !== null}
                aria-invalid={Boolean(fieldErrors.organizer) || undefined}
                aria-describedby={
                  fieldErrors.organizer ? 'event-organizer-error' : undefined
                }
                onChange={(e) => {
                  setOrganizer(e.target.value);
                  clearFieldError('organizer');
                }}
                placeholder="مثال: مبادرة شباب الفيوم التقني"
                className={`h-12 w-full rounded-md border bg-white px-4 font-ui text-small text-brand-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                  fieldErrors.organizer
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
                }`}
              />
              <FieldErrorText
                id="event-organizer-error"
                message={fieldErrors.organizer}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="event-description"
              className="block mb-1.5 font-ui text-small font-medium text-brand-900"
            >
              الوصف <span className="text-error">*</span>
            </label>
            <textarea
              id="event-description"
              rows={5}
              required
              value={description}
              disabled={submittingAction !== null}
              aria-invalid={Boolean(fieldErrors.description) || undefined}
              aria-describedby={
                fieldErrors.description ? 'event-description-error' : undefined
              }
              onChange={(e) => {
                setDescription(e.target.value);
                clearFieldError('description');
              }}
              placeholder="اكتب وصفًا واضحًا لمحاور الفعالية وأهدافها والفئة المستهدفة..."
              className={`w-full rounded-md border bg-white px-4 py-3 font-ui text-small text-brand-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                fieldErrors.description
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
              }`}
            />
            <FieldErrorText
              id="event-description-error"
              message={fieldErrors.description}
            />
          </div>

          {/* Cover Image Upload & Preview */}
          <div className="space-y-3 rounded-md border border-slate-200 bg-brand-50/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-ui text-small font-medium text-brand-900">
                  صورة الغلاف (اختياري)
                </p>
                <p className="text-caption text-slate-500">
                  ارفع صورة (JPG / PNG / WebP — تُضغط تلقائيًا بحد أقصى 512 كيلوبايت) أو أدخل رابطًا مباشرًا.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isBusy}
                  className="sr-only"
                  aria-label="رفع صورة غلاف للفعالية"
                />

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-700 bg-white px-4 py-1.5 font-ui text-small font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : (
                    <Upload className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  )}
                  <span>
                    {uploadingImage
                      ? 'جارٍ الضغط والرفع...'
                      : coverImageUrl
                        ? 'تغيير الصورة'
                        : 'رفع صورة'}
                  </span>
                </button>

                {coverImageUrl && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleRemoveCover}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-error/30 bg-white px-3.5 py-1.5 font-ui text-small font-semibold text-error hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>إزالة</span>
                  </button>
                )}
              </div>
            </div>

            {coverImageUrl && !previewError && (
              <div className="overflow-hidden rounded-sm border border-slate-200 bg-white aspect-video max-h-60 w-full">
                <img
                  src={coverImageUrl}
                  alt="معاينة صورة غلاف الفعالية"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewError(true)}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {coverImageUrl && previewError && (
              <div className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2 text-caption text-slate-600">
                <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
                <span>تعذر عرض معاينة الرابط الحالي. تأكد من صحة رابط الصورة.</span>
              </div>
            )}

            {uploadSuccessNote && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-sm border border-green-600/25 bg-green-50 px-3 py-2 text-caption font-ui font-medium text-brand-900"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-success"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>{uploadSuccessNote}</span>
              </div>
            )}

            {uploadError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-error/30 bg-red-50 px-3 py-2 text-caption font-ui font-medium text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>{uploadError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="event-cover-url"
                className="block mb-1 font-ui text-caption font-medium text-slate-600"
              >
                رابط صورة الغلاف (اختياري)
              </label>
              <input
                id="event-cover-url"
                type="text"
                value={coverImageUrl}
                disabled={isBusy}
                aria-invalid={Boolean(fieldErrors.coverImageUrl) || undefined}
                aria-describedby={
                  fieldErrors.coverImageUrl ? 'event-cover-url-error' : undefined
                }
                onChange={(e) => {
                  setCoverImageUrl(e.target.value);
                  setUploadSuccessNote(null);
                  setUploadError(null);
                  clearFieldError('coverImageUrl');
                }}
                placeholder="/images/events/... أو https://..."
                dir="ltr"
                className={`h-11 w-full rounded-md border bg-white px-3.5 font-ui text-small text-brand-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                  fieldErrors.coverImageUrl
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
                }`}
              />
              <FieldErrorText
                id="event-cover-url-error"
                message={fieldErrors.coverImageUrl}
              />
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-error/30 bg-red-50 px-4 py-3 text-small text-error"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="font-ui leading-snug">{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="md"
              disabled={isBusy}
              onClick={onCancelToList}
            >
              إلغاء
            </Button>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isBusy}
                onClick={() => void handleSave('draft')}
                icon={
                  submittingAction === 'draft' ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : undefined
                }
              >
                {submittingAction === 'draft' ? 'جارٍ الحفظ كمسودة...' : 'حفظ كمسودة'}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isBusy}
                icon={
                  submittingAction === 'published' ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : undefined
                }
              >
                {submittingAction === 'published' ? 'جارٍ النشر...' : 'نشر'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
