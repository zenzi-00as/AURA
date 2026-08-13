
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from './init';
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

  useEffect(() => {
    const { auth, db } = initializeFirebase();
    if (!auth || !db) return;

    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        
        const unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);

              const today = format(new Date(), 'yyyy-MM-dd');
              const updates: any = {};
              
              if (data.lastResetDate !== today) {
                updates.dailyChatCount = 0;
                updates.dailyMediaCount = 0;
                updates.lastResetDate = today;
              }
              
              if (data.lastLikeResetDate !== today) {
                updates.dailyLikeCount = 0;
                updates.lastLikeResetDate = today;
              }

              if (Object.keys(updates).length > 0) {
                updateDoc(userRef, updates).catch(() => {});
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

        updateDoc(userRef, {
          isOnline: true,
          lastActive: serverTimestamp()
        }).catch(() => {});

        const handleVisibilityChange = () => {
          updateDoc(userRef, { 
            isOnline: document.visibilityState !== 'hidden', 
            lastActive: serverTimestamp() 
          }).catch(() => {});
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          unsubscribeProfile();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(() => {});
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
