/**
 * @fileOverview Aura Background Messaging Node.
 * Hardened for service-worker lifecycle compliance.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuration must match the client-side configuration
// These values are public and safe to include in the service worker
// Note: In a production build, these could be injected or hardcoded
firebase.initializeApp({
  apiKey: "REPLACE_WITH_ACTUAL_API_KEY",
  authDomain: "studio-9530423073-b477b.firebaseapp.com",
  projectId: "studio-9530423073-b477b",
  storageBucket: "studio-9530423073-b477b.appspot.com",
  messagingSenderId: "9530423073",
  appId: "1:9530423073:web:757e87b649ef294f923b7e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[AURA SW] Background message synchronized', payload);

  const notificationTitle = payload.notification.title || 'Aura Alert';
  const notificationOptions = {
    body: payload.notification.body || 'New activity detected in your Aura.',
    icon: '/favicon.ico', // Placeholder: Ensure a real icon exists at root
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetPath = event.notification.data?.path || '/notifications';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});
