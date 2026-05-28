'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user, db]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef as any);

  useEffect(() => {
    if (mounted && !authLoading && !profileLoading) {
      if (!user) {
        router.replace('/auth');
      } else if (profile && profile.onboardingCompleted) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-[32px] fuchsia-gradient aura-glow mb-8 flex items-center justify-center shadow-2xl shadow-primary/20">
          <span className="text-4xl font-bold text-white">A</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Aura</h1>
        <div className="flex flex-col items-center gap-6">
          <p className="text-muted-foreground font-light tracking-[0.3em] uppercase text-[10px] text-center">
            Minimalist • Private • Real
          </p>
          
          <div className="flex gap-2 items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-12 text-center">
        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.2em] font-bold">
          Synchronizing Identity
        </p>
      </div>
    </div>
  );
}
