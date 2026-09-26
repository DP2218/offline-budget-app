const CACHE_NAME = 'moneynote-v2';
const ASSETS = [
    './',
    './index.html',
    './css/app.css',
    './js/app.js',
    './js/db.js',
    './js/ui.js',
    './js/views/entry.js',
    './js/views/calendar.js',
    './js/views/categories.js',
    './js/views/recurring.js',
    './js/views/budgets.js',
    './js/views/reports.js',
    './js/views/settings.js',
    './lib/html2pdf.bundle.min.js',
    './lib/html2canvas.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
