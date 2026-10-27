self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  event.waitUntil((async () => {
    const tag = "prayer-alert";
    const isSilentUpdate = data.kind === "reminder" && data.updateOnly;
    await self.registration.showNotification(data.title || "UAE Prayer Times", {
      body: data.body || "Prayer-time notification",
      icon: "./assets/app-icon.png",
      badge: "./assets/app-icon.png",
      tag,
      renotify: isSilentUpdate ? false : !data.silent,
      silent: isSilentUpdate ? true : Boolean(data.silent),
      data: { url: data.url || "./" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "./";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
