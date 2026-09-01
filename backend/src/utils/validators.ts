import { body, param, query } from 'express-validator';
import { PASSWORD_REGEX, MOBILE_REGEX } from './constants';

export const registerValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Please enter your full name'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('mobileNumber').matches(MOBILE_REGEX).withMessage('Please enter a valid 10-digit mobile number'),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character'
    ),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('gender').notEmpty().withMessage('Please select your gender').bail().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Please select a valid gender'),
  body('dateOfBirth').notEmpty().withMessage('Please enter your date of birth').bail().isISO8601().withMessage('Please enter a valid date of birth').toDate(),
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').matches(PASSWORD_REGEX).withMessage('Password does not meet complexity requirements'),
];

export const idParamValidation = [param('id').isUUID().withMessage('Invalid id')];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const internshipValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description is required'),
  body('duration').notEmpty(),
  body('startDate').isISO8601().toDate(),
  body('endDate').isISO8601().toDate(),
  body('registrationDeadline').isISO8601().toDate(),
  body('totalSeats').isInt({ min: 1 }),
  body('mode').isIn(['ONLINE', 'OFFLINE', 'HYBRID']),
];

export const createOrderValidation = [
  body('internshipId').isUUID().withMessage('A valid internshipId is required'),
  body('idempotencyKey').isString().isLength({ min: 8, max: 100 }).withMessage('A valid idempotencyKey is required'),
  body('couponCode').optional().isString().isLength({ max: 40 }),
  body('installments').optional().isInt({ min: 2, max: 6 }).withMessage('installments must be between 2 and 6'),
  body('paymentMethod').optional().isIn(['ONLINE', 'MANUAL']).withMessage('paymentMethod must be ONLINE or MANUAL'),
];

export const verifyPaymentValidation = [
  body('paymentId').isUUID(),
  body('gatewayOrderId').isString().notEmpty(),
  body('gatewayPaymentId').isString().notEmpty(),
  body('gatewaySignature').isString().notEmpty(),
  body('method').optional().isIn(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'BANK_TRANSFER', 'QR', 'OFFLINE', 'UNKNOWN']),
];

export const refundValidation = [
  body('paymentId').isUUID(),
  body('type').optional().isIn(['FULL', 'PARTIAL']),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('reason').optional().isString().isLength({ max: 500 }),
];

export const couponValidation = [
  body('code').trim().isLength({ min: 3, max: 30 }).withMessage('Coupon code must be 3-30 characters'),
  body('discountType').isIn(['PERCENTAGE', 'FLAT']),
  body('discountValue').isFloat({ min: 0.01 }),
];

export const paymentAccountValidation = [
  body('type').isIn(['UPI', 'BANK_ACCOUNT', 'GATEWAY_KEYS']),
  body('label').trim().isLength({ min: 2, max: 100 }),
];
