'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, reload } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        isOnline: true,
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
            
            setProfile(data);
          } else {
            setProfile(null);
            setNeedsTermsAcceptance(true);
          }
          setLoading(false);
        });

        // Online Status Lifecycle Handling
        const updatePresence = (online: boolean) => {
          updateDoc(userRef, { 
            isOnline: online, 
            lastActive: serverTimestamp() 
          }).catch(() => {});
        };

        updatePresence(true);

        const handleVisibilityChange = () => {
          updatePresence(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', () => updatePresence(true));
        window.addEventListener('blur', () => updatePresence(false));

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          updatePresence(false);
        };
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