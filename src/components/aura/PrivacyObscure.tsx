"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';
import { usePrivacy } from '@/context/PrivacyContext';

/**
 * @fileOverview Aura Privacy Obscure Wrapper.
 * Automatically blurs or hides children when the application loses focus/visibility.
 */

interface PrivacyObscureProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  active?: boolean;
}

export function PrivacyObscure({ children, placeholder, active = true }: PrivacyObscureProps) {
  const { isPageActive } = usePrivacy();

  if (!active) return <>{children}</>;

  return (
    <div className="relative w-full h-full">
      <AnimatePresence initial={false}>
        {!isPageActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 rounded-[24px] bg-primary/20 flex items-center justify-center text-primary mb-4">
              <Shield size={32} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Protected Content</h3>
            <p className="text-[10px] text-white/40 mt-2">Resume Aura to view this stage.</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={!isPageActive ? 'invisible' : ''}>
        {children}
      </div>
    </div>
  );
}
