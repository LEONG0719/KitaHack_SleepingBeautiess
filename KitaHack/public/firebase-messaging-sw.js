// Firebase Messaging Service Worker — handles background push notifications
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC1Goo5PW1n7wlvNVRw-tPcKbpMNSjRIbw",
    authDomain: "kitahack-sleeping-beauties.firebaseapp.com",
    projectId: "kitahack-sleeping-beauties",
    storageBucket: "kitahack-sleeping-beauties.firebasestorage.app",
    messagingSenderId: "412917315969",
    appId: "1:412917315969:web:1b9978f2f7a3dcdf569080",
    measurementId: "G-6WRX25H31Y"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'NutriNudge';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new health tip!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — navigate to the action URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const actionUrl = event.notification.data?.action_url || '/';
    event.waitUntil(clients.openWindow(actionUrl));
});
