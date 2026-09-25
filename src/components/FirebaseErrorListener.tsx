'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Surfacing the security error via a user-facing toast
      toast({
        variant: "destructive",
        title: "Security Rule Denied",
        description: `Operation: ${error.context.operation} on ${error.context.path}`,
      });
      
      // Definitively trigger the Next.js error overlay in development 
      // by throwing as an uncaught exception, avoiding redundant console logs.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
