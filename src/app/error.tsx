'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

/**
 * @fileOverview Aura Global Error Boundary.
 * Captures rendering exceptions and provides a branded recovery stage.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Synchronize rendering failure with server-side logs
    logger.error('Application Render Exception', {
      category: 'UNKNOWN_ERROR',
      service: 'FRONTEND',
      errorName: error.name,
      errorMessage: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050816] min-h-screen p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 hero-radial opacity-50" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-20 h-20 rounded-[28px] bg-destructive/10 flex items-center justify-center text-destructive mb-8 shadow-2xl border border-destructive/20"
      >
        <ShieldAlert size={40} className="animate-pulse" />
      </motion.div>
      
      <div className="relative z-10 space-y-3 mb-12">
        <h2 className="text-3xl font-bold tracking-tighter text-white">Aura Sync Interrupted</h2>
        <p className="text-sm text-white/40 font-light leading-relaxed max-w-[280px] mx-auto italic">
          Your connection to the Aura has encountered an unexpected synchronization exception.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-xs space-y-4">
        <Button 
          onClick={() => reset()}
          className="w-full h-16 rounded-2xl premium-gradient text-white font-bold gap-3 shadow-xl neon-glow active:scale-95 transition-all"
        >
          <RotateCcw size={18} />
          Synchronize Again
        </Button>
        
        <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold">
          Ref: {error.digest?.substring(0, 8) || 'internal_fault'}
        </p>
      </div>

      <div className="absolute bottom-12 left-0 right-0 text-center opacity-20">
        <p className="text-[10px] text-white uppercase tracking-[0.5em] font-black">Secure Aura Recovery</p>
      </div>
    </div>
  );
}
