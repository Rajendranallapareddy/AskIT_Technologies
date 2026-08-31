import { Router } from 'express';
import * as superadminController from '../controllers/superadmin.controller';
import * as paymentAccountController from '../controllers/paymentAccount.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { paymentAccountValidation } from '../utils/validators';
import { validate } from '../middleware/validation.middleware';
import { uploadQrCode } from '../services/upload.service';

const router = Router();

// Every route here is Super Admin exclusive.
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.put('/profile', superadminController.updateOwnProfile);

router.get('/sub-admins', superadminController.listSubAdmins);
router.post('/sub-admins', superadminController.createSubAdmin);
router.put('/sub-admins/:id', superadminController.updateSubAdmin);
router.put('/sub-admins/:id/permissions', superadminController.updateSubAdminPermissions);
router.put('/sub-admins/:id/activate', superadminController.activateSubAdmin);
router.put('/sub-admins/:id/deactivate', superadminController.deactivateSubAdmin);
router.delete('/sub-admins/:id', superadminController.deleteSubAdmin);
router.put('/sub-admins/:id/reset-password', superadminController.resetSubAdminPassword);
router.get('/sub-admins/:id/activity', superadminController.subAdminActivity);

router.get('/activity-logs', superadminController.listActivityLogs);

// Payment accounts hold bank details and gateway secrets — kept Super Admin
// exclusive regardless of any Sub Admin's granted permissions.
router.get('/payment-accounts', paymentAccountController.listPaymentAccounts);
router.post('/payment-accounts', uploadQrCode.single('qrCode'), paymentAccountValidation, validate, paymentAccountController.createPaymentAccount);
router.put('/payment-accounts/:id', uploadQrCode.single('qrCode'), paymentAccountController.updatePaymentAccount);
router.put('/payment-accounts/:id/toggle', paymentAccountController.togglePaymentAccount);
router.delete('/payment-accounts/:id', paymentAccountController.deletePaymentAccount);

export default router;
