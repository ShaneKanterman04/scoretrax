// Minimal service worker: required for Android install prompt; passthrough
// fetch. Also handles web push notifications.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      tag: data.tag,
      data: { gamePk: data.gamePk },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const gamePk = event.notification.data && event.notification.data.gamePk;
  const url = gamePk ? `/game/${gamePk}` : "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).pathname === url && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
