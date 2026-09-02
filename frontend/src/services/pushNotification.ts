import {
  notificationApi,
} from '../api/endpoints';

// ---------------------------------------------------------------------------
// BASE64 → UINT8ARRAY
//
// PushManager requires the VAPID public key as an ArrayBuffer-compatible
// Uint8Array.
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(
  base64String: string
): Uint8Array {
  const padding =
    '='.repeat(
      (
        4 -
        (base64String.length %
          4)
      ) % 4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(
        /-/g,
        '+'
      )
      .replace(
        /_/g,
        '/'
      );

  const rawData =
    window.atob(
      base64
    );

  const outputArray =
    new Uint8Array(
      rawData.length
    );

  for (
    let i = 0;
    i <
    rawData.length;
    i++
  ) {
    outputArray[i] =
      rawData.charCodeAt(
        i
      );
  }

  return outputArray;
}

// ---------------------------------------------------------------------------
// SUPPORT CHECK
// ---------------------------------------------------------------------------

export function isPushSupported(): boolean {
  return (
    typeof window !==
      'undefined' &&
    'serviceWorker' in
      navigator &&
    'PushManager' in
      window &&
    'Notification' in
      window
  );
}

// ---------------------------------------------------------------------------
// GET CURRENT PERMISSION
// ---------------------------------------------------------------------------

export function getPushPermission():
  | NotificationPermission
  | 'unsupported' {
  if (
    typeof window ===
      'undefined' ||
    !(
      'Notification' in
      window
    )
  ) {
    return 'unsupported';
  }

  return Notification
    .permission;
}

// ---------------------------------------------------------------------------
// REGISTER SERVICE WORKER
// ---------------------------------------------------------------------------

export async function registerAskITServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (
    !isPushSupported()
  ) {
    throw new Error(
      'Push notifications are not supported on this browser or device.'
    );
  }

  const registration =
    await navigator
      .serviceWorker
      .register(
        '/sw.js',
        {
          scope: '/',
        }
      );

  await navigator
    .serviceWorker
    .ready;

  return registration;
}

// ---------------------------------------------------------------------------
// GET VAPID PUBLIC KEY
//
// Primary source:
// VITE_VAPID_PUBLIC_KEY
//
// Optional fallback:
// backend public-key endpoint.
// ---------------------------------------------------------------------------

async function getVapidPublicKey(): Promise<string> {
  const environmentKey =
    import.meta.env
      .VITE_VAPID_PUBLIC_KEY as
      | string
      | undefined;

  if (
    environmentKey &&
    environmentKey.trim()
  ) {
    return environmentKey.trim();
  }

  try {
    const response =
      await notificationApi
        .pushPublicKey();

    const publicKey =
      response.data?.data
        ?.publicKey ||
      response.data
        ?.publicKey;

    if (
      publicKey &&
      typeof publicKey ===
        'string'
    ) {
      return publicKey.trim();
    }
  } catch (error) {
    console.error(
      '[PUSH] Failed to retrieve VAPID public key:',
      error
    );
  }

  throw new Error(
    'VAPID public key is not configured.'
  );
}

// ---------------------------------------------------------------------------
// ENABLE PUSH NOTIFICATIONS
//
// IMPORTANT:
// Call this after an actual user action such as clicking:
// "Enable Notifications"
// ---------------------------------------------------------------------------

export async function enablePushNotifications(): Promise<PushSubscription> {
  if (
    !isPushSupported()
  ) {
    throw new Error(
      'Push notifications are not supported on this browser or device.'
    );
  }

  let permission =
    Notification.permission;

  if (
    permission ===
    'default'
  ) {
    permission =
      await Notification
        .requestPermission();
  }

  if (
    permission ===
    'denied'
  ) {
    throw new Error(
      'Notifications are blocked. Please allow notifications in your browser settings.'
    );
  }

  if (
    permission !==
    'granted'
  ) {
    throw new Error(
      'Notification permission was not granted.'
    );
  }

  const registration =
    await registerAskITServiceWorker();

  let subscription =
    await registration
      .pushManager
      .getSubscription();

  // -----------------------------------------------------------------------
  // CREATE SUBSCRIPTION
  // -----------------------------------------------------------------------

  if (
    !subscription
  ) {
    const publicKey =
      await getVapidPublicKey();

    const applicationServerKey =
      urlBase64ToUint8Array(
        publicKey
      );

    subscription =
      await registration
        .pushManager
        .subscribe({
          userVisibleOnly:
            true,

          applicationServerKey:
            applicationServerKey as BufferSource,
        });
  }

  // -----------------------------------------------------------------------
  // SAVE SUBSCRIPTION TO ASKIT BACKEND
  //
  // subscription.toJSON() creates:
  //
  // {
  //   endpoint: "...",
  //   keys: {
  //     p256dh: "...",
  //     auth: "..."
  //   }
  // }
  //
  // This matches backend subscribePush().
  // -----------------------------------------------------------------------

  await notificationApi
    .pushSubscribe(
      subscription.toJSON()
    );

  console.log(
    '[PUSH] AskIT mobile notifications enabled.'
  );

  return subscription;
}

// ---------------------------------------------------------------------------
// DISABLE PUSH NOTIFICATIONS
// ---------------------------------------------------------------------------

export async function disablePushNotifications(): Promise<void> {
  if (
    !isPushSupported()
  ) {
    return;
  }

  const registration =
    await navigator
      .serviceWorker
      .getRegistration(
        '/'
      );

  if (
    !registration
  ) {
    return;
  }

  const subscription =
    await registration
      .pushManager
      .getSubscription();

  if (
    !subscription
  ) {
    return;
  }

  const endpoint =
    subscription.endpoint;

  // Remove subscription from backend first.
  try {
    await notificationApi
      .pushUnsubscribe(
        endpoint
      );
  } catch (error) {
    console.error(
      '[PUSH] Backend unsubscribe failed:',
      error
    );
  }

  // Remove browser subscription.
  const unsubscribed =
    await subscription
      .unsubscribe();

  if (
    !unsubscribed
  ) {
    console.warn(
      '[PUSH] Browser could not unsubscribe from push.'
    );
  }

  console.log(
    '[PUSH] AskIT mobile notifications disabled.'
  );
}

// ---------------------------------------------------------------------------
// CHECK WHETHER CURRENT DEVICE IS ALREADY SUBSCRIBED
// ---------------------------------------------------------------------------

export async function isDevicePushSubscribed(): Promise<boolean> {
  if (
    !isPushSupported()
  ) {
    return false;
  }

  try {
    const registration =
      await navigator
        .serviceWorker
        .getRegistration(
          '/'
        );

    if (
      !registration
    ) {
      return false;
    }

    const subscription =
      await registration
        .pushManager
        .getSubscription();

    return Boolean(
      subscription
    );
  } catch (error) {
    console.error(
      '[PUSH] Failed to check subscription:',
      error
    );

    return false;
  }
}

// ---------------------------------------------------------------------------
// REGISTER SERVICE WORKER SILENTLY
//
// This DOES NOT request browser notification permission.
//
// Safe to call when the application starts.
// ---------------------------------------------------------------------------

export async function initialisePushServiceWorker(): Promise<void> {
  if (
    !isPushSupported()
  ) {
    return;
  }

  try {
    await registerAskITServiceWorker();
  } catch (error) {
    console.error(
      '[PUSH] Service worker registration failed:',
      error
    );
  }
}