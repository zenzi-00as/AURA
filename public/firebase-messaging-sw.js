/**
 * @fileOverview Aura Background Messaging Node.
 * Handles background push notifications when the application is not in focus.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// AURA INFRASTRUCTURE: Service Worker Configuration
// NOTE: These values must match your Firebase project configuration.
// In production, these are public client identifiers.
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Guard: Only initialize if config is populated by the user
if (firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[AURA FCM SW] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || "Aura Update ✨";
    const notificationOptions = {
      body: payload.notification?.body || "Check your Aura for new activity.",
      icon: '/icons/icon-192x192.png', // Fallback icon path
      badge: '/icons/icon-192x192.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[AURA FCM SW] Configuration not detected. Background notifications will not materialize.');
}

// Handle notification interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Redirect user to the dashboard or specific conversation
  event.waitUntil(
    clients.openWindow('/')
  );
});
