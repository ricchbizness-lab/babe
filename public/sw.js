// Service Worker NOVA — notifications push (sprint 4 point 1) + mode
// hors-ligne PWA (sprint 4 point 2) : cache des assets statiques, cache des
// routes API essentielles pour la consultation terrain sans réseau, et page
// de secours hors-ligne pour les navigations non mises en cache.

const STATIC_CACHE = "nova-static-v1";
const API_CACHE = "nova-api-v1";
const OFFLINE_URL = "/offline.html";

// Routes API consultables hors-ligne (sprint 4, point 2, 2a) — jamais les
// routes de création/modification, uniquement de la lecture.
const CACHEABLE_API_PATHS = ["/api/tasks", "/api/projects", "/api/team", "/api/voice-reports"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png", "/icon-512.png"]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE).map((key) => caches.delete(key)))
      ),
    ])
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ttf)$/.test(url.pathname)
  );
}

function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_PATHS.some((path) => pathname === path);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache First — assets statiques (JS, CSS, images) : rapides et changent
  // rarement (fichiers hashés par Next.js), on ne revalide pas à chaque fois.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network First avec repli sur le cache — routes API essentielles pour la
  // consultation terrain (tâches, chantiers, équipe, rapports vocaux).
  if (isCacheableApiRoute(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Navigation (chargement de page) : réseau d'abord, page hors-ligne en
  // dernier recours si rien n'est disponible ni en réseau ni en cache.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Nova", body: "Vous avez une nouvelle notification." };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
