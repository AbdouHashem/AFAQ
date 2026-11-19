import type { Request } from 'express';
import {
  getPublishedEventById,
  getPublishedEvents,
} from '../db/events.ts';
import type { AfaqEvent, EventCategory } from '../types/event.ts';
import {
  buildEventJsonLd,
  buildEventsCollectionJsonLd,
  buildHomeJsonLd,
  buildShortDescription,
  CATEGORY_SEO_META,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  resolveAbsoluteUrl,
} from './seo.ts';

export interface ResolvedPageSeo {
  statusCode: number;
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogImageUrl: string;
  ogImageAlt: string;
  jsonLd: Record<string, unknown>;
}

const VALID_CATEGORIES = new Set<EventCategory>([
  'workshop',
  'course',
  'event',
]);

export function resolveBaseUrl(req: Request): string {
  const forwardedHost = req
    .header('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const rawHost = forwardedHost || req.get('host') || '';
  const hostnameOnly = rawHost.split(':')[0]?.toLowerCase() ?? '';
  const isLocalHost =
    !hostnameOnly ||
    hostnameOnly === 'localhost' ||
    hostnameOnly === '127.0.0.1' ||
    hostnameOnly === '0.0.0.0';

  if (!isLocalHost) {
    const forwardedProto = req
      .header('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim();
    const protocol = forwardedProto || req.protocol || 'https';
    return `${protocol}://${rawHost}`.replace(/\/+$/, '');
  }

  const configured = process.env.APP_URL?.trim();
  if (
    configured &&
    (configured.startsWith('https://') || configured.startsWith('http://'))
  ) {
    return configured.replace(/\/+$/, '');
  }

  return `http://${rawHost || 'localhost:3000'}`.replace(/\/+$/, '');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function generateRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /login',
    'Disallow: /my-registrations',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    '',
  ].join('\n');
}

export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const publishedEvents = await getPublishedEvents();
  const todayIso = new Date().toISOString().split('T')[0];

  const urls: Array<{
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
  }> = [
    {
      loc: `${cleanBase}/`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${cleanBase}/events`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${cleanBase}/events?category=workshop`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${cleanBase}/events?category=course`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${cleanBase}/events?category=event`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.8',
    },
  ];

  for (const event of publishedEvents) {
    urls.push({
      loc: `${cleanBase}/events/${encodeURIComponent(event.id)}`,
      lastmod: todayIso,
      changefreq: 'weekly',
      priority: '0.85',
    });
  }

  const entries = urls
    .map((entry) => {
      const lastmodTag = entry.lastmod
        ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : '';
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmodTag}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function resolveRouteSeoForRequest(
  req: Request,
  baseUrl: string
): Promise<ResolvedPageSeo> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const pathname = req.path || '/';
  const defaultOgImage = resolveAbsoluteUrl(cleanBase, null);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return {
      statusCode: 200,
      title: 'لوحة التحكم | آفاق',
      description: 'لوحة إدارة منصة آفاق للفعاليات والورش والدورات في الفيوم.',
      robots: 'noindex, nofollow',
      canonicalUrl: `${cleanBase}${pathname}`,
      ogType: 'website',
      ogImageUrl: defaultOgImage,
      ogImageAlt: DEFAULT_OG_IMAGE_ALT,
      jsonLd: buildHomeJsonLd(cleanBase),
    };
  }

  if (pathname === '/login' || pathname === '/login/') {
    return {
      statusCode: 200,
      title: 'تسجيل الدخول | آفاق',
      description:
        'سجّل دخولك بحساب جوجل في منصة آفاق لاكتشاف فعاليات وورش ودورات الفيوم والتسجيل فيها بسهولة.',
      robots: 'noindex, nofollow',
      canonicalUrl: `${cleanBase}/login`,
      ogType: 'website',
      ogImageUrl: defaultOgImage,
      ogImageAlt: DEFAULT_OG_IMAGE_ALT,
      jsonLd: buildHomeJsonLd(cleanBase),
    };
  }

  if (pathname === '/my-registrations' || pathname === '/my-registrations/') {
    return {
      statusCode: 200,
      title: 'تسجيلاتي | آفاق',
      description:
        'تابع قائمة الفعاليات والورش التدريبية والدورات التي سجّلت بها على منصة آفاق في الفيوم.',
      robots: 'noindex, nofollow',
      canonicalUrl: `${cleanBase}/my-registrations`,
      ogType: 'website',
      ogImageUrl: defaultOgImage,
      ogImageAlt: DEFAULT_OG_IMAGE_ALT,
      jsonLd: buildHomeJsonLd(cleanBase),
    };
  }

  const eventMatch = pathname.match(/^\/events\/([^/]+)\/?$/);
  if (eventMatch) {
    const eventId = decodeURIComponent(eventMatch[1]);
    try {
      const event = await getPublishedEventById(eventId);
      if (event) {
        const title = `${event.title} | آفاق`;
        const fallbackDesc = `${event.title} — ${event.categoryLabel} في ${event.location} بتنظيم ${event.organizer} يوم ${event.dateArabic}.`;
        const description = buildShortDescription(
          event.description,
          fallbackDesc
        );
        const canonicalUrl = `${cleanBase}/events/${encodeURIComponent(event.id)}`;

        return {
          statusCode: 200,
          title,
          description,
          robots: 'index, follow',
          canonicalUrl,
          ogType: 'article',
          ogImageUrl: resolveAbsoluteUrl(cleanBase, event.coverImageUrl),
          ogImageAlt: event.title,
          jsonLd: buildEventJsonLd(cleanBase, event),
        };
      }
    } catch (error) {
      console.error('SEO event lookup failed:', error);
    }

    return {
      statusCode: 404,
      title: 'الفعالية غير موجودة | آفاق',
      description: DEFAULT_SITE_DESCRIPTION,
      robots: 'noindex, nofollow',
      canonicalUrl: `${cleanBase}/events`,
      ogType: 'website',
      ogImageUrl: defaultOgImage,
      ogImageAlt: DEFAULT_OG_IMAGE_ALT,
      jsonLd: buildHomeJsonLd(cleanBase),
    };
  }

  if (pathname === '/events' || pathname === '/events/') {
    let publishedEvents: AfaqEvent[] = [];
    try {
      publishedEvents = await getPublishedEvents();
    } catch {
      publishedEvents = [];
    }

    const rawCategory =
      typeof req.query.category === 'string'
        ? (req.query.category as EventCategory)
        : null;
    const activeCategory =
      rawCategory && VALID_CATEGORIES.has(rawCategory) ? rawCategory : null;

    const title = activeCategory
      ? CATEGORY_SEO_META[activeCategory].title
      : 'كل الفعاليات | آفاق — فعاليات وورش ودورات الفيوم';
    const description = activeCategory
      ? CATEGORY_SEO_META[activeCategory].description
      : 'تصفح وابحث في جميع الورش والدورات التدريبية والفعاليات الشبابية المنشورة في محافظة الفيوم.';
    const canonicalUrl = activeCategory
      ? `${cleanBase}/events?category=${activeCategory}`
      : `${cleanBase}/events`;

    return {
      statusCode: 200,
      title,
      description,
      robots: 'index, follow',
      canonicalUrl,
      ogType: 'website',
      ogImageUrl: defaultOgImage,
      ogImageAlt: title,
      jsonLd: buildEventsCollectionJsonLd(
        cleanBase,
        title,
        description,
        canonicalUrl,
        publishedEvents
      ),
    };
  }

  let publishedEvents: AfaqEvent[] = [];
  try {
    publishedEvents = await getPublishedEvents();
  } catch {
    publishedEvents = [];
  }

  return {
    statusCode: 200,
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    robots: 'index, follow',
    canonicalUrl: `${cleanBase}/`,
    ogType: 'website',
    ogImageUrl: defaultOgImage,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    jsonLd: buildHomeJsonLd(cleanBase, publishedEvents),
  };
}

function replaceMetaTag(
  html: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): string {
  const escapedContent = escapeHtmlAttr(content);
  const pattern = new RegExp(
    `<meta\\s+${attrName}=["']${attrValue}["']\\s+content=["'][\\s\\S]*?["']\\s*/?>`,
    'i'
  );
  const tag = `<meta ${attrName}="${attrValue}" content="${escapedContent}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, () => tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

export function injectSeoIntoHtml(
  html: string,
  seo: ResolvedPageSeo
): string {
  let result = html;

  result = result.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${escapeHtmlText(seo.title)}</title>`
  );

  result = replaceMetaTag(result, 'name', 'description', seo.description);
  result = replaceMetaTag(result, 'name', 'robots', seo.robots);

  const canonicalTag = `<link rel="canonical" href="${escapeHtmlAttr(
    seo.canonicalUrl
  )}" />`;
  const canonicalPattern =
    /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i;
  if (canonicalPattern.test(result)) {
    result = result.replace(canonicalPattern, () => canonicalTag);
  } else {
    result = result.replace('</head>', `    ${canonicalTag}\n  </head>`);
  }

  result = replaceMetaTag(result, 'property', 'og:type', seo.ogType);
  result = replaceMetaTag(result, 'property', 'og:url', seo.canonicalUrl);
  result = replaceMetaTag(result, 'property', 'og:title', seo.title);
  result = replaceMetaTag(
    result,
    'property',
    'og:description',
    seo.description
  );
  result = replaceMetaTag(result, 'property', 'og:image', seo.ogImageUrl);
  result = replaceMetaTag(
    result,
    'property',
    'og:image:alt',
    seo.ogImageAlt
  );

  result = replaceMetaTag(result, 'name', 'twitter:title', seo.title);
  result = replaceMetaTag(
    result,
    'name',
    'twitter:description',
    seo.description
  );
  result = replaceMetaTag(result, 'name', 'twitter:image', seo.ogImageUrl);

  const jsonLdScript = `<script id="afaq-jsonld" type="application/ld+json">${serializeJsonLd(
    seo.jsonLd
  )}</script>`;
  if (/<script\s+id=["']afaq-jsonld["'][^>]*>[\s\S]*?<\/script>/i.test(result)) {
    result = result.replace(
      /<script\s+id=["']afaq-jsonld["'][^>]*>[\s\S]*?<\/script>/i,
      () => jsonLdScript
    );
  } else {
    result = result.replace('</head>', `    ${jsonLdScript}\n  </head>`);
  }

  return result;
}
