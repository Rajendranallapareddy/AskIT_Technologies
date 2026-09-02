import { Router } from 'express';

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribePush,
  unsubscribePush,
} from '../controllers/notification.controller';

import {
  authenticate,
} from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  getMyNotifications
);

router.patch(
  '/read-all',
  markAllNotificationsRead
);

router.patch(
  '/:id/read',
  markNotificationRead
);

router.post(
  '/push/subscribe',
  subscribePush
);

router.post(
  '/push/unsubscribe',
  unsubscribePush
);

export default router;