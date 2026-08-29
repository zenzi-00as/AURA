'use client';

/**
 * @fileOverview Firebase Client Configuration Node.
 * Synchronized with environment variables for professional GitHub security.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBTmVwEnjOw1eLnpfP7MH1Ez1sQxI2rE-U",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-9530423073-b477b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-9530423073-b477b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-9530423073-b477b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "824742384803",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:824742384803:web:c2050a62a6fdf6178ddb16"
};
