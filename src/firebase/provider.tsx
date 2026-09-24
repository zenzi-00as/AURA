'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Messaging } from 'firebase/messaging';

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  messaging: Messaging | null;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({
  children,
  app,
  db,
  auth,
  storage,
  messaging,
}: {
  children: React.ReactNode;
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  messaging: Messaging | null;
}) {
  return (
    <FirebaseContext.Provider value={{ app, db, auth, storage, messaging }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  return context || { app: null, db: null, auth: null, storage: null, messaging: null };
};

export const useFirebaseApp = () => useFirebase()?.app;
export const useFirestore = () => useFirebase()?.db;
export const useAuth = () => useFirebase()?.auth;
export const useStorage = () => useFirebase()?.storage;
export const useMessaging = () => useFirebase()?.messaging;
