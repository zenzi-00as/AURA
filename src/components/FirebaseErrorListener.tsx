'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In a real production app, you might only log this or show a subtle toast.
      // For development in Studio, this surfaces the error to the overlay if thrown.
      toast({
        variant: "destructive",
        title: "Security Rule Denied",
        description: `Operation: ${error.context.operation} on ${error.context.path}`,
      });
      
      // Re-throw to trigger Next.js error overlay in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Firebase Permission Denied:', error.context);
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
