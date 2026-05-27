'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(useFirestore()!, "users", user.uid);
  }, [user]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef as any);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading) {
      if (!user) {
        // Deterministic redirect to auth
        const timer = setTimeout(() => router.replace('/auth'), 1000);
        return () => clearTimeout(timer);
      }

      if (!profileLoading) {
        // Deterministic redirect based on profile status
        const timer = setTimeout(() => {
          if (profile) {
            router.replace('/dashboard');
          } else {
            router.push('/onboarding');
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [user, authLoading, profile, profileLoading, router, mounted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-[32px] fuchsia-gradient aura-glow mb-8 flex items-center justify-center shadow-2xl shadow-primary/20">
          <span className="text-4xl font-bold text-foreground">A</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-3">Aura</h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground font-light tracking-[0.2em] uppercase text-[10px] text-center">
            Minimalist • Exotic • Real
          </p>
          
          <div className="flex gap-1 items-center justify-center mt-2">
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0 }}
              className="w-1.5 h-1.5 rounded-full bg-primary" 
            />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-primary/60" 
            />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
              className="w-1.5 h-1.5 rounded-full bg-primary/30" 
            />
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-12 text-center">
        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-medium">
          Initializing Identity Protocol
        </p>
      </div>
    </div>
  );
}
