// pb_public/sw.js
// Service Worker with Cache-First static caching & Background Sync (PWA-02, PWA-03)

const CACHE_NAME = "aditya-travels-v5-bharatyatra-cache-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/css/tailwind.css",
  "/js/dexie.min.js",
  "/js/alpine.min.js",
  "/js/htmx.min.js",
  "/js/vanilla-tilt.min.js",
  "/js/landing.js",
  "/js/reveal.js",
  "/offline-store.js",
  "/agent/receipt.js",
  "/admin/index.html",
  "/admin/admin.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/images/logo.png",
  "/images/hero-1.jpg",
  "/images/hero-2.jpg",
  "/images/hero-3.jpg",
  "/images/pkg-chardham.jpg",
  "/images/pkg-jyotirlinga.jpg",
  "/images/pkg-kashi.jpg",
  "/images/pkg-south.jpg"
];

// Install: Pre-cache static app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching offline application shell...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to pre-cache (harmless on first start):", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-First for navigation and APIs, Cache-First for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // For API endpoints: Network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline: Network unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // For HTML page navigation: Network-first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request) || caches.match("/"))
    );
    return;
  }

  // For JS, CSS, images: Cache-First with background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background Sync: sync-installments event (PWA-03)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-installments") {
    console.log("[SW] Background sync triggered: sync-installments");
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Post message to active client window to trigger outbox flush with active auth token
        clients.forEach((client) => {
          client.postMessage({ type: "BACKGROUND_SYNC_TRIGGER" });
        });
      })
    );
  }
});
