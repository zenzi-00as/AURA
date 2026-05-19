'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Initialize only on the client
  const services = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider 
      app={services?.app ?? null} 
      db={services?.db ?? null} 
      auth={services?.auth ?? null}
    >
      {services && <FirebaseErrorListener />}
      {children}
    </FirebaseProvider>
  );
}
