
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
    if (!mounted || authLoading) return;

    // If we've confirmed there's no user, go to auth immediately
    if (!user) {
      router.replace('/auth');
      return;
    }

    // If we have a user, wait for their profile to resolve before deciding next step
    if (!profileLoading) {
      if (profile && (profile as any).onboardingCompleted) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] aura-pulse" />
      
      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="w-24 h-24 rounded-[32px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse">
              <span className="text-4xl font-bold text-white tracking-tighter">A</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold opacity-40">
          Minimalist • Private • Real
        </p>
      </div>
    </div>
  );
}
