/* バトスピ練習サイト: アプリ(PWA)用。常にネットワークを先に見て(=更新がすぐ反映される)、通信できないときだけ保存済みの分を使う */
const CACHE = 'bs-practice-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // 外部(PeerJS・外部画像など)には触れない
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow('./'); }));
});
// サーバーからのプッシュ通知(アプリを閉じていても届く)。アプリが開いて見えているときは、画面内のメッセージで知らせる
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: e.data ? e.data.text() : '' }; }
  const title = d.title || 'BATTLE SPIRITS PRACTICE';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const vis = cs.find(c => c.visibilityState === 'visible');
    if (vis) { vis.postMessage({ t: 'push', title }); return; }
    return self.registration.showNotification(title, { body: d.body || '', tag: d.tag || 'bs-room', renotify: true, icon: 'icons/icon-192.png', data: { url: d.url || './' } });
  }));
});
