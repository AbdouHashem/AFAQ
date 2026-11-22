import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import {
  AdminLayout,
  type AdminSectionPath,
} from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEventFormPage } from './pages/admin/AdminEventFormPage';
import { AdminRegistrationsPage } from './pages/admin/AdminRegistrationsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AfaqChatWidget } from './components/chat/AfaqChatWidget';
import { AuthProvider, useAuth } from './context/AuthContext';
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
} from './lib/seo';
import { parseJsonResponse, tryParseJson } from './lib/safe-json';
import type { AfaqEvent, EventCategory } from './types/event';

const VALID_CATEGORIES: EventCategory[] = ['workshop', 'course', 'event'];

type AdminRoute =
  | '/admin'
  | '/admin/events'
  | '/admin/events/new'
  | '/admin/events/edit'
  | '/admin/registrations'
  | '/admin/users';

type AppRoute =
  | '/'
  | '/events'
  | '/event-details'
  | '/login'
  | '/my-registrations'
  | AdminRoute;

function isAdminRoute(path: AppRoute): path is AdminRoute {
  return (
    path === '/admin' ||
    path === '/admin/events' ||
    path === '/admin/events/new' ||
    path === '/admin/events/edit' ||
    path === '/admin/registrations' ||
    path === '/admin/users'
  );
}

function toAdminSectionPath(path: AppRoute): AdminSectionPath {
  if (
    path === '/admin/events' ||
    path === '/admin/events/new' ||
    path === '/admin/events/edit'
  ) {
    return '/admin/events';
  }
  if (path === '/admin/registrations') {
    return '/admin/registrations';
  }
  if (path === '/admin/users') {
    return '/admin/users';
  }
  return '/admin';
}

interface EventsFilterState {
  category: EventCategory | '';
  query: string;
  organizer: string;
}

interface RouteState {
  path: AppRoute;
  eventId: string | null;
  filters: EventsFilterState;
}

function parseRouteFromLocation(): RouteState {
  if (typeof window === 'undefined') {
    return {
      path: '/',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  const pathname = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  const rawCategory = params.get('category');
  const category =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as EventCategory)
      ? (rawCategory as EventCategory)
      : '';
  const query = params.get('q') ?? '';
  const organizer = params.get('organizer') ?? '';

  if (pathname === '/login' || pathname === '/login/') {
    return {
      path: '/login',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (pathname === '/my-registrations' || pathname === '/my-registrations/') {
    return {
      path: '/my-registrations',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (pathname === '/admin/events/new' || pathname === '/admin/events/new/') {
    return {
      path: '/admin/events/new',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  const adminEditMatch = pathname.match(/^\/admin\/events\/([^/]+)\/edit\/?$/);
  if (adminEditMatch) {
    return {
      path: '/admin/events/edit',
      eventId: decodeURIComponent(adminEditMatch[1]),
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (pathname === '/admin/events' || pathname === '/admin/events/') {
    return {
      path: '/admin/events',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (
    pathname === '/admin/registrations' ||
    pathname === '/admin/registrations/'
  ) {
    return {
      path: '/admin/registrations',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (pathname === '/admin/users' || pathname === '/admin/users/') {
    return {
      path: '/admin/users',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return {
      path: '/admin',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    };
  }

  const detailsMatch = pathname.match(/^\/events\/([^/]+)\/?$/);
  if (detailsMatch) {
    return {
      path: '/event-details',
      eventId: decodeURIComponent(detailsMatch[1]),
      filters: { category, query, organizer },
    };
  }

  if (pathname === '/events' || pathname === '/events/') {
    return {
      path: '/events',
      eventId: null,
      filters: { category, query, organizer },
    };
  }

  return {
    path: '/',
    eventId: null,
    filters: { category: '', query: '', organizer: '' },
  };
}

function buildEventsUrl(filters: EventsFilterState): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.organizer) params.set('organizer', filters.organizer);
  const qs = params.toString();
  return qs ? `/events?${qs}` : '/events';
}

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

function setCanonicalHref(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setJsonLdData(data: Record<string, unknown>) {
  const scriptEl = document.getElementById('afaq-jsonld');
  if (scriptEl) {
    scriptEl.textContent = JSON.stringify(data);
  }
}

interface PageMetadataInput {
  title: string;
  description: string;
  robots?: string;
  canonicalUrl?: string;
  ogType?: 'website' | 'article';
  ogImageUrl?: string;
  ogImageAlt?: string;
  jsonLd?: Record<string, unknown>;
}

function updatePageMetadata({
  title,
  description,
  robots = 'index, follow',
  canonicalUrl,
  ogType = 'website',
  ogImageUrl,
  ogImageAlt,
  jsonLd,
}: PageMetadataInput) {
  const origin = window.location.origin;
  const resolvedCanonical =
    canonicalUrl ?? `${origin}${window.location.pathname}`;
  const resolvedImage = ogImageUrl ?? resolveAbsoluteUrl(origin, null);
  const resolvedImageAlt = ogImageAlt ?? DEFAULT_OG_IMAGE_ALT;

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[name="robots"]', robots);
  setCanonicalHref(resolvedCanonical);
  setMetaContent('meta[property="og:type"]', ogType);
  setMetaContent('meta[property="og:url"]', resolvedCanonical);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:image"]', resolvedImage);
  setMetaContent('meta[property="og:image:alt"]', resolvedImageAlt);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[name="twitter:image"]', resolvedImage);

  if (jsonLd) {
    setJsonLdData(jsonLd);
  }
}

function AppContent() {
  const { user, authLoading, getIdToken } = useAuth();
  const [routeState, setRouteState] = useState<RouteState>(() =>
    parseRouteFromLocation()
  );
  const [savedEventsFilters, setSavedEventsFilters] = useState<EventsFilterState>(
    () => parseRouteFromLocation().filters
  );
  const [returnRoute, setReturnRoute] = useState<RouteState>(() => {
    const initial = parseRouteFromLocation();
    return initial.path === '/my-registrations' || isAdminRoute(initial.path)
      ? initial
      : {
          path: '/',
          eventId: null,
          filters: { category: '', query: '', organizer: '' },
        };
  });
  const [previousPath, setPreviousPath] = useState<AppRoute>('/');

  const [events, setEvents] = useState<AfaqEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsReloadTick, setEventsReloadTick] = useState(0);
  const [detailsEvent, setDetailsEvent] = useState<AfaqEvent | null>(null);

  const [adminGate, setAdminGate] = useState<
    'idle' | 'checking' | 'authorized' | 'unauthorized'
  >('idle');
  const [adminEventsBanner, setAdminEventsBanner] = useState<string | null>(
    null
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const res = await fetch('/api/events', { signal: controller.signal });
        if (!res.ok) {
          throw new Error('تعذر تحميل الفعاليات حاليًا. يرجى المحاولة مرة أخرى.');
        }
        const data = await parseJsonResponse<{ events?: AfaqEvent[] }>(
          res,
          'تعذر تحميل الفعاليات حاليًا. يرجى المحاولة مرة أخرى.'
        );
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setEventsError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء الاتصال بالخادم.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();
    return () => controller.abort();
  }, [eventsReloadTick]);

  // Verify admin authorization directly from server on every /admin/* route visit
  useEffect(() => {
    if (!isAdminRoute(routeState.path)) {
      setAdminGate('idle');
      return;
    }

    if (authLoading) {
      setAdminGate('checking');
      return;
    }

    if (!user) {
      setAdminGate('unauthorized');
      return;
    }

    const controller = new AbortController();
    setAdminGate('checking');

    async function verifyAdminOnServer() {
      try {
        const token = await getIdToken();
        if (!token || controller.signal.aborted) {
          if (!controller.signal.aborted) setAdminGate('unauthorized');
          return;
        }

        const res = await fetch('/api/admin/access', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        if (!res.ok) {
          setAdminGate('unauthorized');
          return;
        }

        const data = (await tryParseJson<{ authorized?: boolean }>(res)) ?? {};
        setAdminGate(data.authorized === true ? 'authorized' : 'unauthorized');
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setAdminGate('unauthorized');
      }
    }

    verifyAdminOnServer();
    return () => controller.abort();
  }, [routeState.path, user, authLoading, getIdToken]);

  useEffect(() => {
    const handlePopState = () => {
      const next = parseRouteFromLocation();
      setRouteState(next);
      if (next.path === '/events') {
        setSavedEventsFilters(next.filters);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const origin = window.location.origin;
    const baseJsonLd = buildHomeJsonLd(origin, events);

    if (isAdminRoute(routeState.path)) {
      if (adminGate === 'unauthorized') {
        updatePageMetadata({
          title: 'غير مصرّح | آفاق',
          description: 'عذرًا، هذه الصفحة مخصصة لمشرفي منصة آفاق فقط.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else if (routeState.path === '/admin/events/new') {
        updatePageMetadata({
          title: 'إضافة فعالية جديدة | لوحة التحكم — آفاق',
          description: 'إضافة فعالية أو ورشة أو دورة جديدة في منصة آفاق.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else if (routeState.path === '/admin/events/edit') {
        updatePageMetadata({
          title: 'تعديل الفعالية | لوحة التحكم — آفاق',
          description: 'تعديل بيانات الفعالية وتحديث حالة نشرها في منصة آفاق.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else if (routeState.path === '/admin/events') {
        updatePageMetadata({
          title: 'إدارة الفعاليات | لوحة التحكم — آفاق',
          description: 'إدارة الفعاليات والورش والدورات التدريبية في منصة آفاق.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else if (routeState.path === '/admin/registrations') {
        updatePageMetadata({
          title: 'إدارة التسجيلات | لوحة التحكم — آفاق',
          description: 'عرض ومتابعة تسجيلات الشباب في فعاليات آفاق.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else if (routeState.path === '/admin/users') {
        updatePageMetadata({
          title: 'المستخدمون | لوحة التحكم — آفاق',
          description: 'عرض قائمة الحسابات المسجّلة عبر جوجل في منصة آفاق.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      } else {
        updatePageMetadata({
          title: 'لوحة التحكم | آفاق',
          description: 'لوحة إدارة منصة آفاق للفعاليات والورش والدورات في الفيوم.',
          robots: 'noindex, nofollow',
          jsonLd: baseJsonLd,
        });
      }
    } else if (routeState.path === '/login') {
      updatePageMetadata({
        title: 'تسجيل الدخول | آفاق',
        description:
          'سجّل دخولك بحساب جوجل في منصة آفاق لاكتشاف فعاليات وورش ودورات الفيوم والتسجيل فيها بسهولة.',
        robots: 'noindex, nofollow',
        jsonLd: baseJsonLd,
      });
    } else if (routeState.path === '/my-registrations') {
      updatePageMetadata({
        title: 'تسجيلاتي | آفاق',
        description:
          'تابع قائمة الفعاليات والورش التدريبية والدورات التي سجّلت بها على منصة آفاق في الفيوم.',
        robots: 'noindex, nofollow',
        jsonLd: baseJsonLd,
      });
    } else if (routeState.path === '/events') {
      const category = routeState.filters.category;
      const pageTitle = category
        ? CATEGORY_SEO_META[category].title
        : 'كل الفعاليات | آفاق — فعاليات وورش ودورات الفيوم';
      const pageDescription = category
        ? CATEGORY_SEO_META[category].description
        : 'تصفح وابحث في جميع الورش والدورات التدريبية والفعاليات الشبابية المنشورة في محافظة الفيوم.';
      const canonicalUrl = category
        ? `${origin}/events?category=${category}`
        : `${origin}/events`;
      updatePageMetadata({
        title: pageTitle,
        description: pageDescription,
        robots: 'index, follow',
        canonicalUrl,
        ogImageAlt: pageTitle,
        jsonLd: buildEventsCollectionJsonLd(
          origin,
          pageTitle,
          pageDescription,
          canonicalUrl,
          events
        ),
      });
    } else if (routeState.path === '/event-details') {
      if (detailsEvent) {
        const fallbackDesc = `${detailsEvent.title} — ${detailsEvent.categoryLabel} في ${detailsEvent.location} بتنظيم ${detailsEvent.organizer}.`;
        const shortDesc = buildShortDescription(
          detailsEvent.description,
          fallbackDesc
        );
        updatePageMetadata({
          title: `${detailsEvent.title} | آفاق`,
          description: shortDesc,
          robots: 'index, follow',
          canonicalUrl: `${origin}/events/${encodeURIComponent(detailsEvent.id)}`,
          ogType: 'article',
          ogImageUrl: resolveAbsoluteUrl(origin, detailsEvent.coverImageUrl),
          ogImageAlt: detailsEvent.title,
          jsonLd: buildEventJsonLd(origin, detailsEvent),
        });
      } else {
        updatePageMetadata({
          title: 'تفاصيل الفعالية | آفاق',
          description:
            'تعرّف على تفاصيل وموعد ومكان الفعالية وسجّل مكانك بسهولة عبر منصة آفاق.',
          robots: 'index, follow',
          jsonLd: baseJsonLd,
        });
      }
    } else {
      updatePageMetadata({
        title: DEFAULT_SITE_TITLE,
        description: DEFAULT_SITE_DESCRIPTION,
        robots: 'index, follow',
        canonicalUrl: `${origin}/`,
        jsonLd: baseJsonLd,
      });
    }
  }, [
    routeState.path,
    routeState.filters.category,
    detailsEvent,
    adminGate,
    events,
  ]);

  const navigateTo = useCallback(
    (nextState: RouteState, replace = false) => {
      let url = '/';
      if (nextState.path === '/login') {
        url = '/login';
      } else if (nextState.path === '/my-registrations') {
        url = '/my-registrations';
      } else if (nextState.path === '/admin/events/edit' && nextState.eventId) {
        url = `/admin/events/${encodeURIComponent(nextState.eventId)}/edit`;
      } else if (isAdminRoute(nextState.path)) {
        url = nextState.path;
      } else if (nextState.path === '/events') {
        url = buildEventsUrl(nextState.filters);
        setSavedEventsFilters(nextState.filters);
      } else if (nextState.path === '/event-details' && nextState.eventId) {
        url = `/events/${encodeURIComponent(nextState.eventId)}`;
      }

      if (!replace && nextState.path !== routeState.path) {
        setPreviousPath(routeState.path);
      }

      if (replace) {
        window.history.replaceState({}, '', url);
      } else {
        window.history.pushState({}, '', url);
      }
      setRouteState(nextState);
    },
    [routeState.path]
  );

  const handleNavigateHome = useCallback(() => {
    navigateTo({
      path: '/',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  const handleNavigateHomeSection = useCallback(
    (sectionId: 'categories' | 'how-to-register') => {
      const scrollToTarget = () => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      if (routeState.path !== '/') {
        navigateTo({
          path: '/',
          eventId: null,
          filters: { category: '', query: '', organizer: '' },
        });
        window.setTimeout(scrollToTarget, 60);
      } else {
        scrollToTarget();
      }
    },
    [navigateTo, routeState.path]
  );

  const handleNavigateEvents = useCallback(() => {
    navigateTo({
      path: '/events',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  const handleNavigateMyRegistrations = useCallback(() => {
    navigateTo({
      path: '/my-registrations',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  const handleNavigateLogin = useCallback(
    (customReturnState?: RouteState) => {
      const targetReturn =
        customReturnState ??
        (routeState.path === '/login' ? returnRoute : routeState);
      setReturnRoute(targetReturn);
      navigateTo({
        path: '/login',
        eventId: null,
        filters: { category: '', query: '', organizer: '' },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateTo, returnRoute, routeState]
  );

  const handleLoginReturn = useCallback(() => {
    const destination: RouteState =
      returnRoute.path === '/login'
        ? {
            path: '/',
            eventId: null,
            filters: { category: '', query: '', organizer: '' },
          }
        : returnRoute;
    navigateTo(destination, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo, returnRoute]);

  const handleSearchFromHome = (query: string) => {
    navigateTo({
      path: '/events',
      eventId: null,
      filters: { category: '', query, organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreCategory = (category: EventCategory) => {
    navigateTo({
      path: '/events',
      eventId: null,
      filters: { category, query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEventsSearchChange = (query: string) => {
    navigateTo(
      {
        ...routeState,
        path: '/events',
        filters: { ...routeState.filters, query },
      },
      true
    );
  };

  const handleEventsCategoryChange = (category: EventCategory | '') => {
    navigateTo(
      {
        ...routeState,
        path: '/events',
        filters: { ...routeState.filters, category },
      },
      true
    );
  };

  const handleEventsOrganizerChange = (organizer: string) => {
    navigateTo(
      {
        ...routeState,
        path: '/events',
        filters: { ...routeState.filters, organizer },
      },
      true
    );
  };

  const handleClearEventsFilters = () => {
    navigateTo(
      {
        path: '/events',
        eventId: null,
        filters: { category: '', query: '', organizer: '' },
      },
      true
    );
  };

  const handleEventsBack = () => {
    if (previousPath === '/') {
      handleNavigateHome();
      return;
    }
    handleNavigateHome();
  };

  const handleViewEventDetails = (event: AfaqEvent) => {
    if (routeState.path === '/events') {
      setSavedEventsFilters(routeState.filters);
    } else {
      setSavedEventsFilters({ category: '', query: '', organizer: '' });
    }

    setDetailsEvent(event);
    navigateTo({
      path: '/event-details',
      eventId: event.id,
      filters:
        routeState.path === '/events'
          ? routeState.filters
          : { category: '', query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEventById = useCallback(
    (eventId: string) => {
      setDetailsEvent(null);
      navigateTo({
        path: '/event-details',
        eventId,
        filters: savedEventsFilters,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateTo, savedEventsFilters]
  );

  const handleBackFromDetails = useCallback(() => {
    navigateTo({
      path: '/events',
      eventId: null,
      filters: savedEventsFilters,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo, savedEventsFilters]);

  const handleEventResolved = useCallback((resolved: AfaqEvent | null) => {
    setDetailsEvent(resolved);
  }, []);

  const handleRetryEvents = () => {
    setEventsReloadTick((prev) => prev + 1);
  };

  const handleRequireLoginForEvent = useCallback(
    (event: AfaqEvent) => {
      handleNavigateLogin({
        path: '/event-details',
        eventId: event.id,
        filters: savedEventsFilters,
      });
    },
    [handleNavigateLogin, savedEventsFilters]
  );

  const handleRequireLoginForRegistrations = useCallback(() => {
    handleNavigateLogin({
      path: '/my-registrations',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    });
  }, [handleNavigateLogin]);

  const handleNavigateAdminSection = useCallback(
    (adminPath: AdminSectionPath) => {
      navigateTo({
        path: adminPath,
        eventId: null,
        filters: { category: '', query: '', organizer: '' },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateTo]
  );

  const handleNavigateAdminCreateEvent = useCallback(() => {
    navigateTo({
      path: '/admin/events/new',
      eventId: null,
      filters: { category: '', query: '', organizer: '' },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  const handleNavigateAdminEditEvent = useCallback(
    (eventId: string) => {
      navigateTo({
        path: '/admin/events/edit',
        eventId,
        filters: { category: '', query: '', organizer: '' },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateTo]
  );

  const handleAdminEventFormSuccess = useCallback(
    (successMessage: string) => {
      setAdminEventsBanner(successMessage);
      setEventsReloadTick((prev) => prev + 1);
      navigateTo({
        path: '/admin/events',
        eventId: null,
        filters: { category: '', query: '', organizer: '' },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateTo]
  );

  const handleConsumeAdminEventsBanner = useCallback(() => {
    setAdminEventsBanner(null);
  }, []);

  const handleRequireLoginForAdmin = useCallback(() => {
    handleNavigateLogin(
      isAdminRoute(routeState.path)
        ? routeState
        : {
            path: '/admin',
            eventId: null,
            filters: { category: '', query: '', organizer: '' },
          }
    );
  }, [handleNavigateLogin, routeState]);

  const currentIsAdminRoute = isAdminRoute(routeState.path);

  if (currentIsAdminRoute && adminGate === 'authorized') {
    return (
      <div className="min-h-screen bg-white text-slate-800">
        <a
          href="#main-content"
          onClick={(e) => {
            const mainEl = document.getElementById('main-content');
            if (mainEl) {
              e.preventDefault();
              mainEl.focus();
              mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-full focus:bg-brand-700 focus:px-4 focus:py-2 focus:font-ui focus:text-small focus:font-semibold focus:text-white focus:shadow-md"
        >
          تخطي إلى المحتوى الرئيسي
        </a>

        <AdminLayout
          activePath={toAdminSectionPath(routeState.path)}
          onNavigateSection={handleNavigateAdminSection}
          onNavigateSiteHome={handleNavigateHome}
          onSignOutSuccess={handleNavigateHome}
        >
          {routeState.path === '/admin' ? (
            <AdminDashboardPage onNavigateSection={handleNavigateAdminSection} />
          ) : routeState.path === '/admin/events' ? (
            <AdminEventsPage
              onCreateEvent={handleNavigateAdminCreateEvent}
              onEditEvent={handleNavigateAdminEditEvent}
              initialSuccessMessage={adminEventsBanner}
              onConsumeSuccessMessage={handleConsumeAdminEventsBanner}
              onEventsMutated={handleRetryEvents}
            />
          ) : routeState.path === '/admin/events/new' ? (
            <AdminEventFormPage
              mode="create"
              onCancelToList={() => handleNavigateAdminSection('/admin/events')}
              onSuccessToList={handleAdminEventFormSuccess}
            />
          ) : routeState.path === '/admin/events/edit' ? (
            <AdminEventFormPage
              mode="edit"
              eventId={routeState.eventId}
              onCancelToList={() => handleNavigateAdminSection('/admin/events')}
              onSuccessToList={handleAdminEventFormSuccess}
            />
          ) : routeState.path === '/admin/registrations' ? (
            <AdminRegistrationsPage />
          ) : (
            <AdminUsersPage />
          )}
        </AdminLayout>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <a
        href="#main-content"
        onClick={(e) => {
          const mainEl = document.getElementById('main-content');
          if (mainEl) {
            e.preventDefault();
            mainEl.focus();
            mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-full focus:bg-brand-700 focus:px-4 focus:py-2 focus:font-ui focus:text-small focus:font-semibold focus:text-white focus:shadow-md"
      >
        تخطي إلى المحتوى الرئيسي
      </a>

      <Header
        currentPath={isAdminRoute(routeState.path) ? '/' : routeState.path}
        onNavigateHome={handleNavigateHome}
        onNavigateEvents={handleNavigateEvents}
        onNavigateMyRegistrations={handleNavigateMyRegistrations}
        onNavigateAdmin={() => handleNavigateAdminSection('/admin')}
        onLoginClick={() => handleNavigateLogin()}
      />

      <div className="flex-1">
        {currentIsAdminRoute && (adminGate === 'idle' || adminGate === 'checking') && (
          <main id="main-content" tabIndex={-1} className="py-12 md:py-16 focus:outline-none">
            <div
              role="status"
              aria-label="جارٍ التحقق من صلاحية الوصول"
              className="afaq-container space-y-6"
            >
              <div className="h-9 w-48 animate-pulse rounded-sm bg-slate-100" aria-hidden="true" />
              <div className="h-44 w-full animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
            </div>
          </main>
        )}

        {currentIsAdminRoute && adminGate === 'unauthorized' && (
          <UnauthorizedPage
            onNavigateHome={handleNavigateHome}
            onNavigateLogin={handleRequireLoginForAdmin}
          />
        )}

        {routeState.path === '/login' && (
          <LoginPage
            onBack={handleLoginReturn}
            onSuccessRedirect={handleLoginReturn}
          />
        )}

        {routeState.path === '/my-registrations' && (
          <MyRegistrationsPage
            onBack={handleNavigateHome}
            onBrowseEvents={handleNavigateEvents}
            onOpenEvent={handleOpenEventById}
            onRequireLogin={handleRequireLoginForRegistrations}
          />
        )}

        {routeState.path === '/events' && (
          <EventsPage
            events={events}
            isLoading={eventsLoading}
            error={eventsError}
            onRetry={handleRetryEvents}
            searchQuery={routeState.filters.query}
            onSearchChange={handleEventsSearchChange}
            selectedCategory={routeState.filters.category}
            onCategoryChange={handleEventsCategoryChange}
            selectedOrganizer={routeState.filters.organizer}
            onOrganizerChange={handleEventsOrganizerChange}
            onClearAllFilters={handleClearEventsFilters}
            onBack={handleEventsBack}
            onViewEventDetails={handleViewEventDetails}
          />
        )}

        {routeState.path === '/event-details' && routeState.eventId && (
          <EventDetailsPage
            eventId={routeState.eventId}
            onBackToEvents={handleBackFromDetails}
            onRequireLogin={handleRequireLoginForEvent}
            onNavigateMyRegistrations={handleNavigateMyRegistrations}
            onEventResolved={handleEventResolved}
          />
        )}

        {routeState.path === '/' && (
          <HomePage
            events={events}
            isLoading={eventsLoading}
            error={eventsError}
            onRetry={handleRetryEvents}
            onSearchEvents={handleSearchFromHome}
            onViewAllEvents={handleNavigateEvents}
            onExploreCategory={handleExploreCategory}
            onViewEventDetails={handleViewEventDetails}
          />
        )}
      </div>

      <Footer
        onNavigateHome={handleNavigateHome}
        onNavigateHomeSection={handleNavigateHomeSection}
        onNavigateEvents={handleNavigateEvents}
        onExploreCategory={handleExploreCategory}
      />

      {!currentIsAdminRoute && (
        <AfaqChatWidget onOpenEventById={handleOpenEventById} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
