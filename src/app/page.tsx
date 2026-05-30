
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

    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/auth');
      } else if (profile && (profile as any).onboardingCompleted) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }, 800); // Minimalist brand reveal timing

    return () => clearTimeout(timer);
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center shadow-2xl shadow-primary/20 aura-glow">
          <span className="text-4xl font-bold text-white">A</span>
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Aura</h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] font-bold">Minimal • Private • Real</p>
        </div>
      </motion.div>
    </div>
  );
}
