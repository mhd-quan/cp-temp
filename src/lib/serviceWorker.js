// Ấn bản on a device: the service worker (served as /sw.js, src/pages/sw.js.ts).
//
// Pages come from the network first, always: a new essay is there the moment
// it is published. Each page read is kept, so it opens again without a
// connection, and a page that cannot be had shows the offline page, which
// lists what this device has kept. Files whose names change with their content
// (styles, scripts, fonts, prints, the engraved name) are taken from what is
// kept first: they never change under their name. The page does not wait for
// this worker to start (navigation preload), and nothing from another site
// passes through it.

/** What the offline page needs that is not in it: the shell's later styles. */
const PRECACHE = __PRECACHE__;
const OFFLINE = '/offline';
const PAGES = 'pensees-pages';
const PINNED = 'pensees-pinned';
const FILES = 'pensees-files';
/** The most pages and files kept; the oldest go first. */
const KEEP = { [PAGES]: 80, [PINNED]: 160, [FILES]: 500 };
const IMMUTABLE = /^\/(?:_astro|images\/responsive|nameplate|discovery)\//;
const REVALIDATE = /^\/(?:pagefind|brand)\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      await pages.add(new Request(OFFLINE, { cache: 'reload' }));
      await Promise.allSettled([
        pages.add(new Request('/', { cache: 'reload' })),
        pages.add(new Request('/library', { cache: 'reload' })),
      ]);
      await caches.open(PINNED);
      const files = await caches.open(FILES);
      await files.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.navigationPreload?.enable();
      for (const key of await caches.keys())
        if (key !== PAGES && key !== PINNED && key !== FILES) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const trim = async (name) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const keep = KEEP[name] ?? 0;
  const removable = name === PAGES ? keys.filter((key) => new URL(key.url).pathname !== OFFLINE) : keys;
  for (const key of removable.slice(0, Math.max(0, removable.length - keep))) await cache.delete(key);
};

/** A page: the network's, kept for later; offline, what was kept, or the offline page. */
async function page(event) {
  const url = new URL(event.request.url);
  const key = url.origin + url.pathname;
  try {
    const response = (await event.preloadResponse) ?? (await fetch(event.request));
    const html = response.headers.get('content-type')?.startsWith('text/html');
    if (response.ok && html && url.pathname !== OFFLINE) {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(PAGES)
          .then((cache) => cache.put(key, copy))
          .then(() => trim(PAGES)),
      );
    }
    return response;
  } catch {
    const pinned = await caches.open(PINNED);
    const cache = await caches.open(PAGES);
    return (await pinned.match(key)) ?? (await cache.match(key)) ?? (await cache.match(OFFLINE)) ?? Response.error();
  }
}

/** A file named for its content: what is kept, or the network's, then kept. */
async function immutable(event) {
  const cache = await caches.open(FILES);
  const kept = await cache.match(event.request);
  if (kept) return kept;
  const response = await fetch(event.request);
  if (response.ok && response.status === 200) {
    const copy = response.clone();
    event.waitUntil(cache.put(event.request, copy).then(() => trim(FILES)));
  }
  return response;
}

/** A file kept under one name across editions: the network's, or offline, what was kept. */
async function fresh(event) {
  const cache = await caches.open(FILES);
  try {
    const response = await fetch(event.request);
    if (response.ok && response.status === 200) {
      const copy = response.clone();
      event.waitUntil(cache.put(event.request, copy));
    }
    return response;
  } catch {
    return (await cache.match(event.request)) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(page(event));
  else if (IMMUTABLE.test(url.pathname)) event.respondWith(immutable(event));
  else if (REVALIDATE.test(url.pathname)) event.respondWith(fresh(event));
});

// A page can ask the worker to pin a set of same-origin requests after the
// reader has inspected its images. This keeps the worker useful for future
// share-target and download flows without making it parse HTML itself.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PINNED);
      for (const value of data.urls) {
        const url = new URL(value, self.location.origin);
        if (url.origin !== self.location.origin) continue;
        const response = await fetch(url.href, { cache: 'reload' });
        if (response.ok) await cache.put(url.href, response.clone());
      }
      await trim(PINNED);
      event.source?.postMessage({ type: 'CACHE_URLS_DONE', urls: data.urls });
    })(),
  );
});
