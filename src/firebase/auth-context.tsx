
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from './init';
import { UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { getEffectivePlan } from '@/lib/subscription-engine';

interface AuthContextType {
  user: (User & { isDemoUser?: boolean }) | null;
  profile: UserProfile | null;
  loading: boolean;
  onboardingCompleted: boolean;
  exitDemoMode: () => void;
  loginAsDemo: () => void;
  effectivePlan: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  onboardingCompleted: false,
  exitDemoMode: () => {},
  loginAsDemo: () => {},
  effectivePlan: 'free',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { isDemoUser?: boolean }) | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAsDemo = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aura_demo_active', 'true');
      window.location.reload(); 
    }
  };

  const exitDemoMode = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aura_demo_active');
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    // Hydration-safe demo check
    const isDemoActive = 
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && 
      process.env.NODE_ENV !== 'production' &&
      typeof window !== 'undefined' && 
      sessionStorage.getItem('aura_demo_active') === 'true';

    if (isDemoActive) {
      const demoUser = { uid: 'demo-user', email: 'demo@aura.local', isDemoUser: true } as any;
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
        phoneNumber: '+91 0000000000',
        superLikeBalance: 10,
        incognitoMode: false,
        isSuspended: false,
        isAdmin: true,
        usage: { newChatsUsed: 0, likesUsed: 0, mediaUsed: 0, lastResetDate: format(new Date(), 'yyyy-MM-dd') }
      };
      setUser(demoUser);
      setProfile(demoProfile);
      setLoading(false);
      return;
    }

    const { auth, db } = initializeFirebase();
    if (!auth || !db) return;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Daily Limit Usage Reset Logic
            const today = format(new Date(), 'yyyy-MM-dd');
            if (data.usage?.lastResetDate !== today) {
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
          }
          setLoading(false);
        });

        // Sync presence safely
        updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() }).catch(() => {});
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = {
    user,
    profile,
    loading,
    onboardingCompleted: !!profile?.onboardingCompleted,
    exitDemoMode,
    loginAsDemo,
    effectivePlan: getEffectivePlan(profile)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
