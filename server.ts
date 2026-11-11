import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPublishedEventById, getPublishedEvents } from './src/db/events.ts';
import {
  createUserRegistration,
  getUserRegistrations,
  isUserRegisteredForEvent,
  RegistrationError,
} from './src/db/registrations.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
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

  // Authenticated user: create a registration for themselves ONLY (no update/delete)
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
