// Hiyo service worker: shows push notifications and opens the right screen when one is tapped.
// No offline cache on purpose: the app always loads fresh, so a new version is never stuck behind an old copy.
const SCOPE = self.registration.scope; // e.g. https://robertmonther.github.io/hiyo-web/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const nav = self.navigator;
  const count = typeof d.badge === 'number' && nav && 'setAppBadge' in nav
    ? (d.badge > 0 ? nav.setAppBadge(d.badge) : nav.clearAppBadge()).catch(() => {})
    : Promise.resolve();
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'Hiyo', {
      body: d.body || '',
      tag: d.tag || undefined,
      renotify: !!d.tag, // a new message in the same chat buzzes again but replaces the old card
      silent: !!d.silent, // quiet hours: it arrives without sound
      icon: d.icon || SCOPE + 'icons/icon-192.png',
      badge: SCOPE + 'icons/badge-96.png',
      timestamp: d.ts || Date.now(),
      data: { url: d.url || SCOPE },
    }),
    count,
  ]));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || SCOPE, self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = wins.find(w => w.url.startsWith(SCOPE));
    if (app) { await app.focus(); app.postMessage({ type: 'open', url }); return; }
    await self.clients.openWindow(url);
  })());
});
