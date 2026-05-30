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

  // Hooks must be called unconditionally at the top level to satisfy Rules of Hooks
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

    // Deterministic Routing: Single source of truth for identity navigation
    if (!user) {
      router.replace('/auth');
    } else if (profile && (profile as any).onboardingCompleted) {
      router.replace('/dashboard');
    } else {
      // New user or incomplete onboarding flow
      router.replace('/onboarding');
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="z-10 flex flex-col items-center">
        {/* Animated Brand Mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.05, 1],
            rotate: 0
          }}
          transition={{ 
            opacity: { duration: 0.8 },
            scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
            rotate: { duration: 1, ease: "easeOut" }
          }}
          className="w-28 h-28 rounded-[36px] fuchsia-gradient aura-glow mb-10 flex items-center justify-center shadow-2xl shadow-primary/30 relative"
        >
          <span className="text-5xl font-bold text-white tracking-tighter">A</span>
          {/* Inner pulse ring */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 rounded-[36px] border-2 border-white/20"
          />
        </motion.div>

        {/* Staggered Content Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Aura</h1>
          <p className="text-muted-foreground font-light tracking-[0.4em] uppercase text-[10px]">
            Minimalist • Private • Real
          </p>
          
          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="w-10 h-10 relative">
              <div className="absolute inset-0 border-2 border-primary/10 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin-fast" />
            </div>
            
            <motion.p 
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold"
            >
              Synchronizing Identity
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Security Disclaimer Footer */}
      <div className="absolute bottom-12 px-8 text-center opacity-20">
        <p className="text-[8px] font-medium uppercase tracking-[0.1em]">
          Secured by Aura Identity Services v2.5.0
        </p>
      </div>
    </div>
  );
}
