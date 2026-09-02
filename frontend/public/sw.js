/* AskIT Technologies Web Push Service Worker */

self.addEventListener(
  'install',
  () => {
    self.skipWaiting();
  }
);

self.addEventListener(
  'activate',
  (event) => {
    event.waitUntil(
      self.clients.claim()
    );
  }
);

// ---------------------------------------------------------------------------
// PUSH EVENT
// ---------------------------------------------------------------------------

self.addEventListener(
  'push',
  (event) => {
    let data = {};

    try {
      if (event.data) {
        data =
          event.data.json();
      }
    } catch (error) {
      console.error(
        '[AskIT SW] Could not parse push payload:',
        error
      );

      data = {
        title:
          'AskIT Technologies',

        body:
          event.data
            ? event.data.text()
            : 'You have a new notification.',
      };
    }

    const title =
      data.title ||
      'AskIT Technologies';

    const options = {
      body:
        data.body ||
        data.message ||
        'You have a new notification.',

      icon:
        data.icon ||
        '/icons/icon-192.png',

      badge:
        data.badge ||
        '/icons/badge-72.png',

      tag:
        data.tag ||
        `askit-${Date.now()}`,

      renotify: true,

      requireInteraction:
        false,

      data: {
        url:
          data.url ||
          data.link ||
          '/notifications',

        type:
          data.type ||
          'SYSTEM',
      },
    };

    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options
        )
    );
  }
);

// ---------------------------------------------------------------------------
// NOTIFICATION CLICK
// ---------------------------------------------------------------------------

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification
        .data?.url ||
      '/notifications';

    const absoluteUrl =
      new URL(
        targetUrl,
        self.location.origin
      ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type:
            'window',

          includeUncontrolled:
            true,
        })
        .then(
          async (
            clientList
          ) => {
            for (
              const client
              of clientList
            ) {
              try {
                const clientUrl =
                  new URL(
                    client.url
                  );

                const target =
                  new URL(
                    absoluteUrl
                  );

                if (
                  clientUrl.origin ===
                  target.origin
                ) {
                  if (
                    'focus' in
                    client
                  ) {
                    await client.focus();
                  }

                  if (
                    'navigate' in
                    client
                  ) {
                    await client.navigate(
                      absoluteUrl
                    );
                  }

                  return;
                }
              } catch (
                error
              ) {
                console.error(
                  '[AskIT SW] Notification navigation error:',
                  error
                );
              }
            }

            if (
              self.clients
                .openWindow
            ) {
              await self.clients
                .openWindow(
                  absoluteUrl
                );
            }
          }
        )
    );
  }
);

// ---------------------------------------------------------------------------
// NOTIFICATION CLOSE
// ---------------------------------------------------------------------------

self.addEventListener(
  'notificationclose',
  (event) => {
    console.log(
      '[AskIT SW] Notification dismissed:',
      event.notification
        .tag
    );
  }
);

// ---------------------------------------------------------------------------
// PUSH SUBSCRIPTION CHANGE
// ---------------------------------------------------------------------------

self.addEventListener(
  'pushsubscriptionchange',
  () => {
    console.log(
      '[AskIT SW] Browser push subscription changed.'
    );
  }
);