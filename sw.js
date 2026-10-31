// COFFEE PEOPLE — Service Worker for iOS 16.4-18 & Android Lock-Screen Notifications & Vibration
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let payload = {
        title: '☕ COFFEE PEOPLE • Уведомление',
        body: 'Статус вашего заказа обновился! Откройте приложение.',
        tag: 'cp-push-' + Date.now()
    };
    try {
        if (event.data) {
            const parsed = event.data.json();
            payload = { ...payload, ...parsed };
        }
    } catch (e) {
        try { payload.body = event.data.text(); } catch (err) {}
    }
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            tag: payload.tag || 'cp-order-alert',
            renotify: true,
            requireInteraction: true,
            vibrate: [500, 120, 500, 120, 700, 150, 900]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow('/');
        })
    );
});
