import rateLimit from 'express-rate-limit';

/**
 * Gets a stable identifier for auth endpoints.
 *
 * For email-based operations we rate-limit primarily by email so that
 * students sharing the same Wi-Fi/network do not block one another.
 */
function emailKey(req: any): string {
  const email = String(
    req.body?.email || ''
  )
    .trim()
    .toLowerCase();

  if (email) {
    return `email:${email}`;
  }

  return `ip:${req.ip}`;
}

/**
 * LOGIN
 *
 * 10 failed/login attempts per 15 minutes for one email.
 *
 * Successful logins are not counted, which avoids locking out users
 * simply because they regularly sign in.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,

  keyGenerator: emailKey,

  skipSuccessfulRequests: true,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      'Too many login attempts. Please wait a few minutes and try again.',
  },
});

/**
 * REGISTRATION
 *
 * Allows several retries if email delivery temporarily fails,
 * but prevents automated registration abuse.
 */
export const registrationRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,

    keyGenerator: emailKey,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        'Too many registration attempts for this email. Please wait a few minutes and try again.',
    },
  });

/**
 * RESEND REGISTRATION OTP
 *
 * OTP resending is intentionally tighter because each request
 * sends an email.
 */
export const otpResendRateLimiter =
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 4,

    keyGenerator: emailKey,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        'Too many OTP requests. Please wait a few minutes before requesting another OTP.',
    },
  });

/**
 * FORGOT PASSWORD
 */
export const forgotPasswordRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,

    keyGenerator: emailKey,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        'Too many password reset requests. Please wait a few minutes and try again.',
    },
  });

/**
 * General API limiter.
 *
 * This applies across /api and protects the application against
 * large request floods.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      'Too many requests. Please wait a moment and try again.',
  },
});

/**
 * Payment protection.
 */
export const paymentRateLimiter =
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        'Too many payment attempts. Please wait a few minutes and try again.',
    },
  });