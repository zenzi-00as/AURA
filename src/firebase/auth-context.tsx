
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from './init';
import { UserProfile } from '@/lib/types';
import { format } from 'date-fns';

interface AuthContextType {
  user: (User & { isDemoUser?: boolean }) | null;
  profile: UserProfile | null;
  loading: boolean;
  onboardingCompleted: boolean;
  exitDemoMode: () => void;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  onboardingCompleted: false,
  exitDemoMode: () => {},
  loginAsDemo: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { isDemoUser?: boolean }) | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemoActive = () => {
    if (typeof window === 'undefined') return false;
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
    const hasActiveSession = sessionStorage.getItem('aura_demo_active') === 'true';
    return isDemoMode && hasActiveSession;
  };

  const loginAsDemo = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aura_demo_active', 'true');
      window.location.reload(); // Force context re-initialization
    }
  };

  const exitDemoMode = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aura_demo_active');
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    // 1. Development Demo Mode Logic
    if (isDemoActive()) {
      console.log("[AUTH] Demo Mode Active: Initializing Local Session.");
      
      const demoUser = {
        uid: 'demo-user',
        email: 'demo@aura.local',
        displayName: 'Aura Demo',
        phoneNumber: null,
        isDemoUser: true,
      } as any;

      const demoProfile: UserProfile = {
        uid: 'demo-user',
        name: 'Artemis (Demo)',
        age: 27,
        bio: 'This is a development demo profile bypassing authentication.',
        gender: 'Non-binary',
        orientation: 'Queer',
        interestedIn: ['Anyone'],
        plan: 'Elite',
        verificationStatus: 'Verified',
        photoUrl: 'https://picsum.photos/seed/aura_demo/400/400',
        onboardingCompleted: process.env.NEXT_PUBLIC_DEMO_ONBOARDING_COMPLETE === 'true',
        isDemoUser: true,
        isOnline: true,
        lastActive: new Date(),
        phoneNumber: '+91 0000000000',
        dailyChatCount: 0,
        dailyMediaCount: 0,
        dailyLikeCount: 0,
        superLikeBalance: 10,
        incognitoMode: false,
        isSuspended: false,
        isAdmin: true
      };

      setUser(demoUser);
      setProfile(demoProfile);
      setLoading(false);
      return;
    }

    // 2. Real Firebase Authentication Logic
    const { auth, db } = initializeFirebase();
    if (!auth || !db) return;

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        
        const unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
            clearTimeout(timeoutId);
          },
          (error) => {
            console.error('Profile sync error:', error);
            setLoading(false);
            clearTimeout(timeoutId);
          }
        );

        // Initial online presence update
        updateDoc(userRef, {
          isOnline: true,
          lastActive: serverTimestamp()
        }).catch(() => {});

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() }).catch(() => {});
          } else {
            updateDoc(userRef, { isOnline: false }).catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          unsubscribeProfile();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          updateDoc(userRef, { isOnline: false }).catch(() => {});
        };
      } else {
        setProfile(null);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      unsubscribeAuth();
      clearTimeout(timeoutId);
    };
  }, []);

  // Separate effect for daily reset logic to avoid snapshot loops
  useEffect(() => {
    if (!profile || profile.isDemoUser) return;
    const { db } = initializeFirebase();
    if (!db) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const updates: any = {};
    
    if (profile.lastResetDate !== today) {
      updates.dailyChatCount = 0;
      updates.dailyMediaCount = 0;
      updates.lastResetDate = today;
    }
    
    if (profile.lastLikeResetDate !== today) {
      updates.dailyLikeCount = 0;
      updates.lastLikeResetDate = today;
    }

    if (Object.keys(updates).length > 0) {
      const userRef = doc(db, 'users', profile.uid);
      updateDoc(userRef, updates).catch(() => {});
    }
  }, [profile?.uid, profile?.lastResetDate, profile?.lastLikeResetDate, profile?.isDemoUser]);

  const value = {
    user,
    profile,
    loading,
    onboardingCompleted: !!profile?.onboardingCompleted,
    exitDemoMode,
    loginAsDemo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
