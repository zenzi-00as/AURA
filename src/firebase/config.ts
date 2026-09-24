'use client';

/**
 * @fileOverview Firebase Client Configuration Node.
 * Hardened for professional environment synchronization.
 * Variable names are strictly aligned with the Aura Production Standard.
 */

// VALIDATION GUARD: Verification for required client variables in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  ];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[AURA CONFIG WARNING] Missing Client Variables: ${missing.join(', ')}`);
  }
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
