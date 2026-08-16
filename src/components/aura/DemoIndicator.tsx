
'use client';

import React from 'react';
import { useAuthContext } from '@/firebase/auth-context';
import { XCircle, ShieldAlert } from 'lucide-react';

export function DemoIndicator() {
  const { profile, exitDemoMode } = useAuthContext();
  
  if (!profile?.isDemoUser) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-8 bg-primary/20 backdrop-blur-xl border-b border-primary/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <ShieldAlert size={12} className="text-primary animate-pulse" />
        <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Development Demo Mode Active</span>
      </div>
      <button 
        onClick={exitDemoMode}
        className="flex items-center gap-1.5 hover:text-white transition-colors group"
      >
        <span className="text-[9px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest">Exit Demo</span>
        <XCircle size={12} className="text-white/20 group-hover:text-white" />
      </button>
    </div>
  );
}
