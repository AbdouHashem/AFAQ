import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createEventAsAdmin,
  deleteEventAsAdmin,
  EventValidationError,
  getAllEventsForAdmin,
  getEventByIdForAdmin,
  getPublishedEventById,
  getPublishedEvents,
  updateEventAsAdmin,
} from './src/db/events.ts';
import {
  cancelUserRegistration,
  createUserRegistration,
  getAllRegistrationsForAdmin,
  getUserRegistrations,
  isUserRegisteredForEvent,
  RegistrationError,
} from './src/db/registrations.ts';
import {
  getAdminDashboardData,
} from './src/db/dashboard.ts';
import {
  getEventMediaById,
  MediaUploadError,
  uploadEventCoverMedia,
} from './src/db/media.ts';
import { getAllUsersForAdmin } from './src/db/users.ts';
import {
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/media/:id', async (req, res) => {
    try {
      const media = await getEventMediaById(req.params.id);
      if (!media) {
        return res.status(404).json({ error: 'الصورة غير موجودة.' });
      }
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Content-Length', String(media.sizeBytes));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(media.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل الصورة.';
      res.status(500).json({ error: message });
    }
  });

  // Authenticated: verify Firebase ID token and ensure user record exists in Cloud SQL
  app.post('/api/auth/session', requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'غير مصرح.' });
    }
    const email = req.user?.email ?? `${uid}@users.afaq.local`;
    const name = req.user?.name ?? email.split('@')[0] ?? 'مستخدم آفاق';
    res.json({
      user: {
        id: uid,
        name,
        email,
      },
    });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'غير مصرح.' });
    }
    const email = req.user?.email ?? `${uid}@users.afaq.local`;
    const name = req.user?.name ?? email.split('@')[0] ?? 'مستخدم آفاق';
    res.json({
      user: {
        id: uid,
        name,
        email,
      },
    });
  });

  // Public: only published events are visible
  app.get('/api/events', async (_req, res) => {
    try {
      const items = await getPublishedEvents();
      res.json({ events: items });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل الفعاليات.';
      res.status(500).json({ error: message });
    }
  });

  // Public: only a published event can be viewed
  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await getPublishedEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'الفعالية غير موجودة.' });
      }
      res.json({ event });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل تفاصيل الفعالية.';
      res.status(500).json({ error: message });
    }
  });

  // Authenticated user: read ONLY their own registrations (uid strictly from verified token)
  app.get('/api/registrations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'غير مصرح.' });
      }
      const items = await getUserRegistrations(userId);
      res.json({ registrations: items });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل التسجيلات.';
      res.status(500).json({ error: message });
    }
  });

  // Authenticated user: check whether user is already registered for an event
  app.get(
    '/api/registrations/event/:eventId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'غير مصرح.' });
        }
        const registered = await isUserRegisteredForEvent(
          userId,
          req.params.eventId
        );
        res.json({ registered });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'تعذر التحقق من حالة التسجيل.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Authenticated user: create or cancel their own registration (uid strictly from verified token)
  app.post('/api/registrations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'غير مصرح.' });
      }
      const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : '';
      const registration = await createUserRegistration(userId, eventId);
      res.status(201).json({ registration });
    } catch (error) {
      if (error instanceof RegistrationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      const message =
        error instanceof Error ? error.message : 'تعذر إتمام التسجيل.';
      res.status(500).json({ error: message });
    }
  });

  app.delete(
    '/api/registrations/event/:eventId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return res.status(401).json({ error: 'غير مصرح.' });
        }
        const registration = await cancelUserRegistration(
          userId,
          req.params.eventId
        );
        res.json({
          registration,
          message: 'تم إلغاء تسجيلك في الفعالية بنجاح.',
        });
      } catch (error) {
        if (error instanceof RegistrationError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : 'تعذر إلغاء التسجيل.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin-only routes: verified token + server-side user_roles lookup on every request
  app.get('/api/admin/access', requireAuth, requireAdmin, (_req, res) => {
    res.json({ authorized: true });
  });

  app.get(
    '/api/admin/dashboard',
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      try {
        const dashboard = await getAdminDashboardData();
        res.json(dashboard);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'تعذر تحميل بيانات لوحة التحكم.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    '/api/admin/media',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const uploaded = await uploadEventCoverMedia(req.body?.dataUrl);
        res.status(201).json(uploaded);
      } catch (error) {
        if (error instanceof MediaUploadError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : 'تعذر رفع الصورة.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.get('/api/admin/events', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const items = await getAllEventsForAdmin();
      res.json({ events: items });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل الفعاليات.';
      res.status(500).json({ error: message });
    }
  });

  app.get(
    '/api/admin/events/:id',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const event = await getEventByIdForAdmin(req.params.id);
        if (!event) {
          return res.status(404).json({ error: 'الفعالية غير موجودة.' });
        }
        res.json({ event });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'تعذر تحميل بيانات الفعالية.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.post('/api/admin/events', requireAuth, requireAdmin, async (req, res) => {
    try {
      const event = await createEventAsAdmin(req.body ?? {});
      res.status(201).json({ event });
    } catch (error) {
      if (error instanceof EventValidationError) {
        return res.status(error.statusCode).json({
          error: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        });
      }
      const message =
        error instanceof Error ? error.message : 'تعذر إنشاء الفعالية.';
      res.status(500).json({ error: message });
    }
  });

  app.patch(
    '/api/admin/events/:id',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const event = await updateEventAsAdmin(req.params.id, req.body ?? {});
        res.json({ event });
      } catch (error) {
        if (error instanceof EventValidationError) {
          return res.status(error.statusCode).json({
            error: error.message,
            ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
          });
        }
        const message =
          error instanceof Error ? error.message : 'تعذر تحديث الفعالية.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.delete(
    '/api/admin/events/:id',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        await deleteEventAsAdmin(req.params.id);
        res.json({ message: 'تم حذف الفعالية وتسجيلاتها بنجاح.' });
      } catch (error) {
        if (error instanceof EventValidationError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : 'تعذر حذف الفعالية.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.get(
    '/api/admin/registrations',
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const rawEventId =
          typeof req.query.eventId === 'string'
            ? req.query.eventId.trim()
            : '';
        const items = await getAllRegistrationsForAdmin(
          rawEventId ? rawEventId : undefined
        );
        res.json({
          registrations: items,
          totalCount: items.length,
        });
      } catch (error) {
        if (error instanceof RegistrationError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        const message =
          error instanceof Error ? error.message : 'تعذر تحميل التسجيلات.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const items = await getAllUsersForAdmin();
      res.json({
        users: items,
        totalCount: items.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل المستخدمين.';
      res.status(500).json({ error: message });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'المسار المطلوب غير موجود.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AFAQ server listening on port ${PORT}`);
  });
}

startServer();
