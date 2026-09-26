
'use client';

/**
 * @fileOverview Aura High-Fidelity FCM Interaction Node.
 * Handles permission staging, token synchronization, and logical unregistration.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/firebase/auth-context';
import { useMessaging, useFirestore } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          const deviceRef = doc(db, 'users', user.uid, 'notificationDevices', token);
          await setDoc(deviceRef, {
            token,
            platform: 'web',
            enabled: true,
            lastUpdated: serverTimestamp(),
            userAgent: navigator.userAgent
          });
          
          console.log('[AURA FCM] Node synchronized:', token);
        }
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
    if (!messaging || !db || !user) return;
    
    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        // Logically disable the token rather than deleting to preserve session history
        const deviceRef = doc(db, 'users', user.uid, 'notificationDevices', token);
        await updateDoc(deviceRef, {
          enabled: false,
          lastUpdated: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn("[AURA FCM] Logical unregistration warning", err);
    }
  }, [messaging, db, user]);

  return {
    permission,
    isRegistering,
    registerPush,
    unregisterPush
  };
}
