
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { UserProfile } from '@/lib/types';
import { format } from 'date-fns';

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
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        
        // Listen to profile
        const unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);

              // Daily Limit Reset Logic (Midnight local time)
              const today = format(new Date(), 'yyyy-MM-dd');
              if (data.lastResetDate !== today) {
                updateDoc(userRef, {
                  dailyChatCount: 0,
                  dailyMediaCount: 0,
                  lastResetDate: today
                });
              }
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

        // Presence Logic
        updateDoc(userRef, {
          isOnline: true,
          lastActive: serverTimestamp()
        }).catch(() => {});

        const handleVisibilityChange = () => {
          if (!profile?.incognitoMode) {
            updateDoc(userRef, { 
              isOnline: document.visibilityState !== 'hidden', 
              lastActive: serverTimestamp() 
            });
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          unsubscribeProfile();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
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
