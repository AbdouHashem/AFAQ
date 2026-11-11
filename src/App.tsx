import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { AuthProvider } from './context/AuthContext';
import type { AfaqEvent, EventCategory } from './types/event';

const VALID_CATEGORIES: EventCategory[] = ['workshop', 'course', 'event'];

type AppRoute =
  | '/'
  | '/events'
  | '/event-details'
  | '/login'
  | '/my-registrations';

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

function updatePageMetadata(title: string, description: string) {
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
}

function AppContent() {
  const [routeState, setRouteState] = useState<RouteState>(() =>
    parseRouteFromLocation()
  );
  const [savedEventsFilters, setSavedEventsFilters] = useState<EventsFilterState>(
    () => parseRouteFromLocation().filters
  );
  const [returnRoute, setReturnRoute] = useState<RouteState>(() => {
    const initial = parseRouteFromLocation();
    return initial.path === '/my-registrations'
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
        const data = (await res.json()) as { events?: AfaqEvent[] };
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
    if (routeState.path === '/login') {
      updatePageMetadata(
        'تسجيل الدخول | آفاق',
        'سجّل دخولك بحساب جوجل في منصة آفاق لاكتشاف فعاليات وورش ودورات الفيوم والتسجيل فيها بسهولة.'
      );
    } else if (routeState.path === '/my-registrations') {
      updatePageMetadata(
        'تسجيلاتي | آفاق',
        'تابع قائمة الفعاليات والورش التدريبية والدورات التي سجّلت بها على منصة آفاق في الفيوم.'
      );
    } else if (routeState.path === '/events') {
      updatePageMetadata(
        'كل الفعاليات | آفاق — فعاليات وورش ودورات الفيوم',
        'تصفح وابحث في جميع الورش والدورات التدريبية والفعاليات الشبابية المنشورة في محافظة الفيوم.'
      );
    } else if (routeState.path === '/event-details') {
      if (detailsEvent) {
        const cleanDesc = detailsEvent.description.replace(/\s+/g, ' ').trim();
        const shortDesc =
          cleanDesc.length > 155 ? `${cleanDesc.slice(0, 152)}...` : cleanDesc;
        updatePageMetadata(
          `${detailsEvent.title} | آفاق`,
          shortDesc ||
            `${detailsEvent.title} — ${detailsEvent.categoryLabel} في ${detailsEvent.location} بتنظيم ${detailsEvent.organizer}.`
        );
      } else {
        updatePageMetadata(
          'تفاصيل الفعالية | آفاق',
          'تعرّف على تفاصيل وموعد ومكان الفعالية وسجّل مكانك بسهولة عبر منصة آفاق.'
        );
      }
    } else {
      updatePageMetadata(
        'آفاق | اكتشف آفاقك الجديدة — فعاليات وورش ودورات الفيوم',
        'منصة آفاق تساعد الشباب في الفيوم على اكتشاف الفعاليات والورش والدورات والتسجيل فيها من مكان واحد.'
      );
    }
  }, [routeState.path, detailsEvent]);

  const navigateTo = useCallback(
    (nextState: RouteState, replace = false) => {
      let url = '/';
      if (nextState.path === '/login') {
        url = '/login';
      } else if (nextState.path === '/my-registrations') {
        url = '/my-registrations';
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
        currentPath={routeState.path}
        onNavigateHome={handleNavigateHome}
        onNavigateEvents={handleNavigateEvents}
        onNavigateMyRegistrations={handleNavigateMyRegistrations}
        onLoginClick={() => handleNavigateLogin()}
      />

      <div className="flex-1">
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
