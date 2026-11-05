// Service worker: l'app e la mappa funzionano anche senza internet.
const APP = 'app-v1';
const TILES = 'tiles-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP)
      .then((c) => c.addAll(['./', './sentieri.geojson', './manifest.webmanifest', './icon-180.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => ![APP, TILES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tasselli della mappa: prima la copia salvata, altrimenti rete e salva.
  if (url.hostname.endsWith('opentopomap.org')) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req.url);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) c.put(req.url, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }

  // File dell'app: rete se c'e' (cosi' arrivano gli aggiornamenti), altrimenti copia salvata.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(APP).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
    );
  }
});
