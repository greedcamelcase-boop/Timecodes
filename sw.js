/* Сервис-воркер «Таймкодов»: хранит саму программу на телефоне, чтобы она открывалась без интернета.
   Записи он не трогает — они лежат в базе браузера. Запросы к Supabase идут напрямую мимо него. */
const CACHE = 'timecodes-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // чужие адреса (Supabase) не трогаем
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    // «показать сохранённое сразу, а новое подтянуть в фоне»: обновление применится при следующем запуске
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
    return Response.error();
  })());
});
