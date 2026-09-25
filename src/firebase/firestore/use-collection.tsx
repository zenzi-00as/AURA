
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

/**
 * @fileOverview A high-fidelity hook for real-time Firestore collection synchronization.
 * Refined to definitively handle permission denials vs. other synchronization faults.
 * Hardened to avoid unsafe internal property access.
 */

export function useCollection<T = DocumentData>(initialQuery: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!initialQuery) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      initialQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      async (serverError: FirestoreError) => {
        // High-fidelity permission denial tracking
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'collection/query', 
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          // Log systemic faults (e.g. missing indexes) for developer visibility
          if (process.env.NODE_ENV === 'development') {
            console.error('[AURA SYNC FAULT]', serverError.code, serverError.message);
          }
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [initialQuery]);

  return { data, loading, error };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T } | null>(null);
  if (!ref.current || !deps.every((d, i) => d === ref.current!.deps[i])) {
    ref.current = { deps, value: factory() };
  }
  return ref.current.value;
}
