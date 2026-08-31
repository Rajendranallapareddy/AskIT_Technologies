import { notificationApi } from '../api/endpoints';

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// Registers the service worker (if needed), asks the browser for
// permission, subscribes with the server's VAPID public key, and saves
// the subscription so the backend can push to this device. Returns false
// (never throws) if push isn't supported, isn't configured on the server,
// or the user declines permission — callers should just treat that as
// "push stays off" rather than a hard error.
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const { data } = await notificationApi.pushPublicKey();
  const publicKey = data?.data?.publicKey;
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await notificationApi.pushSubscribe(subscription.toJSON() as any);
  return true;
}

export async function disablePush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await notificationApi.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
