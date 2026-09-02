import {
  Response,
  NextFunction,
} from 'express';

import { prisma } from '../config/db';

import {
  AuthRequest,
} from '../middleware/auth.middleware';

import {
  AppError,
} from '../middleware/error.middleware';

import {
  notifyUsers,
} from '../services/notify.service';

// ---------------------------------------------------------------------------
// GET MY NOTIFICATIONS
// GET /api/notifications
// ---------------------------------------------------------------------------

export async function getMyNotifications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      req.user!.id;

    const [
      notifications,
      unreadCount,
    ] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: 'desc',
        },

        take: 100,
      }),

      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return res.json({
      success: true,

      data:
        notifications,

      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// ---------------------------------------------------------------------------

export async function markNotificationRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const notificationId =
      req.params.id;

    const notification =
      await prisma.notification.findUnique({
        where: {
          id: notificationId,
        },
      });

    if (
      !notification ||
      notification.userId !==
        req.user!.id
    ) {
      throw new AppError(
        'Notification not found',
        404
      );
    }

    const updated =
      await prisma.notification.update({
        where: {
          id: notification.id,
        },

        data: {
          isRead: true,
        },
      });

    return res.json({
      success: true,

      message:
        'Notification marked as read',

      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ---------------------------------------------------------------------------

export async function markAllNotificationsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result =
      await prisma.notification.updateMany({
        where: {
          userId:
            req.user!.id,

          isRead: false,
        },

        data: {
          isRead: true,
        },
      });

    return res.json({
      success: true,

      message:
        'All notifications marked as read',

      data: {
        updatedCount:
          result.count,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PUSH SUBSCRIPTION
// POST /api/notifications/push/subscribe
//
// Stores the browser/device Push API subscription.
//
// One user can have multiple devices:
// - Android Chrome
// - Laptop Chrome
// - Desktop Edge
// etc.
// ---------------------------------------------------------------------------

export async function subscribePush(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      endpoint,
      keys,
    } = req.body;

    if (
      !endpoint ||
      typeof endpoint !==
        'string' ||
      !keys?.p256dh ||
      !keys?.auth
    ) {
      throw new AppError(
        'Invalid push subscription',
        400
      );
    }

    const subscription =
      await prisma.pushSubscription.upsert({
        where: {
          endpoint:
            endpoint.trim(),
        },

        update: {
          // If the same browser subscription is now
          // associated with another login, ownership
          // is safely updated.
          userId:
            req.user!.id,

          p256dh:
            String(
              keys.p256dh
            ),

          auth:
            String(
              keys.auth
            ),
        },

        create: {
          userId:
            req.user!.id,

          endpoint:
            endpoint.trim(),

          p256dh:
            String(
              keys.p256dh
            ),

          auth:
            String(
              keys.auth
            ),
        },
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          'Mobile notifications enabled successfully',

        data: {
          id:
            subscription.id,
        },
      });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// UNSUBSCRIBE PUSH
// POST /api/notifications/push/unsubscribe
// ---------------------------------------------------------------------------

export async function unsubscribePush(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      endpoint,
    } = req.body;

    if (
      !endpoint ||
      typeof endpoint !==
        'string'
    ) {
      throw new AppError(
        'Push subscription endpoint is required',
        400
      );
    }

    const result =
      await prisma.pushSubscription.deleteMany({
        where: {
          userId:
            req.user!.id,

          endpoint:
            endpoint.trim(),
        },
      });

    return res.json({
      success: true,

      message:
        'Mobile notifications disabled',

      data: {
        removed:
          result.count,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// ADMIN PENDING SUMMARY
// GET /api/admin/notifications/pending-summary
//
// Used by Super Admin/Sub Admin dashboard to quickly show pending work.
// ---------------------------------------------------------------------------

export async function pendingSummary(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const [
      pendingRegistrations,
      pendingPayments,
      refundRequests,
      contactRequests,
    ] =
      await Promise.all([
        prisma.registration.count({
          where: {
            status: {
              in: [
                'PENDING',
                'AWAITING_PAYMENT',
              ],
            },
          },
        }),

        prisma.payment.count({
          where: {
            status:
              'PENDING_APPROVAL',
          },
        }),

        prisma.refund.count({
          where: {
            status:
              'REQUESTED',
          },
        }),

        prisma.contactRequest.count({
          where: {
            status:
              'NEW',
          },
        }),
      ]);

    const total =
      pendingRegistrations +
      pendingPayments +
      refundRequests +
      contactRequests;

    return res.json({
      success: true,

      data: {
        pendingRegistrations,

        pendingPayments,

        refundRequests,

        contactRequests,

        total,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// ADMIN BROADCAST NOTIFICATION
// POST /api/admin/notifications/broadcast
//
// Supports:
// - specific user IDs
// - all students
// - trainers
// - sub admins
// - super admins
//
// Default recipient group = active students.
//
// Push notification:
// normal Android / Chrome notification panel notification.
//
// Email:
// optional depending on request.
// ---------------------------------------------------------------------------

export async function broadcastNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      title,
      message,
      role,
      userIds,
      link,
      push = true,
      email = false,
      whatsapp = false,
    } = req.body;

    const cleanTitle =
      String(
        title || ''
      ).trim();

    const cleanMessage =
      String(
        message || ''
      ).trim();

    if (!cleanTitle) {
      throw new AppError(
        'Notification title is required',
        400
      );
    }

    if (!cleanMessage) {
      throw new AppError(
        'Notification message is required',
        400
      );
    }

    if (
      cleanTitle.length >
      200
    ) {
      throw new AppError(
        'Notification title is too long',
        400
      );
    }

    if (
      cleanMessage.length >
      5000
    ) {
      throw new AppError(
        'Notification message is too long',
        400
      );
    }

    let recipients: {
      id: string;
    }[] = [];

    // -----------------------------------------------------------------------
    // SPECIFIC USER IDs
    // -----------------------------------------------------------------------

    if (
      Array.isArray(
        userIds
      ) &&
      userIds.length > 0
    ) {
      const ids =
        userIds
          .map(
            (
              value:
                unknown
            ) =>
              String(
                value
              ).trim()
          )
          .filter(Boolean);

      recipients =
        await prisma.user.findMany({
          where: {
            id: {
              in: ids,
            },

            isActive: true,
          },

          select: {
            id: true,
          },
        });
    }

    // -----------------------------------------------------------------------
    // ROLE-BASED BROADCAST
    // -----------------------------------------------------------------------

    else if (role) {
      const requestedRole =
        String(role)
          .trim()
          .toUpperCase();

      const allowedRoles = [
        'USER',
        'TRAINER',
        'SUB_ADMIN',
        'SUPER_ADMIN',
      ];

      if (
        !allowedRoles.includes(
          requestedRole
        )
      ) {
        throw new AppError(
          'Invalid notification recipient role',
          400
        );
      }

      recipients =
        await prisma.user.findMany({
          where: {
            role:
              requestedRole as any,

            isActive: true,
          },

          select: {
            id: true,
          },
        });
    }

    // -----------------------------------------------------------------------
    // DEFAULT = ACTIVE STUDENTS
    // -----------------------------------------------------------------------

    else {
      recipients =
        await prisma.user.findMany({
          where: {
            role:
              'USER',

            isActive:
              true,
          },

          select: {
            id: true,
          },
        });
    }

    if (
      recipients.length ===
      0
    ) {
      throw new AppError(
        'No active recipients found',
        404
      );
    }

    // Remove duplicate IDs.
    const recipientIds = [
      ...new Set(
        recipients.map(
          (user) =>
            user.id
        )
      ),
    ];

    await notifyUsers(
      recipientIds,
      {
        type:
          'SYSTEM',

        title:
          cleanTitle,

        message:
          cleanMessage,

        link:
          link
            ? String(
                link
              ).trim()
            : '/notifications',

        // Normal mobile/browser push
        push:
          push !== false,

        // Optional email
        email:
          email === true,

        // Optional WhatsApp
        whatsapp:
          whatsapp === true,
      }
    );

    return res.json({
      success: true,

      message:
        `Notification sent successfully to ${recipientIds.length} user${
          recipientIds.length ===
          1
            ? ''
            : 's'
        }.`,

      data: {
        recipientCount:
          recipientIds.length,

        push:
          push !== false,

        email:
          email === true,

        whatsapp:
          whatsapp === true,
      },
    });
  } catch (error) {
    next(error);
  }
}