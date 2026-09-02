import {
  useEffect,
  useState,
} from 'react';

import {
  Bell,
  X,
  Loader2,
} from 'lucide-react';

import {
  enablePushNotifications,
  getPushPermission,
  isPushSupported,
} from '../../services/pushNotification';

const DISMISS_KEY =
  'askit_push_prompt_dismissed_until';

export default function PushPermissionPrompt() {
  const [visible, setVisible] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      return;
    }

    const permission =
      getPushPermission();

    if (permission !== 'default') {
      return;
    }

    const dismissedUntil =
      localStorage.getItem(
        DISMISS_KEY
      );

    if (dismissedUntil) {
      const dismissedTime =
        Number(dismissedUntil);

      if (
        !Number.isNaN(
          dismissedTime
        ) &&
        Date.now() <
          dismissedTime
      ) {
        return;
      }
    }

    const timer =
      window.setTimeout(
        () => {
          setVisible(true);
        },
        1500
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, []);

  const handleAllow =
    async () => {
      try {
        setLoading(true);

        await enablePushNotifications();

        localStorage.removeItem(
          DISMISS_KEY
        );

        setVisible(false);
      } catch (error) {
        console.error(
          '[PUSH] Permission error:',
          error
        );

        const permission =
          getPushPermission();

        if (
          permission ===
          'denied'
        ) {
          setVisible(false);
        }
      } finally {
        setLoading(false);
      }
    };

  const handleNotNow = () => {
    // Ask again after 7 days
    const sevenDays =
      7 *
      24 *
      60 *
      60 *
      1000;

    localStorage.setItem(
      DISMISS_KEY,
      String(
        Date.now() +
          sevenDays
      )
    );

    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-4
        left-4
        right-4
        z-[9999]
        mx-auto
        max-w-md
        rounded-2xl
        border
        border-navy-100
        bg-white
        p-5
        shadow-2xl
        sm:left-auto
        sm:right-5
        sm:w-[390px]
      "
    >
      <button
        type="button"
        onClick={
          handleNotNow
        }
        disabled={
          loading
        }
        className="
          absolute
          right-3
          top-3
          text-navy-300
          transition
          hover:text-navy-600
        "
        aria-label="Close notification prompt"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex gap-4">
        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-blue-50
          "
        >
          <Bell className="h-5 w-5 text-blue-600" />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="
              pr-6
              text-base
              font-bold
              text-navy-900
            "
          >
            Stay Updated with AskIT
          </h3>

          <p
            className="
              mt-1
              text-sm
              leading-5
              text-navy-500
            "
          >
            Receive important
            announcements, payment
            updates, registration
            status, certificates,
            reminders and account
            notifications directly
            on this device.
          </p>

          <div
            className="
              mt-4
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                handleAllow
              }
              disabled={
                loading
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-navy-800
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-navy-900
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />

                  Allow Notifications
                </>
              )}
            </button>

            <button
              type="button"
              onClick={
                handleNotNow
              }
              disabled={
                loading
              }
              className="
                rounded-lg
                px-4
                py-2
                text-sm
                font-semibold
                text-navy-500
                transition
                hover:bg-navy-50
              "
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}