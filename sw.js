const CACHE_NAME = 'moneynote-v1';
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
    './lib/html2pdf.bundle.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
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
