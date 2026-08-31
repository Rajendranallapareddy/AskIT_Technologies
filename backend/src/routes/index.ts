import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import trainerRoutes from './trainer.routes';
import adminRoutes from './admin.routes';
import superadminRoutes from './superadmin.routes';
import publicRoutes from './public.routes';
import paymentRoutes from './payment.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trainer', trainerRoutes);
router.use('/admin', adminRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/public', publicRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (_req, res) => res.json({ success: true, message: 'ASK IT API is healthy' }));

export default router;
