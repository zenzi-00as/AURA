
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

    // Deterministic Routing Logic
    if (!user) {
      router.replace('/auth');
    } else if (profile && (profile as any).onboardingCompleted) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-16 h-16 rounded-[24px] fuchsia-gradient flex items-center justify-center aura-glow"
      >
        <span className="text-2xl font-bold text-white">A</span>
      </motion.div>
    </div>
  );
}
