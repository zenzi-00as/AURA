
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Initialize outside of state to avoid returning null on the server
  // initializeFirebase is idempotent because of getApps check
  const services = useMemo(() => typeof window !== 'undefined' ? initializeFirebase() : null, []);

  if (!services) {
    // Return children on server for correct hydration shell
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <FirebaseProvider app={services.app} db={services.db} auth={services.auth}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
