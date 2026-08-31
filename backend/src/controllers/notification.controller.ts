import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { notifyUsers } from '../services/notify.service';
import { saveSubscription, removeSubscription, getPushPublicKey, isPushConfigured } from '../services/push.service';

// ---------------------------------------------------------------------------
// SHARED NOTIFICATIONS (any authenticated role — student, trainer, admin) —
// backs the notification bell: list, unread count, mark read/all-read, and
// web push subscription management.
// ---------------------------------------------------------------------------

// GET /api/notifications?page=&limit=
export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({ success: true, data: notifications, meta: { unreadCount, page } });
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/unread-count
export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notifications/:id/read
export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== req.user!.id) throw new AppError('Notification not found', 404);
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notifications/read-all
export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/push/public-key — the VAPID public key the
// frontend needs to create a PushSubscription. Returns null if the server
// hasn't been configured with push credentials (feature stays optional).
export async function pushPublicKey(_req: AuthRequest, res: Response) {
  res.json({ success: true, data: { publicKey: isPushConfigured() ? getPushPublicKey() : null } });
}

// POST /api/notifications/push/subscribe
// Body: { subscription: { endpoint, keys: { p256dh, auth } } }
export async function pushSubscribe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new AppError('A valid push subscription is required', 400);
    }
    await saveSubscription(req.user!.id, subscription);
    res.status(201).json({ success: true, message: 'Push notifications enabled' });
  } catch (err) {
    next(err);
  }
}

// POST /api/notifications/push/unsubscribe
// Body: { endpoint }
export async function pushUnsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { endpoint } = req.body;
    if (endpoint) await removeSubscription(endpoint);
    res.json({ success: true, message: 'Push notifications disabled' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notifications/broadcast - send a system notification to all active users
export async function broadcastNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message, role } = req.body;
    const where: any = { isActive: true };
    if (role) where.role = role;

    const users = await prisma.user.findMany({ where, select: { id: true } });
    if (users.length) {
      await notifyUsers(users.map((u) => u.id), { type: 'ANNOUNCEMENT', title, message, link: '/notifications' });
    }

    res.status(201).json({ success: true, message: `Notification sent to ${users.length} user(s)` });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/notifications/pending-summary - counts admins care about
export async function pendingSummary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [pendingRegistrations, newContacts, pendingCertificates] = await Promise.all([
      prisma.registration.count({ where: { status: 'PENDING' } }),
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
      prisma.certificate.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ success: true, data: { pendingRegistrations, newContacts, pendingCertificates } });
  } catch (err) {
    next(err);
  }
}
