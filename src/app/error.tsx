
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Exception:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen p-8 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-[28px] bg-destructive/10 flex items-center justify-center text-destructive mb-8"
      >
        <AlertCircle size={40} />
      </motion.div>
      
      <div className="space-y-2 mb-10">
        <h2 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h2>
        <p className="text-sm text-white/40 font-light leading-relaxed max-w-[280px] mx-auto">
          Our synchronization stage encountered an unexpected exception.
        </p>
      </div>

      <Button 
        onClick={() => reset()}
        className="h-14 px-8 rounded-2xl premium-gradient text-white font-bold gap-3 shadow-xl"
      >
        <RotateCcw size={18} />
        Try Again
      </Button>

      <div className="mt-12">
        <p className="text-[10px] text-white/10 uppercase tracking-[0.4em] font-bold">Secure Aura Recovery</p>
      </div>
    </div>
  );
}
