// pb_public/sw.js
// Service Worker with Cache-First static caching & Background Sync (PWA-02, PWA-03)

const CACHE_NAME = "aditya-travels-v27-bharatyatra-cache-v3-v7";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/manifest.json",
  "/favicon.png",
  "/css/tailwind.css",
  "/js/dexie.min.js",
  "/js/alpine.min.js",
  "/js/htmx.min.js",
  "/js/jspdf.umd.min.js",
  "/js/vanilla-tilt.min.js",
  "/js/landing.js",
  "/js/reveal.js",
  "/offline-store.js",
  "/agent/index.html",
  "/agent/receipt.js",
  "/agent/pdf-generator.js",
  "/admin/index.html",
  "/admin/admin.js",
  "/distributor/index.html",
  "/distributor/distributor.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/images/logo.png",
  "/images/logo-white.png",
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

  // For admin, distributor, & agent routes & scripts: Network-first to always serve latest portal features
  if (url.pathname.startsWith("/admin/") || url.pathname.startsWith("/distributor/") || url.pathname.startsWith("/agent/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
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
        .catch(async () => {
          const matched = await caches.match(event.request);
          if (matched) return matched;
          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;
          return caches.match("/index.html");
        })
    );
    return;
  }

  // For JS, CSS, images, fonts: Cache-First with network fallback and background revalidation
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const isJs = url.pathname.endsWith(".js");

      if (cachedResponse) {
        const ct = cachedResponse.headers.get("content-type") || "";
        // If an old corrupted response cached JSON for a JS file, purge it immediately
        if (isJs && ct.includes("application/json")) {
          console.warn("[SW] Purging corrupted JSON cache for JS script:", url.pathname);
          caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
        } else {
          // Fetch fresh copy in background to revalidate cache
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const netCt = networkResponse.headers.get("content-type") || "";
                if (!isJs || !netCt.includes("application/json")) {
                  const clone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                  });
                }
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
      }

      // Not in cache or corrupted cache purged: fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const netCt = networkResponse.headers.get("content-type") || "";
            if (!isJs || !netCt.includes("application/json")) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed and not in exact cache: try matching pathname without query params
          const pathnameMatch = await caches.match(url.pathname, { ignoreSearch: true });
          if (pathnameMatch) {
            const ct = pathnameMatch.headers.get("content-type") || "";
            if (!isJs || !ct.includes("application/json")) {
              return pathnameMatch;
            }
          }
          return new Response("", { status: 408, statusText: "Offline Network Timeout" });
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
