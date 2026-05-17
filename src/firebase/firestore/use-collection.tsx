'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  query,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(initialQuery: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!initialQuery) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      initialQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: (initialQuery as any)._query?.path?.toString() || 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
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
