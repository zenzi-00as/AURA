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
    if (!mounted || authLoading || (user && profileLoading)) return;

    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/auth');
      } else if (profile && (profile as any).onboardingCompleted) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }, 800); // Slight delay for professional brand impact

    return () => clearTimeout(timer);
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
      {/* Background Ambience */}
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
            <div className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse">
              <span className="text-3xl font-bold text-white tracking-tighter">A</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
