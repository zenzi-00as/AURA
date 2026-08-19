
'use client';

import React from 'react';
import { useAuthContext } from '@/firebase/auth-context';
import { XCircle, ShieldAlert, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * @fileOverview A floating, draggable debug indicator for Development Demo Mode.
 * Allows members to reposition the status node anywhere on the interaction stage.
 */
export function DemoIndicator() {
  const { profile, exitDemoMode } = useAuthContext();
  
  if (!profile?.isDemoUser) return null;

  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ x: 20, y: 60 }}
      className="fixed z-[200] flex items-center gap-3 pl-2 pr-3 h-10 bg-[#11141C]/90 backdrop-blur-2xl border border-primary/40 rounded-full shadow-[0_0_30px_rgba(0,87,255,0.3)] cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
      whileHover={{ scale: 1.02, borderColor: 'rgba(0, 87, 255, 0.6)' }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <ShieldAlert size={14} className="text-primary animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-primary uppercase tracking-[0.1em] leading-none">Aura Debug</span>
          <span className="text-[7px] text-white/40 uppercase tracking-tighter leading-none mt-0.5">Moveable Node</span>
        </div>
      </div>
      
      <div className="h-4 w-[1px] bg-white/10" />
      
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={exitDemoMode}
        className="flex items-center gap-1.5 hover:text-white transition-colors group"
      >
        <span className="text-[9px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest">Exit</span>
        <XCircle size={14} className="text-white/20 group-hover:text-white" />
      </button>

      <GripVertical size={12} className="text-white/10" />
    </motion.div>
  );
}
