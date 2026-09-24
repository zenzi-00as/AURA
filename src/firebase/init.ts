'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';
import { firebaseConfig } from './config';

export interface FirebaseServices {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  messaging: Messaging | null;
}

/**
 * @fileOverview Central Firebase Initialization Node.
 * Hardened to support FCM initialization in the browser only.
 */
export function initializeFirebase(): FirebaseServices {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  let messaging: Messaging | null = null;
  // Messaging only works in a browser environment with HTTPS (or localhost)
  if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) {
        messaging = getMessaging(app);
      }
    }).catch(err => console.warn("[AURA FCM] Messaging support check failed", err));
  }

  return { app, db, auth, storage, messaging };
}
