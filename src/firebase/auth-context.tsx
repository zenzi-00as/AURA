'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, reload } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from './init';
import { UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { getEffectivePlan } from '@/lib/subscription-engine';
import { CURRENT_TERMS_VERSION } from '@/lib/constants';

/**
 * @fileOverview Central Authentication and Profile Synchronization Node.
 * Hardened with Email Verification, Terms Acceptance, and Real-time Presence.
 */

interface AuthContextType {
  user: (User & { isDemoUser?: boolean }) | null;
  profile: UserProfile | null;
  loading: boolean;
  onboardingCompleted: boolean;
  needsTermsAcceptance: boolean;
  isEmailVerified: boolean;
  exitDemoMode: () => void;
  loginAsDemo: () => void;
  effectivePlan: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  onboardingCompleted: false,
  needsTermsAcceptance: false,
  isEmailVerified: false,
  exitDemoMode: () => {},
  loginAsDemo: () => {},
  effectivePlan: 'free',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { isDemoUser?: boolean }) | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const loginAsDemo = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('aura_demo_active', 'true');
        window.location.reload(); 
      } catch (e) {
        console.error("Demo activation failed:", e);
      }
    }
  };

  const exitDemoMode = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('aura_demo_active');
        window.location.href = '/auth';
      } catch (e) {
        window.location.href = '/auth';
      }
    }
  };

  useEffect(() => {
    const getDemoStatus = () => {
      if (typeof window === 'undefined') return false;
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
        try {
          return sessionStorage.getItem('aura_demo_active') === 'true';
        } catch (e) {
          return false;
        }
      }
      return false;
    };

    if (getDemoStatus()) {
      const demoUser = { uid: 'demo-user', email: 'demo@aura.local', emailVerified: true, isDemoUser: true } as any;
      const demoProfile: UserProfile = {
        uid: 'demo-user',
        name: 'Artemis (Demo)',
        age: 27,
        bio: 'This is a development demo profile bypassing authentication.',
        gender: 'Non-binary',
        orientation: 'Queer',
        interestedIn: ['Anyone'],
        subscription: { planId: 'elite_plus', status: 'active', expiresAt: null, startedAt: new Date() },
        verificationStatus: 'Verified',
        photoUrl: 'https://picsum.photos/seed/aura_demo/400/400',
        onboardingCompleted: true,
        isDemoUser: true,
        settings: {
          incognito: false,
          showOnlineStatus: true,
          language: 'en',
          currency: 'INR'
        },
        notificationPreferences: {
          pushEnabled: true,
          newMatches: true,
          profileViews: true,
          verificationUpdates: true,
          membershipUpdates: true,
          paymentUpdates: true,
          spotlightUpdates: true
        },
        presence: { isOnline: true, lastSeen: new Date() },
        lastActive: new Date(),
        profilePhoneNumber: '+91 0000000000',
        superLikeBalance: 10,
        incognitoMode: false,
        isSuspended: false,
        isAdmin: true,
        usage: { newChatsUsed: 0, likesUsed: 0, mediaUsed: 0, lastResetDate: format(new Date(), 'yyyy-MM-dd') },
        termsAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION
      };
      setUser(demoUser);
      setProfile(demoProfile);
      setLoading(false);
      setNeedsTermsAcceptance(false);
      return;
    }

    const { auth, db } = initializeFirebase();
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (authUser) {
        try {
          await reload(authUser);
        } catch (e) {
          console.warn("[AUTH] Auto-refresh session failed", e);
        }

        setUser(authUser);
        const userRef = doc(db, 'users', authUser.uid);
        
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const hasValidTerms = data.termsAccepted === true && data.termsVersion === CURRENT_TERMS_VERSION;
            setNeedsTermsAcceptance(!hasValidTerms);

            const today = format(new Date(), 'yyyy-MM-dd');
            if (data.usage?.lastResetDate && data.usage.lastResetDate !== today) {
              updateDoc(userRef, {
                'usage.newChatsUsed': 0,
                'usage.likesUsed': 0,
                'usage.mediaUsed': 0,
                'usage.lastResetDate': today,
                updatedAt: serverTimestamp()
              }).catch(() => {});
            }
            
            // ATOMIC MIGRATION: Safely extend uninitialized settings
            if (!data.settings || !data.notificationPreferences) {
              updateDoc(userRef, {
                settings: {
                  incognito: data.incognitoMode ?? false,
                  showOnlineStatus: data.showOnlineStatus ?? true,
                  language: 'en',
                  currency: 'INR'
                },
                notificationPreferences: {
                  pushEnabled: true,
                  newMatches: true,
                  profileViews: true,
                  verificationUpdates: true,
                  membershipUpdates: true,
                  paymentUpdates: true,
                  spotlightUpdates: true
                }
              }).catch(() => {});
            }

            setProfile(data);
          } else {
            setProfile(null);
            setNeedsTermsAcceptance(true);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setNeedsTermsAcceptance(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // REAL PRESENCE ENGINE
  useEffect(() => {
    const { db } = initializeFirebase();
    if (!db || !user || !profile || user.isDemoUser) return;

    const presenceRef = doc(db, 'users', user.uid, 'presence', 'current');

    const updatePresence = async (online: boolean) => {
      if (!profile.onboardingCompleted) return;
      
      try {
        await setDoc(presenceRef, { 
          isOnline: online, 
          lastSeen: serverTimestamp() 
        }, { merge: true });

        // Update legacy fields for compatibility
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: online,
          lastActive: serverTimestamp()
        }).catch(() => {});
      } catch (e) {
        console.warn("[PRESENCE] Node sync warning", e);
      }
    };

    const handleVisibilityChange = () => {
      const active = document.visibilityState === 'visible';
      updatePresence(active);
      
      if (active) {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    const startHeartbeat = () => {
      if (heartbeatInterval.current) return;
      heartbeatInterval.current = setInterval(() => updatePresence(true), 3 * 60 * 1000); // 3m interval
    };

    const stopHeartbeat = () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };

    // Initialize presence
    updatePresence(true);
    startHeartbeat();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => updatePresence(true));
    window.addEventListener('blur', () => updatePresence(false));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopHeartbeat();
      updatePresence(false);
    };
  }, [user?.uid, profile?.onboardingCompleted]);

  const value = {
    user,
    profile,
    loading,
    onboardingCompleted: !!profile?.onboardingCompleted,
    needsTermsAcceptance,
    isEmailVerified: !!user?.emailVerified,
    exitDemoMode,
    loginAsDemo,
    effectivePlan: getEffectivePlan(profile)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
