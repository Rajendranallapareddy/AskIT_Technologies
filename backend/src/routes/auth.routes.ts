import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { registerValidation, loginValidation, resetPasswordValidation } from '../utils/validators';
import { body } from 'express-validator';
import { uploadProfilePicture } from '../services/upload.service';

const router = Router();

router.post('/register', authRateLimiter, registerValidation, validate, authController.register);
router.post('/verify-email', body('token').notEmpty(), validate, authController.verifyEmail);
router.post('/login', authRateLimiter, loginValidation, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authRateLimiter, body('email').isEmail(), validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.put('/profile-picture', authenticate, uploadProfilePicture.single('picture'), authController.updateMyProfilePicture);

export default router;
