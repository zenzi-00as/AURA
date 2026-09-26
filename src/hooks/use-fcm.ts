'use client';

/**
 * @fileOverview Aura High-Fidelity FCM Interaction Node.
 * Handles permission staging, token synchronization, and logical unregistration.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/firebase/auth-context';
import { useMessaging, useFirestore } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useFcm() {
  const { user, profile } = useAuthContext();
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
    // SECURITY: Ensure both Auth and Profile exist before writing tokens
    if (!messaging || !db || !user || !profile || isRegistering) return;

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
          // Store in centralized fcmTokens subcollection
          const deviceRef = doc(db, 'users', user.uid, 'fcmTokens', token);
          await setDoc(deviceRef, {
            token,
            platform: 'web',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastUsedAt: serverTimestamp(),
            userAgent: navigator.userAgent
          });
          
          // Legacy support for notificationDevices
          const legacyRef = doc(db, 'users', user.uid, 'notificationDevices', token);
          await setDoc(legacyRef, {
            token,
            enabled: true,
            lastUpdated: serverTimestamp()
          }).catch(() => {});
          
          console.log('[AURA FCM] Node synchronized:', token);
        }
      }
    } catch (error: any) {
      console.error('[AURA FCM] Registration fault', error);
    } finally {
      setIsRegistering(false);
    }
  }, [messaging, db, user, profile, isRegistering]);

  const unregisterPush = useCallback(async () => {
    if (!messaging || !db || !user) return;
    
    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        const deviceRef = doc(db, 'users', user.uid, 'fcmTokens', token);
        await deleteDoc(deviceRef).catch(() => {});
        
        const legacyRef = doc(db, 'users', user.uid, 'notificationDevices', token);
        await updateDoc(legacyRef, {
          enabled: false,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("[AURA FCM] Node purging warning", err);
    }
  }, [messaging, db, user]);

  return {
    permission,
    isRegistering,
    registerPush,
    unregisterPush
  };
}
