/* PIMS service worker (docs/11-pwa-offline.md).
 * Ditulis tangan tanpa Workbox: Laravel menyajikan aset dari /build, jadi daftar
 * precache diambil dari /build/manifest.json saat halaman memintanya. */
const VERSION = 'v1';
const ASSETS = `pims-assets-${VERSION}`;
const PAGES = `pims-pages-${VERSION}`;
const IMAGES = `pims-images-${VERSION}`;
const KEEP = [ASSETS, PAGES, IMAGES];
const PAGE_TIMEOUT_MS = 4000;
const IMAGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const NO_CACHE_PATHS = /\/(logout|export|pdf|download)|\.pdf$|^\/p2h\/attachments\/|\/signature\//;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(ASSETS)
            .then((cache) => cache.addAll(['/offline.html', '/manifest.webmanifest', '/icons/pims-192.png']))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pims-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

/** Precache shell dari manifest Vite dan buang aset build lama. */
async function precacheBuild() {
    const res = await fetch('/build/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    const urls = new Set();
    for (const entry of Object.values(manifest)) {
        urls.add(`/build/${entry.file}`);
        (entry.css || []).forEach((f) => urls.add(`/build/${f}`));
        (entry.assets || []).forEach((f) => urls.add(`/build/${f}`));
    }
    const cache = await caches.open(ASSETS);
    for (const req of await cache.keys()) {
        const path = new URL(req.url).pathname;
        if (path.startsWith('/build/') && !urls.has(path)) await cache.delete(req);
    }
    await Promise.allSettled(
        [...urls].map(async (url) => {
            if (!(await cache.match(url))) await cache.add(url);
        }),
    );
}

self.addEventListener('message', (event) => {
    const type = event.data && event.data.type;
    if (type === 'precache') event.waitUntil(precacheBuild().catch(() => {}));
    // Keluar akun: halaman ber-data pribadi tidak boleh tertinggal di HP bersama
    if (type === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});

function timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

/** Respons Inertia (JSON) dan HTML untuk URL yang sama disimpan terpisah. */
function pageKey(request) {
    if (!request.headers.get('X-Inertia')) return request.url;
    const url = new URL(request.url);
    url.searchParams.set('__inertia', '1');
    return url.toString();
}

async function networkFirstPage(event) {
    const { request } = event;
    const cache = await caches.open(PAGES);
    const key = pageKey(request);
    const partial = request.headers.get('X-Inertia-Partial-Component');
    const network = fetch(request).then((response) => {
        const type = response.headers.get('Content-Type') || '';
        if (response.ok && !response.redirected && !partial && /html|json/.test(type)) {
            cache.put(key, response.clone());
        }
        return response;
    });
    // Respons jaringan tetap ditunggu di latar agar cache diperbarui
    event.waitUntil(network.catch(() => {}));
    try {
        return await Promise.race([network, timeout(PAGE_TIMEOUT_MS)]);
    } catch {
        const cached = await cache.match(key);
        if (cached) return cached;
        try {
            return await network;
        } catch {
            if (request.mode === 'navigate') return (await caches.match('/offline.html')) || Response.error();
            return Response.error();
        }
    }
}

async function cacheFirst(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const fresh = cached && (!maxAge || Date.now() - new Date(cached.headers.get('Date') || 0).getTime() < maxAge);
    if (cached && fresh) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        if (cached) return cached;
        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname === '/sw.js' || url.pathname === '/build/manifest.json') return;
    if (url.pathname.startsWith('/build/')) {
        event.respondWith(cacheFirst(request, ASSETS));
        return;
    }
    if (NO_CACHE_PATHS.test(url.pathname)) return;
    if (request.destination === 'image' || /^\/(icons|images)\//.test(url.pathname)) {
        event.respondWith(cacheFirst(request, IMAGES, IMAGE_MAX_AGE_MS));
        return;
    }
    if (request.mode === 'navigate' || request.headers.get('X-Inertia')) {
        event.respondWith(networkFirstPage(event));
    }
});

/* Web Push: siap menerima payload {title, body, url} bila backend push diaktifkan. */
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data && event.data.text() };
    }
    event.waitUntil(
        self.registration.showNotification(data.title || 'PIMS', {
            body: data.body || '',
            icon: '/icons/pims-192.png',
            badge: '/icons/pims-192.png',
            lang: 'id',
            data: { url: data.url || '/' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
            if (open) return open.focus().then((w) => w.navigate(target));
            return self.clients.openWindow(target);
        }),
    );
});
