'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
        // If user is logged in, listen to their profile
        const unsubscribeProfile = onSnapshot(
          doc(db, 'users', authUser.uid),
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
        return () => unsubscribeProfile();
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
