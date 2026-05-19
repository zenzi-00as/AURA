'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({
  children,
  app,
  db,
  auth,
}: {
  children: React.ReactNode;
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}) {
  return (
    <FirebaseContext.Provider value={{ app, db, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  // Return the context value or a default object with nulls to avoid crashes during SSR
  return context || { app: null, db: null, auth: null };
};

export const useFirebaseApp = () => useFirebase()?.app;
export const useFirestore = () => useFirebase()?.db;
export const useAuth = () => useFirebase()?.auth;
