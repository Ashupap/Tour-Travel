// pb_public/sw.js
// Service Worker with Cache-First static caching & Background Sync (PWA-02, PWA-03)

const CACHE_NAME = "aditya-travels-v33-bharatyatra-cache-v3-v15";
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
  "/images/logo-white.png"
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

  // For JS files: Network-first to always run latest validated script, with safe cache fallback
  if (url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const netCt = networkResponse.headers.get("content-type") || "";
            if (netCt.includes("javascript")) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              return networkResponse;
            }
          }

          // If network returned non-200 or non-javascript (e.g. 400 Bad Request JSON),
          // DO NOT return JSON as a script! Fall back to clean cached JS or clean pathname.
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) {
            const ct = cached.headers.get("content-type") || "";
            if (ct.includes("javascript")) {
              return cached;
            }
          }

          if (url.search) {
            try {
              const cleanRes = await fetch(url.pathname);
              if (cleanRes && cleanRes.status === 200) {
                const ct = cleanRes.headers.get("content-type") || "";
                if (ct.includes("javascript")) return cleanRes;
              }
            } catch (e) {}
          }

          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) {
            const ct = cached.headers.get("content-type") || "";
            if (ct.includes("javascript")) {
              return cached;
            }
            // Purge invalid cached script
            caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
          }
          return new Response("// Offline", {
            status: 200,
            headers: { "Content-Type": "application/javascript; charset=utf-8" }
          });
        })
    );
    return;
  }

  // For images: Network-first to prevent ERR_CONTENT_LENGTH_MISMATCH, fallback to cache
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|svg|gif|ico)$/i)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // For CSS, fonts: Cache-First with network fallback and background revalidation
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse && cachedResponse.status === 200) {
        const ct = cachedResponse.headers.get("content-type") || "";
        // If cached entry has valid content-type, serve and revalidate in background
        if (ct && !ct.includes("application/json")) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            })
            .catch(() => {});
          return cachedResponse;
        } else {
          // Bad cache entry: purge
          caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
        }
      }

      // Not in cache or purged: fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const netCt = networkResponse.headers.get("content-type") || "";
            if (!netCt.includes("application/json")) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          const pathnameMatch = await caches.match(url.pathname, { ignoreSearch: true });
          if (pathnameMatch && pathnameMatch.status === 200) {
            return pathnameMatch;
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
