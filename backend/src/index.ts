import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { handleWebhook } from './controllers/payment.controller';
import { initRealtime } from './services/realtime.service';
import { runInstallmentReminderSweep } from './services/reminder.service';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security & core middleware --------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving uploaded images cross-origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// The Razorpay webhook MUST be registered before express.json() and must
// receive the exact raw request bytes — the HMAC signature Razorpay sends is
// computed over those raw bytes, and re-serializing a parsed JSON object
// would not reliably reproduce them.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    (req as any).rawBody = req.body; // Buffer, read by the handler for signature verification
    next();
  },
  handleWebhook
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiRateLimiter);

// Static file serving for uploads (profile pictures, certificates, gallery, materials)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- Routes ------------------------------------------------------------------
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

// Wrap in a plain http.Server (instead of app.listen directly) so Socket.IO
// can attach to the exact same server/port for real-time notifications.
const server = http.createServer(app);
initRealtime(server);

const REMINDER_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

server.listen(PORT, () => {
  console.log(`\n🚀 ASK IT Technologies API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Real-time notifications: ws://localhost:${PORT}\n`);

  // Run once shortly after boot, then on a recurring interval. Wrapped in
  // catch so one bad sweep (e.g. a transient DB hiccup) never crashes the
  // whole server or stops future sweeps.
  setTimeout(() => runInstallmentReminderSweep().catch((err) => console.error('Installment reminder sweep failed:', err)), 15_000);
  setInterval(() => runInstallmentReminderSweep().catch((err) => console.error('Installment reminder sweep failed:', err)), REMINDER_SWEEP_INTERVAL_MS);
});

export default app;

