
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/firebase/auth-context';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading, onboardingCompleted } = useAuthContext();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth');
    } else if (!onboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/dashboard');
    }
  }, [user, loading, onboardingCompleted, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] aura-pulse" />
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center gap-8"
        >
          <div className="w-24 h-24 rounded-[32px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse shadow-2xl shadow-primary/20">
            <span className="text-4xl font-bold text-white tracking-tighter">A</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2 text-center"
          >
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Aura</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold">Synchronizing Identity</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold opacity-20">
          Minimalist • Private • Real
        </p>
      </div>
    </div>
  );
}
