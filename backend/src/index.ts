import 'dotenv/config';

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import routes from './routes';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware';

import {
  apiRateLimiter,
} from './middleware/rateLimit.middleware';

import {
  handleWebhook,
} from './controllers/payment.controller';

import {
  initRealtime,
} from './services/realtime.service';

import {
  runInstallmentReminderSweep,
} from './services/reminder.service';

// IMPORTANT:
// notification.routes.ts uses `export default router`
import notificationRoutes from './routes/notification.routes';

const app = express();

const PORT =
  Number(process.env.PORT) || 8080;

// ---------------------------------------------------------------------------
// SECURITY
// ---------------------------------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:5173',

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// ---------------------------------------------------------------------------
// RAZORPAY WEBHOOK
//
// IMPORTANT:
// Must be mounted BEFORE express.json().
//
// Razorpay signature verification requires the original raw request body.
// ---------------------------------------------------------------------------

app.post(
  '/api/payments/webhook',

  express.raw({
    type: 'application/json',
  }),

  (
    req,
    _res,
    next
  ) => {
    (req as any).rawBody =
      req.body;

    next();
  },

  handleWebhook
);

// ---------------------------------------------------------------------------
// BODY PARSERS
// ---------------------------------------------------------------------------

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  cookieParser()
);

// ---------------------------------------------------------------------------
// LOGGING
// ---------------------------------------------------------------------------

app.use(
  morgan(
    process.env.NODE_ENV ===
      'production'
      ? 'combined'
      : 'dev'
  )
);

// ---------------------------------------------------------------------------
// RATE LIMITING
// ---------------------------------------------------------------------------

app.use(
  '/api',
  apiRateLimiter
);

// ---------------------------------------------------------------------------
// LEGACY STATIC UPLOADS
//
// Keep this temporarily because older records may still reference /uploads.
//
// New profile pictures, receipts and certificates should use
// Google Cloud Storage.
// ---------------------------------------------------------------------------

app.use(
  '/uploads',

  express.static(
    path.join(
      process.cwd(),
      'uploads'
    )
  )
);

// ---------------------------------------------------------------------------
// NOTIFICATION ROUTES
//
// Provides:
// GET    /api/notifications
// PATCH  /api/notifications/read-all
// PATCH  /api/notifications/:id/read
// POST   /api/notifications/push/subscribe
// POST   /api/notifications/push/unsubscribe
// ---------------------------------------------------------------------------

app.use(
  '/api/notifications',
  notificationRoutes
);

// ---------------------------------------------------------------------------
// MAIN API ROUTES
// ---------------------------------------------------------------------------

app.use(
  '/api',
  routes
);

// ---------------------------------------------------------------------------
// ERROR HANDLING
// ---------------------------------------------------------------------------

app.use(
  notFoundHandler
);

app.use(
  errorHandler
);

// ---------------------------------------------------------------------------
// HTTP SERVER
// ---------------------------------------------------------------------------

const server =
  http.createServer(app);

// ---------------------------------------------------------------------------
// SOCKET.IO / REAL-TIME WEBSITE NOTIFICATIONS
// ---------------------------------------------------------------------------

initRealtime(server);

// ---------------------------------------------------------------------------
// INSTALLMENT REMINDERS
//
// Sweep immediately after startup and then every 6 hours.
//
// Cloud Run instances can sleep/restart, so this is best-effort.
// ---------------------------------------------------------------------------

const REMINDER_SWEEP_INTERVAL_MS =
  6 * 60 * 60 * 1000;

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      'AskIT Technologies API started'
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      'Health endpoint: /api/health'
    );

    console.log(
      'Realtime notifications enabled'
    );

    console.log(
      'Web Push notifications enabled when VAPID is configured'
    );

    // First reminder sweep after server startup.
    setTimeout(() => {
      runInstallmentReminderSweep()
        .catch((err) => {
          console.error(
            'Installment reminder sweep failed:',
            err
          );
        });
    }, 15_000);

    // Re-run reminder sweep every 6 hours.
    setInterval(() => {
      runInstallmentReminderSweep()
        .catch((err) => {
          console.error(
            'Installment reminder sweep failed:',
            err
          );
        });
    }, REMINDER_SWEEP_INTERVAL_MS);
  }
);

export default app;