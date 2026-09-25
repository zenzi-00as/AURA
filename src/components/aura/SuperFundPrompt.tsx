"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * @fileOverview Aura Super Fund Information Prompt.
 * Features a visual arrow node pointing to the Support trigger.
 * Hardened to materialize once per session upon initial application entry.
 */

export function SuperFundPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Session-based synchronization: only materialize once per app entry/session
    const hasShownThisSession = sessionStorage.getItem('aura_sf_prompt_session_shown');
    
    if (!hasShownThisSession) {
      // Materialize the prompt after a short synchronization delay for impact
      const timer = setTimeout(() => {
        setIsVisible(true);
        sessionStorage.setItem('aura_sf_prompt_session_shown', 'true');
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-x-0 top-[76px] z-[60] flex justify-end px-4 pointer-events-none">
          <motion.div
            initial={{ y: -10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -5, opacity: 0, scale: 0.95 }}
            className="pointer-events-auto w-full max-w-[260px] bg-[#11141C] border border-primary/40 rounded-[24px] p-5 shadow-2xl relative overflow-visible"
          >
            {/* Visual Arrow Node pointing to Support Button */}
            <div className="absolute -top-1.5 right-20 w-3.5 h-3.5 bg-[#11141C] border-t border-l border-primary/40 rotate-45 z-0" />
            
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl premium-gradient flex items-center justify-center shadow-lg neon-glow">
                    <Sparkles size={16} className="text-white" />
                 </div>
                 <div className="space-y-0.5">
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-tight">Super Fund</h4>
                    <p className="text-[8px] text-white/30 uppercase tracking-[0.2em]">Community Node</p>
                 </div>
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed font-light">
                Voluntary contributions help us build a safer Aura haven. Support our development mission.
              </p>

              <div className="flex gap-2 pt-1">
                 <Button 
                   onClick={() => { handleDismiss(); router.push('/super-fund'); }}
                   className="flex-1 h-9 rounded-xl premium-gradient font-bold text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5"
                 >
                    Explore
                    <ChevronRight size={12} className="shrink-0" />
                 </Button>
                 <button 
                   onClick={handleDismiss}
                   className="px-3 text-[9px] font-bold text-white/30 uppercase tracking-widest hover:text-white transition-colors"
                 >
                    Later
                 </button>
              </div>
            </div>

            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors"
            >
              <X size={10} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
