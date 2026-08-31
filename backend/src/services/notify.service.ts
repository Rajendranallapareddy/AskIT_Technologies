import { prisma } from '../config/db';
import { emitToUser } from './realtime.service';
import { sendPushToUser } from './push.service';
import { sendMail } from './email.service';
import { sendWhatsApp } from './whatsapp.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export type NotifyType = 'REGISTRATION' | 'ATTENDANCE' | 'ANNOUNCEMENT' | 'CERTIFICATE' | 'SYSTEM' | 'PAYMENT';

export interface NotifyInput {
  userId: string;
  type: NotifyType;
  title: string;
  message: string;
  link?: string;
  // In-app (DB + socket) already tells an ONLINE user immediately, so a
  // push notification is mainly useful for someone who isn't currently on
  // the site. Defaults to true — push is best-effort and no-ops entirely
  // if the user has no subscriptions or VAPID isn't configured, so sending
  // it "just in case" never duplicates anything the user actively sees
  // in-app right now — they simply won't get a push if a tab is open and
  // focused (handled client-side), or the OS will just show one bubble.
  push?: boolean;
  // WhatsApp and email are opt-in per call (default false) rather than
  // "just in case" like push — they reach a phone/inbox outside the app
  // entirely, so callers should only set these for notifications that are
  // important enough to justify that (announcements, payment reminders),
  // not routine chatter. Both are best-effort: if Twilio/SMTP aren't
  // configured, whatsapp.service/email.service just log instead of
  // sending, same as everywhere else in the app.
  whatsapp?: boolean;
  email?: boolean;
}

function absoluteLink(link?: string) {
  if (!link) return undefined;
  if (/^https?:\/\//i.test(link)) return link;
  return `${FRONTEND_URL}${link.startsWith('/') ? link : `/${link}`}`;
}

function notificationEmailHtml(title: string, message: string, link?: string) {
  const url = absoluteLink(link);
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <div style="background:#0f1d45;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#fff;">ASK<span style="color:#f97316;">IT</span></span>
      <p style="color:#cbd5f5;font-size:11px;margin:4px 0 0 0;letter-spacing:1px;">TECHNOLOGIES</p>
    </div>
    <div style="padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
      <h2 style="color:#1e3a8a;margin-top:0;">${title}</h2>
      <p style="white-space:pre-line;">${message}</p>
      ${url ? `<a href="${url}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;margin:16px 0;">View Details</a>` : ''}
      <p style="margin-top:24px;color:#999;font-size:12px;">— ASK IT Technologies</p>
    </div>
  </div>`;
}

function notificationWhatsAppText(title: string, message: string, link?: string) {
  const url = absoluteLink(link);
  return `*${title}*\n\n${message}${url ? `\n\n${url}` : ''}\n\n— ASK IT Technologies`;
}

// Fires the opt-in external channels for one already-resolved user record.
// Never throws — best-effort, same contract as push.
function dispatchExternal(
  user: { email: string; mobileNumber: string } | null | undefined,
  input: { title: string; message: string; link?: string; whatsapp?: boolean; email?: boolean }
) {
  if (!user) return;
  if (input.email) {
    sendMail({ to: user.email, subject: input.title, html: notificationEmailHtml(input.title, input.message, input.link) }).catch(() => {});
  }
  if (input.whatsapp) {
    sendWhatsApp({ to: user.mobileNumber, body: notificationWhatsAppText(input.title, input.message, input.link) }).catch(() => {});
  }
}

// The single place every part of the app should go through to notify a
// user — replaces scattered `prisma.notification.create(...)` calls so
// real-time delivery (bell badge updates instantly, no refresh), push
// delivery (reaches the user even off-site), and WhatsApp/email delivery
// are never forgotten for a new notification type.
export async function notifyUser(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as any,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });

  emitToUser(input.userId, 'notification:new', notification);

  if (input.push !== false) {
    sendPushToUser(input.userId, { title: input.title, body: input.message, url: input.link }).catch(() => {});
  }

  if (input.whatsapp || input.email) {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, mobileNumber: true } });
    dispatchExternal(user, input);
  }

  return notification;
}

export async function notifyUsers(userIds: string[], input: Omit<NotifyInput, 'userId'>) {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return [];

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type as any,
      title: input.title,
      message: input.message,
      link: input.link,
    })),
  });

  // createMany doesn't return rows — fetch what we just inserted for this
  // batch (by matching users + timestamp window) so we can still emit
  // real-time events with a real notification id.
  const created = await prisma.notification.findMany({
    where: { userId: { in: uniqueIds }, title: input.title, message: input.message },
    orderBy: { createdAt: 'desc' },
    take: uniqueIds.length,
  });

  // Only look up contact details when an external channel was actually
  // requested — most notifications (registration, certificates, etc.)
  // don't set these flags and skip this query entirely.
  const usersById = new Map<string, { email: string; mobileNumber: string }>();
  if (input.whatsapp || input.email) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, email: true, mobileNumber: true },
    });
    for (const u of users) usersById.set(u.id, u);
  }

  for (const n of created) {
    emitToUser(n.userId, 'notification:new', n);
    if (input.push !== false) {
      sendPushToUser(n.userId, { title: input.title, body: input.message, url: input.link }).catch(() => {});
    }
    if (input.whatsapp || input.email) {
      dispatchExternal(usersById.get(n.userId), input);
    }
  }

  return created;
}

// Convenience for admin-facing alerts (payment submitted, refund requested,
// etc.) — notifies every active Super Admin / Sub Admin.
export async function notifyAdmins(input: Omit<NotifyInput, 'userId'>) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'SUB_ADMIN'] }, isActive: true },
    select: { id: true },
  });
  return notifyUsers(admins.map((a) => a.id), input);
}
