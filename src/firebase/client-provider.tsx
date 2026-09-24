'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './init';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider 
      app={services.app} 
      db={services.db} 
      auth={services.auth}
      storage={services.storage}
      messaging={services.messaging}
    >
      {services.app && <FirebaseErrorListener />}
      {children}
    </FirebaseProvider>
  );
}
