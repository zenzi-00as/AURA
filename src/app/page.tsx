'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/firebase/auth-context';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

/**
 * @fileOverview Aura Splash Node.
 * Features a high-fidelity entry sequence with theme-aware synchronization.
 */

const TAGLINES = [
  "Find Your Aura",
  "Connect Beyond Labels",
  "Meet Authentically",
  "Everyone Belongs",
  "Discover Meaningful Connections"
];

export default function Home() {
  const router = useRouter();
  const { user, loading, onboardingCompleted } = useAuthContext();
  const [progress, setProgress] = useState(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);

  useEffect(() => {
    const duration = 3000;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(nextProgress);
      
      if (nextProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsSequenceComplete(true), 500);
      }
    }, 50);

    const tagInterval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearInterval(tagInterval);
    };
  }, []);

  useEffect(() => {
    if (isSequenceComplete && !loading) {
      if (!user) {
        router.push('/auth');
      } else if (!onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isSequenceComplete, loading, user, onboardingCompleted, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 z-0 hero-radial" />
      
      <AnimatePresence>
        {!isSequenceComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="relative z-10 flex flex-col items-center gap-12"
          >
            <div className="relative w-24 h-24 animate-breathe">
              <div className="absolute inset-0 blue-gradient rounded-[32px] blur-2xl opacity-40" />
              <div className="relative w-full h-full rounded-[32px] blue-gradient flex items-center justify-center shadow-2xl border border-white/10 dark:border-white/10 border-white/30">
                <span className="text-4xl font-bold text-white tracking-tighter">A</span>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={taglineIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-medium tracking-tight text-foreground dark:text-white/90"
                >
                  {TAGLINES[taglineIndex]}
                </motion.p>
              </AnimatePresence>
              <div className="mt-4 w-48 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full blue-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-[10px] text-muted-foreground/40 dark:text-white/20 uppercase tracking-[0.4em] font-bold">
          Premium • Private • Real
        </p>
      </div>
    </div>
  );
}