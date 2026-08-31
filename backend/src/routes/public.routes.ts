import { Router } from 'express';
import * as publicController from '../controllers/public.controller';
import * as internshipController from '../controllers/internship.controller';
import * as trainerController from '../controllers/trainer.controller';
import * as certificateController from '../controllers/certificate.controller';
import { validateCouponPublic } from '../controllers/paymentSettings.controller';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.get('/stats', publicController.getPublicStats);
router.get('/courses', publicController.getCourses);
router.get('/testimonials', publicController.getTestimonials);
router.get('/gallery', publicController.getGallery);

router.get('/internships', internshipController.listInternships);
router.get('/internships/:slug', internshipController.getInternshipBySlug);

router.get('/trainers', trainerController.listTrainersPublic);

router.get('/certificates/verify/:certificateNo', certificateController.verifyCertificate);

router.post(
  '/coupons/validate',
  [body('internshipId').isUUID(), body('couponCode').optional().isString()],
  validate,
  validateCouponPublic
);

router.post(
  '/contact',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('message').trim().isLength({ min: 5 }).withMessage('Message is required'),
  ],
  validate,
  publicController.submitContactForm
);

export default router;
