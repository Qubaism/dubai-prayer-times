self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("notificationclose", (event) => {
  const key = event.notification.data?.dismissalKey;
  if (!key) return;
  event.waitUntil(setReminderDismissed(key));
});

const dismissalCache = "prayer-reminder-dismissals-v1";

function dismissalRequest(key) {
  return new Request(new URL(`./notification-state/${encodeURIComponent(key)}`, self.registration.scope));
}

async function setReminderDismissed(key) {
  const cache = await caches.open(dismissalCache);
  await cache.put(dismissalRequest(key), new Response("dismissed", { headers: { "Cache-Control": "no-store" } }));
}

async function reminderWasDismissed(key) {
  if (!key) return false;
  const cache = await caches.open(dismissalCache);
  return Boolean(await cache.match(dismissalRequest(key)));
}

async function clearReminderDismissed(key) {
  if (!key) return;
  const cache = await caches.open(dismissalCache);
  await cache.delete(dismissalRequest(key));
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  event.waitUntil((async () => {
    const tag = "prayer-alert";
    if (data.kind === "reminder" && !data.updateOnly) await clearReminderDismissed(data.dismissalKey);
    if (data.updateOnly && await reminderWasDismissed(data.dismissalKey)) return;
    const existing = await self.registration.getNotifications({ tag });
    if (data.updateOnly && existing.length === 0) return;
    await self.registration.showNotification(data.title || "UAE Prayer Times", {
      body: data.body || "Prayer-time notification",
      icon: "./assets/app-icon.png",
      badge: "./assets/app-icon.png",
      tag,
      renotify: !data.silent,
      silent: Boolean(data.silent),
      data: { url: data.url || "./", dismissalKey: data.kind === "reminder" ? data.dismissalKey : null },
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
