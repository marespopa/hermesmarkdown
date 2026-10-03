// HermesMarkdown service worker: lets the installed app start offline.
//
// - Navigations: network first, falling back to the cached page (or the
//   editor shell) when offline. Every successful navigation refreshes the cache.
// - /_next/static and public assets: cache first. Next.js hashes these file
//   names, so a cached copy never goes stale.
// - /api/* (AI, GitHub) and cross-origin requests are never touched.
//
// The app registers this file as /sw.js?v=<app version>. A new version
// takes over as soon as it installs, without reloading open pages, and old
// caches are deleted. Navigations are network first, so the next load already
// runs the new version.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_PREFIX = "hermes-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const SHELL_URL = "/editor";
const PRECACHE_URLS = [
  "/editor",
  "/editor/files",
  "/manifest.json",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];
const STATIC_ASSET = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico|json|txt)$/i;

// The editor page's own script and style chunks, so the first offline
// launch works even though they loaded before this worker took control.
async function shellAssetUrls(cache) {
  const response = await cache.match(SHELL_URL);
  if (!response) return [];
  const html = await response.text();
  const urls = new Set();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) urls.add(match[0]);
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // One missing asset must not block installing the rest.
    await Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)));
    const assets = await shellAssetUrls(cache).catch(() => []);
    await Promise.all(assets.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(cacheKey, response.clone());
    }
    return response;
  } catch (err) {
    const cached = (await caches.match(cacheKey)) || (await caches.match(SHELL_URL));
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // React Server Component payloads change per deploy; let Next.js handle them.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
