
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  onboardingCompleted: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  onboardingCompleted: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { auth, db } = initializeFirebase();

  useEffect(() => {
    // 5-second maximum wait for auth initialization
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Presence Synchronization: Set online status
        const userRef = doc(db, 'users', authUser.uid);
        updateDoc(userRef, {
          isOnline: true,
          lastActive: serverTimestamp()
        }).catch(() => {/* Ignore if user doc doesn't exist yet */});

        // If user is logged in, listen to their profile
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

        // Best effort to set offline status on disconnect (visibility state change)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() });
          } else {
            updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() });
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          unsubscribeProfile();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          // Cleanup: Set offline when session ends (best effort)
          updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() });
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
  }, [auth, db]);

  const value = {
    user,
    profile,
    loading,
    onboardingCompleted: !!profile?.onboardingCompleted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
