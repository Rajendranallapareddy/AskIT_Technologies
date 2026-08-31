import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.unreadCount);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

router.get('/push/public-key', notificationController.pushPublicKey);
router.post('/push/subscribe', notificationController.pushSubscribe);
router.post('/push/unsubscribe', notificationController.pushUnsubscribe);

export default router;
