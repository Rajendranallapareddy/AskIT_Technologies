import {
  useEffect,
  useState,
} from 'react';

import {
  Bell,
  BellOff,
  Loader2,
} from 'lucide-react';

import {
  enablePushNotifications,
  disablePushNotifications,
  getPushPermission,
  isDevicePushSubscribed,
  isPushSupported,
} from '../services/pushNotification';

export default function EnableNotifications() {
  const [supported, setSupported] =
    useState(true);

  const [permission, setPermission] =
    useState<
      NotificationPermission |
      'unsupported'
    >(
      getPushPermission()
    );

  const [subscribed, setSubscribed] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    const loadStatus =
      async () => {
        const pushSupported =
          isPushSupported();

        setSupported(
          pushSupported
        );

        setPermission(
          getPushPermission()
        );

        if (
          pushSupported
        ) {
          const active =
            await isDevicePushSubscribed();

          setSubscribed(
            active
          );
        }
      };

    void loadStatus();
  }, []);

  const handleEnable =
    async () => {
      try {
        setLoading(true);
        setMessage('');

        await enablePushNotifications();

        setPermission(
          getPushPermission()
        );

        setSubscribed(true);

        setMessage(
          'Mobile notifications enabled successfully.'
        );
      } catch (error: any) {
        console.error(
          '[PUSH] Enable notification error:',
          error
        );

        setPermission(
          getPushPermission()
        );

        setMessage(
          error?.message ||
          'Unable to enable notifications.'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleDisable =
    async () => {
      try {
        setLoading(true);
        setMessage('');

        await disablePushNotifications();

        setSubscribed(false);

        setMessage(
          'Mobile notifications disabled.'
        );
      } catch (error: any) {
        console.error(
          '[PUSH] Disable notification error:',
          error
        );

        setMessage(
          error?.message ||
          'Unable to disable notifications.'
        );
      } finally {
        setLoading(false);
      }
    };

  if (
    !supported
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-5 w-5 text-gray-500" />

          <div>
            <p className="font-semibold text-gray-900">
              Mobile Notifications
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Push notifications are not supported on this browser or device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    permission ===
    'denied'
  ) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-5 w-5 text-amber-600" />

          <div>
            <p className="font-semibold text-gray-900">
              Notifications Blocked
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Notifications are blocked in your browser settings. Please allow notifications for AskIT Technologies and reload the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-gray-900">
              Mobile Notifications
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {subscribed
                ? 'This device will receive AskIT Technologies notifications.'
                : 'Enable notifications for announcements, payments, registrations, certificates and reminders.'}
            </p>

            {message && (
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
            )}
          </div>
        </div>

        {subscribed ? (
          <button
            type="button"
            onClick={
              handleDisable
            }
            disabled={
              loading
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}

            Disable
          </button>
        ) : (
          <button
            type="button"
            onClick={
              handleEnable
            }
            disabled={
              loading
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}

            Enable Notifications
          </button>
        )}
      </div>
    </div>
  );
}