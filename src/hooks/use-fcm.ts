'use client';

/**
 * @fileOverview Aura High-Fidelity FCM Interaction Node.
 * Handles permission staging, token synchronization, and foreground reception.
 * Refined for service worker registration and VAPID synchronization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/firebase/auth-context';
import { useMessaging, useFirestore } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useFcm() {
  const { user } = useAuthContext();
  const messaging = useMessaging();
  const db = useFirestore();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[AURA FCM] Foreground message received', payload);
      toast({
        title: payload.notification?.title || "New Alert",
        description: payload.notification?.body || "Check your Aura for updates.",
      });
    });

    return () => unsubscribe();
  }, [messaging, toast]);

  const registerPush = useCallback(async () => {
    if (!messaging || !db || !user || isRegistering) return;

    setIsRegistering(true);
    try {
      // 1. Request Browser Permission
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        // 2. Explicitly register the service worker for background handling
        // Standard location is /firebase-messaging-sw.js
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // 3. Synchronize FCM Token with VAPID Key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        
        if (!vapidKey && process.env.NODE_ENV === 'development') {
          console.warn("[AURA FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from environment.");
        }

        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log('[AURA FCM] Token synchronized:', token);
          
          // 4. Store token in user's secure subcollection
          const deviceRef = doc(db, 'users', user.uid, 'notificationDevices', token);
          await setDoc(deviceRef, {
            token,
            platform: 'web',
            lastUpdated: serverTimestamp(),
            userAgent: navigator.userAgent
          });
          
          toast({
            title: "Aura Alerts Active",
            description: "Your device is now synchronized with our messaging node."
          });
        }
      } else if (status === 'denied') {
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Enable notifications in your browser settings to receive real-time alerts."
        });
      }
    } catch (error: any) {
      console.error('[AURA FCM] Registration fault', error);
      toast({
        variant: "destructive",
        title: "Synchronization Fault",
        description: "Failed to establish a connection with the messaging node."
      });
    } finally {
      setIsRegistering(false);
    }
  }, [messaging, db, user, isRegistering, toast]);

  const unregisterPush = useCallback(async () => {
    // Logical unregistration can be handled by deleting the token from Firestore
    console.log('[AURA FCM] Push disassociated from UI toggle');
  }, []);

  return {
    permission,
    isRegistering,
    registerPush,
    unregisterPush
  };
}
