import { prisma } from '../config/db';

// Web push is entirely optional: if no VAPID keys are configured, every
// function here quietly no-ops instead of throwing, exactly like the
// existing email/WhatsApp services do when their credentials are missing.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'mailto:info@askittechnologies.com';

let webpush: typeof import('web-push') | null = null;
let configured = false;

function ensureConfigured() {
  if (configured) return webpush;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webpush = require('web-push');
    webpush!.setVapidDetails(VAPID_CONTACT_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
    return webpush;
  } catch (err) {
    console.warn('web-push not installed — push notifications are disabled. Run `npm install` in backend/.');
    return null;
  }
}

export function isPushConfigured() {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getPushPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// Best-effort — sends to every device the user has subscribed on, and
// silently prunes any subscription the browser has revoked (410 Gone / 404).
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const wp = ensureConfigured();
  if (!wp) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp!.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Push notification failed:', err?.message || err);
        }
      }
    })
  );
}

export async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; url?: string }) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
