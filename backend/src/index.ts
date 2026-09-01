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

const PORT = Number(process.env.PORT) || 8080;

// --- Security & core middleware --------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Razorpay webhook must be before express.json()
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
  handleWebhook
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : 'dev'
  )
);

app.use('/api', apiRateLimiter);

// Static uploads
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);

// --- Routes ----------------------------------------------------------------

app.use('/api', routes);

// --- Error handling --------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// --- HTTP Server + Socket.IO -----------------------------------------------

const server = http.createServer(app);

initRealtime(server);

// --- Installment reminder --------------------------------------------------

const REMINDER_SWEEP_INTERVAL_MS =
  6 * 60 * 60 * 1000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ASK IT Technologies API started`);
  console.log(`Port: ${PORT}`);
  console.log(`Health endpoint: /api/health`);
  console.log(`Realtime notifications enabled`);

  setTimeout(() => {
    runInstallmentReminderSweep().catch((err) => {
      console.error(
        'Installment reminder sweep failed:',
        err
      );
    });
  }, 15_000);

  setInterval(() => {
    runInstallmentReminderSweep().catch((err) => {
      console.error(
        'Installment reminder sweep failed:',
        err
      );
    });
  }, REMINDER_SWEEP_INTERVAL_MS);
});

export default app;