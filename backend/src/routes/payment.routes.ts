import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import * as refundController from '../controllers/refund.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { paymentRateLimiter } from '../middleware/rateLimit.middleware';
import { createOrderValidation, verifyPaymentValidation } from '../utils/validators';
import { body } from 'express-validator';

const router = Router();

// --- Public (no auth) ---
router.get('/verify-receipt/:token', paymentController.verifyReceiptPublic);

// --- Authenticated (student) ---
router.use(authenticate);

router.post('/create-order', paymentRateLimiter, createOrderValidation, validate, paymentController.createOrder);
router.post('/verify', paymentRateLimiter, verifyPaymentValidation, validate, paymentController.verifyPayment);
router.post('/failure', body('paymentId').isUUID(), validate, paymentController.reportFailure);

router.get('/history', paymentController.getPaymentHistory);
router.get('/refunds', refundController.getMyRefunds);
router.get('/receipts/:paymentId/download', paymentController.downloadReceipt);
router.post('/:id/refund-request', body('reason').optional().isString(), validate, paymentController.requestRefund);

// Installments — literal paths registered before the bare '/:id' route
// below so Express doesn't greedily match "installments" as a payment id.
router.get('/installments/my', paymentController.getMyInstallmentPlans);
router.post('/installments/:paymentId/pay', paymentRateLimiter, paymentController.payInstallment);

// Manual payments (UPI QR / bank transfer)
router.get('/manual-accounts', paymentController.getManualAccounts);
router.put('/:id/switch-to-manual', paymentRateLimiter, paymentController.switchToManual);
router.post('/:id/submit-reference', body('reference').isString().isLength({ min: 3, max: 100 }), validate, paymentController.submitPaymentReference);

router.get('/:id', paymentController.getPaymentById);

export default router;
