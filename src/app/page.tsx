'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/firebase/auth-context';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

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
    // 3 second loading simulation for splash sequence
    const duration = 3500;
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

    // Tagline rotation
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
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
      {/* Background Layer - Keeping the Ethereal Atmosphere */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-background" />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.1, 0.2, 0.1],
            x: [-10, 10, -10],
            y: [-10, 10, -10]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,rgba(236,72,153,0.1)_30%,transparent_70%)]"
        />
        <div className="aura-noise" />
      </div>
      
      <AnimatePresence>
        {!isSequenceComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="relative z-10 flex flex-col items-center gap-16"
          >
            {/* Unique Aura Logo Materialization */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Circular Energy Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="url(#aura-gradient)"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * progress) / 100}
                  className="transition-all duration-100 ease-out"
                />
                <defs>
                  <linearGradient id="aura-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Orbiting Particles */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 pointer-events-none"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary aura-glow" />
              </motion.div>

              {/* Glass Abstract "A" Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="relative w-20 h-20 rounded-[32px] glass-dark border border-white/10 flex items-center justify-center neon-glow aura-pulse"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] pointer-events-none" />
                <span className="text-4xl font-bold text-white tracking-tighter aura-glow">A</span>
                
                {/* Logo Light Sweep */}
                <motion.div
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                />
              </motion.div>
            </div>

            {/* Loading Stats & Tagline */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={taglineIndex}
                    initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                    transition={{ duration: 0.5 }}
                    className="text-lg font-medium tracking-tight text-white/80"
                  >
                    {TAGLINES[taglineIndex]}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-2 text-[10px] font-bold text-primary uppercase tracking-[0.5em] opacity-40">
                  {Math.round(progress)}% Verified
                </div>
              </div>

              {/* Animated Glowing Orb Placeholder */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-1 rounded-full bg-primary aura-glow"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Base Branding dissolves into Auth base */}
      <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
        <motion.p 
          animate={{ opacity: isSequenceComplete ? 0 : 0.2 }}
          className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold"
        >
          Minimalist • Private • Real
        </motion.p>
      </div>

      {/* Particle Emission Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.2, 0],
              scale: [0, 1.5, 0],
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200,
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-white/20 blur-sm"
          />
        ))}
      </div>
    </div>
  );
}
