const CACHE_NAME = "spare-me-v2";
const MAX_CACHED_PAGES = 30;
const OFFLINE_PAGES = ["/log"];

// Cache app shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([...OFFLINE_PAGES, "/icon-192.png", "/manifest.json"]),
      ),
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Trim cache to max entries (evict oldest)
async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(
      keys.slice(0, keys.length - max).map((k) => cache.delete(k)),
    );
  }
}

// Network-first with cache fallback for pages, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // Images and fonts — cache-first (content-addressed filenames, safe to cache)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        }),
      ),
    );
    return;
  }

  // JS/CSS chunks — network-first with cache fallback
  // Prevents stale chunk errors after deploys (chunk hashes change)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || new Response("", { status: 503 })),
        ),
    );
    return;
  }

  // Pages — network first, fall back to cache
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful page responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              trimCache(CACHE_NAME, MAX_CACHED_PAGES);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline — try cache, then fall back to /log
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match("/log");
          });
        }),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Spare Me?";
  const options = {
    body: data.body || "Someone just bowled!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
