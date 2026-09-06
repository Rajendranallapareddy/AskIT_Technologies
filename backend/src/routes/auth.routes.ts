import { Router } from 'express';
import { body } from 'express-validator';

import * as authController from '../controllers/auth.controller';

import {
  authenticate,
} from '../middleware/auth.middleware';

import {
  validate,
} from '../middleware/validation.middleware';

import {
  authRateLimiter,
} from '../middleware/rateLimit.middleware';

import {
  registerValidation,
  loginValidation,
  resetPasswordValidation,
} from '../utils/validators';

import {
  uploadProfilePicture,
} from '../services/upload.service';

const router = Router();

/**
 * --------------------------------------------------------------------------
 * REGISTER
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/register
 *
 * Creates/updates a PendingRegistration record
 * and sends a 6-digit verification OTP.
 *
 * A real User account is NOT created yet.
 */
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  validate,
  authController.register
);

/**
 * --------------------------------------------------------------------------
 * VERIFY EMAIL OTP
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/verify-email
 *
 * Body:
 * {
 *   email: "student@example.com",
 *   otp: "123456"
 * }
 *
 * After successful OTP verification:
 * - User account is created
 * - isEmailVerified = true
 * - PendingRegistration is deleted
 */
router.post(
  '/verify-email',

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .bail()
    .isEmail()
    .withMessage(
      'Please enter a valid email address.'
    )
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty()
    .withMessage(
      'Please enter the verification OTP.'
    )
    .bail()
    .matches(/^\d{6}$/)
    .withMessage(
      'Please enter a valid 6-digit OTP.'
    ),

  validate,

  authController.verifyEmail
);

/**
 * --------------------------------------------------------------------------
 * RESEND VERIFICATION OTP
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/resend-verification-otp
 *
 * Body:
 * {
 *   email: "student@example.com"
 * }
 *
 * Generates a new OTP for PendingRegistration.
 */
router.post(
  '/resend-verification-otp',

  authRateLimiter,

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .bail()
    .isEmail()
    .withMessage(
      'Please enter a valid email address.'
    )
    .normalizeEmail(),

  validate,

  authController.resendVerificationOtp
);

/**
 * --------------------------------------------------------------------------
 * LOGIN
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/login
 *
 * Login does NOT require OTP.
 *
 * Students can login only after their email
 * has been verified and their User account exists.
 */
router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  validate,
  authController.login
);

/**
 * --------------------------------------------------------------------------
 * REFRESH ACCESS TOKEN
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  authController.refresh
);

/**
 * --------------------------------------------------------------------------
 * LOGOUT
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * --------------------------------------------------------------------------
 * FORGOT PASSWORD
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/forgot-password
 *
 * Body:
 * {
 *   email: "student@example.com"
 * }
 *
 * Sends password reset OTP.
 */
router.post(
  '/forgot-password',

  authRateLimiter,

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .bail()
    .isEmail()
    .withMessage(
      'Please enter a valid email address.'
    )
    .normalizeEmail(),

  validate,

  authController.forgotPassword
);

/**
 * --------------------------------------------------------------------------
 * RESET PASSWORD
 * --------------------------------------------------------------------------
 *
 * POST /api/auth/reset-password
 *
 * Expected body:
 * {
 *   email: "student@example.com",
 *   otp: "123456",
 *   password: "NewPassword@123"
 * }
 */
router.post(
  '/reset-password',
  resetPasswordValidation,
  validate,
  authController.resetPassword
);

/**
 * --------------------------------------------------------------------------
 * CURRENT USER
 * --------------------------------------------------------------------------
 *
 * GET /api/auth/me
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

/**
 * --------------------------------------------------------------------------
 * UPDATE PROFILE PICTURE
 * --------------------------------------------------------------------------
 *
 * PUT /api/auth/profile-picture
 */
router.put(
  '/profile-picture',

  authenticate,

  uploadProfilePicture.single(
    'picture'
  ),

  authController.updateMyProfilePicture
);

export default router;