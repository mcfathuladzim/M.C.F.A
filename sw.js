// ═══════════════════════════════════════════
// MCFA PROJECT — Service Worker v2.0
// MC. Fathul Adzim
// ═══════════════════════════════════════════

const CACHE_NAME = 'mcfa-v2';
const SHELL_CACHE = 'mcfa-shell-v2';

// Files to cache for offline use
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&family=Sora:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  console.log('[MCFA SW] Installing v2...');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES.filter(f => !f.startsWith('http'))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[MCFA SW] Cache failed:', err))
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  console.log('[MCFA SW] Activated v2');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map(k => {
            console.log('[MCFA SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Cache First for shell, Network First for others ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Shell files: cache first
  if (
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('.svg') ||
    url.pathname === url.origin + '/'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Google Fonts: cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Everything else: network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
  );
});

// ── MESSAGE — skip waiting ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
