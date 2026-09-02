import { prisma } from '../config/db';

import { emitToUser } from './realtime.service';

import { sendPushToUser } from './push.service';

import { sendMail } from './email.service';

import { sendWhatsApp } from './whatsapp.service';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'https://www.askittechnologies.com';

export type NotifyType =
  | 'REGISTRATION'
  | 'ATTENDANCE'
  | 'ANNOUNCEMENT'
  | 'CERTIFICATE'
  | 'SYSTEM'
  | 'PAYMENT';

export interface NotifyInput {
  userId: string;

  type: NotifyType;

  title: string;

  message: string;

  link?: string;

  /**
   * Normal browser/mobile push notification.
   *
   * Defaults to true.
   *
   * This is the notification that can appear in the user's
   * Android/Chrome notification panel even when the website
   * is not currently open, provided the user has granted
   * notification permission and has a valid push subscription.
   */
  push?: boolean;

  /**
   * Optional external channels.
   *
   * These are disabled by default for normal notifications.
   * Individual calls can enable them for important events.
   */
  whatsapp?: boolean;

  email?: boolean;
}

interface ResolvedUser {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  role: string;
  isActive: boolean;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function absoluteLink(link?: string): string | undefined {
  if (!link) {
    return undefined;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  return `${FRONTEND_URL.replace(/\/$/, '')}/${link.replace(
    /^\//,
    ''
  )}`;
}

function notificationEmailHtml(
  fullName: string,
  title: string,
  message: string,
  link?: string
): string {
  const url = absoluteLink(link);

  const safeName = escapeHtml(fullName);
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(
    /\n/g,
    '<br />'
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f4f7fb;
          font-family:Arial,Helvetica,sans-serif;
          color:#1f2937;
        "
      >
        <div
          style="
            width:100%;
            padding:30px 15px;
            box-sizing:border-box;
          "
        >
          <div
            style="
              max-width:620px;
              margin:0 auto;
              background:#ffffff;
              border-radius:14px;
              overflow:hidden;
              box-shadow:0 5px 20px rgba(15,29,69,0.08);
            "
          >
            <div
              style="
                background:#0f1d45;
                padding:26px 20px;
                text-align:center;
              "
            >
              <div
                style="
                  color:#ffffff;
                  font-size:25px;
                  font-weight:800;
                  letter-spacing:0.2px;
                "
              >
                Ask<span style="color:#3b82f6;">IT</span>
                Technologies
              </div>

              <div
                style="
                  color:#cbd5e1;
                  font-size:11px;
                  margin-top:7px;
                  letter-spacing:1.1px;
                "
              >
                LEARN TODAY | GROW TOMORROW | SUCCEED ALWAYS
              </div>
            </div>

            <div
              style="
                padding:30px 28px;
              "
            >
              <p
                style="
                  margin:0 0 18px;
                  font-size:15px;
                  line-height:1.6;
                "
              >
                Dear ${safeName},
              </p>

              <h2
                style="
                  margin:0 0 15px;
                  color:#0f1d45;
                  font-size:21px;
                  line-height:1.4;
                "
              >
                ${safeTitle}
              </h2>

              <div
                style="
                  color:#4b5563;
                  font-size:15px;
                  line-height:1.75;
                "
              >
                ${safeMessage}
              </div>

              ${
                url
                  ? `
                    <div
                      style="
                        margin-top:26px;
                      "
                    >
                      <a
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          display:inline-block;
                          background:#2563eb;
                          color:#ffffff;
                          padding:12px 22px;
                          border-radius:8px;
                          text-decoration:none;
                          font-size:14px;
                          font-weight:700;
                        "
                      >
                        View Details
                      </a>
                    </div>
                  `
                  : ''
              }

              <p
                style="
                  margin:30px 0 0;
                  color:#9ca3af;
                  font-size:12px;
                  line-height:1.6;
                "
              >
                This is an automated notification from AskIT
                Technologies.
              </p>
            </div>

            <div
              style="
                border-top:1px solid #e5e7eb;
                padding:18px;
                text-align:center;
                color:#6b7280;
                font-size:12px;
              "
            >
              AskIT Technologies
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function notificationWhatsAppText(
  title: string,
  message: string,
  link?: string
): string {
  const url = absoluteLink(link);

  return (
    `*AskIT Technologies*\n\n` +
    `*${title}*\n\n` +
    `${message}` +
    `${url ? `\n\n${url}` : ''}` +
    `\n\n— AskIT Technologies`
  );
}

/**
 * External notification channels.
 *
 * These never throw back into the main business flow.
 * A mail / WhatsApp failure must never cause a registration
 * or payment operation to fail.
 */
async function dispatchExternal(
  user: ResolvedUser | null | undefined,
  input: {
    title: string;
    message: string;
    link?: string;
    whatsapp?: boolean;
    email?: boolean;
  }
): Promise<void> {
  if (!user) {
    return;
  }

  const tasks: Promise<unknown>[] = [];

  if (input.email && user.email) {
    tasks.push(
      sendMail({
        to: user.email,

        subject: `${input.title} | AskIT Technologies`,

        html: notificationEmailHtml(
          user.fullName,
          input.title,
          input.message,
          input.link
        ),
      }).catch((error) => {
        console.error(
          `[Notification Email] Failed for ${user.email}:`,
          error
        );
      })
    );
  }

  if (
    input.whatsapp &&
    user.mobileNumber
  ) {
    tasks.push(
      sendWhatsApp({
        to: user.mobileNumber,

        body: notificationWhatsAppText(
          input.title,
          input.message,
          input.link
        ),
      }).catch((error) => {
        console.error(
          `[Notification WhatsApp] Failed for ${user.mobileNumber}:`,
          error
        );
      })
    );
  }

  if (tasks.length) {
    await Promise.allSettled(tasks);
  }
}

/**
 * Deliver normal browser/mobile push notification.
 *
 * This is best-effort. It does not break the website action
 * if a user's browser subscription has expired or push is not
 * configured.
 */
async function dispatchPush(
  userId: string,
  input: {
    title: string;
    message: string;
    link?: string;
  }
): Promise<void> {
  try {
    await sendPushToUser(userId, {
      title: input.title,

      body: input.message,

      url:
        input.link ||
        '/notifications',
    });
  } catch (error) {
    console.error(
      `[Push Notification] Failed for user ${userId}:`,
      error
    );
  }
}

/**
 * Notify one AskIT user.
 *
 * Delivery:
 *
 * 1. Database notification
 * 2. Real-time website notification
 * 3. Browser/mobile push notification
 * 4. Optional email
 * 5. Optional WhatsApp
 */
export async function notifyUser(
  input: NotifyInput
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: input.userId,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        mobileNumber: true,
        role: true,
        isActive: true,
      },
    });

  if (!user) {
    console.warn(
      `[Notification] User ${input.userId} not found`
    );

    return null;
  }

  if (!user.isActive) {
    console.warn(
      `[Notification] User ${input.userId} is inactive`
    );

    return null;
  }

  const notification =
    await prisma.notification.create({
      data: {
        userId: input.userId,

        type: input.type as any,

        title: input.title,

        message: input.message,

        link:
          input.link ||
          null,
      },
    });

  /**
   * Immediately update the website notification bell
   * for a logged-in user.
   */
  try {
    emitToUser(
      input.userId,
      'notification:new',
      notification
    );
  } catch (error) {
    console.error(
      '[Realtime Notification] Failed:',
      error
    );
  }

  const backgroundTasks:
    Promise<unknown>[] = [];

  /**
   * Push defaults to true.
   *
   * This is the normal phone notification requested for AskIT.
   */
  if (input.push !== false) {
    backgroundTasks.push(
      dispatchPush(
        input.userId,
        input
      )
    );
  }

  if (
    input.email ||
    input.whatsapp
  ) {
    backgroundTasks.push(
      dispatchExternal(
        user,
        input
      )
    );
  }

  if (backgroundTasks.length) {
    await Promise.allSettled(
      backgroundTasks
    );
  }

  return notification;
}

/**
 * Notify multiple users.
 *
 * Used primarily for:
 *
 * - announcements
 * - batch notifications
 * - course-wide notifications
 * - student groups
 */
export async function notifyUsers(
  userIds: string[],
  input: Omit<
    NotifyInput,
    'userId'
  >
) {
  const uniqueIds = Array.from(
    new Set(
      userIds.filter(Boolean)
    )
  );

  if (
    uniqueIds.length === 0
  ) {
    return [];
  }

  /**
   * Load only valid active users.
   *
   * This prevents notifications from being created for
   * deleted/inactive accounts.
   */
  const users =
    await prisma.user.findMany({
      where: {
        id: {
          in: uniqueIds,
        },

        isActive: true,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        mobileNumber: true,
        role: true,
        isActive: true,
      },
    });

  if (!users.length) {
    return [];
  }

  const activeIds =
    users.map(
      (user) => user.id
    );

  /**
   * Save website notifications.
   */
  await prisma.notification.createMany({
    data: activeIds.map(
      (userId) => ({
        userId,

        type:
          input.type as any,

        title:
          input.title,

        message:
          input.message,

        link:
          input.link ||
          null,
      })
    ),
  });

  /**
   * Fetch the newly-created notifications.
   *
   * This allows each real-time socket event to include
   * the actual database notification id.
   */
  const created =
    await prisma.notification.findMany({
      where: {
        userId: {
          in: activeIds,
        },

        title:
          input.title,

        message:
          input.message,
      },

      orderBy: {
        createdAt: 'desc',
      },

      take:
        activeIds.length,
    });

  const usersById =
    new Map<
      string,
      ResolvedUser
    >();

  for (const user of users) {
    usersById.set(
      user.id,
      user
    );
  }

  /**
   * Map one latest notification per user.
   *
   * createMany + findMany could theoretically find older
   * notifications with identical title/message. We prevent
   * duplicate socket delivery by keeping only the latest row
   * per user.
   */
  const notificationByUser =
    new Map<
      string,
      (typeof created)[number]
    >();

  for (const notification of created) {
    if (
      !notificationByUser.has(
        notification.userId
      )
    ) {
      notificationByUser.set(
        notification.userId,
        notification
      );
    }
  }

  const deliveryTasks:
    Promise<unknown>[] = [];

  for (const userId of activeIds) {
    const notification =
      notificationByUser.get(
        userId
      );

    if (notification) {
      try {
        emitToUser(
          userId,
          'notification:new',
          notification
        );
      } catch (error) {
        console.error(
          '[Realtime Notification] Failed:',
          error
        );
      }
    }

    /**
     * Mobile / browser push.
     */
    if (input.push !== false) {
      deliveryTasks.push(
        dispatchPush(
          userId,
          input
        )
      );
    }

    /**
     * Optional external delivery.
     */
    if (
      input.email ||
      input.whatsapp
    ) {
      deliveryTasks.push(
        dispatchExternal(
          usersById.get(
            userId
          ),
          input
        )
      );
    }
  }

  if (deliveryTasks.length) {
    await Promise.allSettled(
      deliveryTasks
    );
  }

  return created;
}

/**
 * Notify all active Super Admins + Sub Admins.
 *
 * Important admin events automatically get:
 *
 * - Website notification
 * - Real-time notification
 * - Mobile/browser push
 * - Email
 *
 * WhatsApp remains optional because normal phone push is
 * the main notification mechanism.
 */
export async function notifyAdmins(
  input: Omit<
    NotifyInput,
    'userId'
  >
) {
  const admins =
    await prisma.user.findMany({
      where: {
        role: {
          in: [
            'SUPER_ADMIN',
            'SUB_ADMIN',
          ],
        },

        isActive: true,
      },

      select: {
        id: true,
      },
    });

  if (!admins.length) {
    console.warn(
      '[Notification] No active Super Admin/Sub Admin accounts found'
    );

    return [];
  }

  return notifyUsers(
    admins.map(
      (admin) =>
        admin.id
    ),
    {
      ...input,

      /**
       * Admin alerts should normally reach the phone.
       */
      push:
        input.push ??
        true,

      /**
       * Your requirement says Super Admin/Sub Admin should
       * also receive important website activity on their
       * registered email.
       */
      email:
        input.email ??
        true,

      /**
       * Normal phone notification is Web Push, not WhatsApp.
       *
       * A caller can explicitly set whatsapp:true when needed.
       */
      whatsapp:
        input.whatsapp ??
        false,
    }
  );
}

/**
 * Convenience method specifically for important student
 * notifications.
 *
 * Use this when payment approval, certificate issue,
 * registration approval, important announcement, etc.
 * should reach the student's phone and email.
 */
export async function notifyStudentImportant(
  input: NotifyInput
) {
  return notifyUser({
    ...input,

    push:
      input.push ??
      true,

    email:
      input.email ??
      true,
  });
}

/**
 * Notify every active registered student.
 *
 * Useful for global announcements.
 */
export async function notifyAllStudents(
  input: Omit<
    NotifyInput,
    'userId'
  >
) {
  const students =
    await prisma.user.findMany({
      where: {
        role: 'USER',

        isActive: true,
      },

      select: {
        id: true,
      },
    });

  if (!students.length) {
    return [];
  }

  return notifyUsers(
    students.map(
      (student) =>
        student.id
    ),
    input
  );
}