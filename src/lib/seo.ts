import type { AfaqEvent, EventCategory } from '../types/event';

export const SITE_NAME = 'آفاق';
export const DEFAULT_SITE_TITLE =
  'آفاق | اكتشف آفاقك الجديدة — فعاليات وورش ودورات الفيوم';
export const DEFAULT_SITE_DESCRIPTION =
  'منصة آفاق تساعد الشباب في الفيوم على اكتشاف الورش والدورات التدريبية والفعاليات الشبابية والتسجيل فيها بسهولة من مكان واحد.';
export const DEFAULT_OG_IMAGE_PATH = '/images/afaq-og-cover.jpg';
export const DEFAULT_OG_IMAGE_ALT =
  'منصة آفاق — اكتشف الورش والدورات والفعاليات الشبابية في الفيوم';

export const CATEGORY_SEO_META: Record<
  EventCategory,
  { title: string; description: string }
> = {
  workshop: {
    title: 'ورش العمل في الفيوم | آفاق',
    description:
      'استكشف أحدث ورش العمل التطبيقية للشباب في محافظة الفيوم في مجالات التقنية والتصميم والمهارات العملية وسجّل مكانك عبر آفاق.',
  },
  course: {
    title: 'الدورات التدريبية في الفيوم | آفاق',
    description:
      'تصفح الدورات التدريبية المتخصصة لتطوير مهارات الشباب وتأهيلهم لسوق العمل وريادة الأعمال في محافظة الفيوم عبر منصة آفاق.',
  },
  event: {
    title: 'الفعاليات والملتقيات الشبابية في الفيوم | آفاق',
    description:
      'تعرّف على أحدث الملتقيات الثقافية والمبادرات والفعاليات الشبابية في محافظة الفيوم واحجز مقعدك بسهولة من مكان واحد.',
  },
};

export function buildShortDescription(
  rawText: string,
  fallback: string,
  maxLength = 158
): string {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

export function resolveAbsoluteUrl(
  baseUrl: string,
  pathOrUrl?: string | null
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const candidate = pathOrUrl?.trim();
  if (!candidate) {
    return `${cleanBase}${DEFAULT_OG_IMAGE_PATH}`;
  }
  if (candidate.startsWith('https://') || candidate.startsWith('http://')) {
    return candidate;
  }
  const normalizedPath = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return `${cleanBase}${normalizedPath}`;
}

export function buildHomeJsonLd(
  baseUrl: string,
  events: AfaqEvent[] = []
): Record<string, unknown> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const latest = events.slice(0, 6);

  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'Organization',
      name: SITE_NAME,
      alternateName: 'AFAQ',
      url: `${cleanBase}/`,
      logo: `${cleanBase}/favicon.svg`,
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'محافظة الفيوم، مصر',
      },
    },
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: 'AFAQ',
      url: `${cleanBase}/`,
      inLanguage: 'ar',
      description: DEFAULT_SITE_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${cleanBase}/events?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  if (latest.length > 0) {
    graph.push({
      '@type': 'ItemList',
      name: 'أحدث الفعاليات في الفيوم',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: latest.length,
      itemListElement: latest.map((ev, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${cleanBase}/events/${encodeURIComponent(ev.id)}`,
        name: ev.title,
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildEventsCollectionJsonLd(
  baseUrl: string,
  pageTitle: string,
  pageDescription: string,
  canonicalUrl: string,
  events: AfaqEvent[] = []
): Record<string, unknown> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const listItems = events.slice(0, 24).map((ev, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${cleanBase}/events/${encodeURIComponent(ev.id)}`,
    name: ev.title,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: canonicalUrl,
    inLanguage: 'ar',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: listItems.length,
      itemListElement: listItems,
    },
  };
}

export function buildEventJsonLd(
  baseUrl: string,
  event: AfaqEvent
): Record<string, unknown> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const eventUrl = `${cleanBase}/events/${encodeURIComponent(event.id)}`;
  const imageUrl = resolveAbsoluteUrl(baseUrl, event.coverImageUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: buildShortDescription(
      event.description,
      `${event.title} — ${event.categoryLabel} في ${event.location}.`,
      300
    ),
    startDate: event.startsAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    inLanguage: 'ar',
    isAccessibleForFree: true,
    url: eventUrl,
    image: [imageUrl],
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'الفيوم',
        addressRegion: 'الفيوم',
        addressCountry: 'EG',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer,
    },
  };
}
