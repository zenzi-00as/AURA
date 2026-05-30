
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user, db]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef as any);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading || profileLoading) return;

    if (!user) {
      router.replace('/auth');
    } else if (profile && (profile as any).onboardingCompleted) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  // Silent router for high-velocity startup
  return null;
}
