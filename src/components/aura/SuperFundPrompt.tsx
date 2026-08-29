"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Heart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SuperFundPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Session storage check to prevent repetitive interruptions
    const dismissed = sessionStorage.getItem("aura_fund_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("aura_fund_dismissed", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-x-0 top-[100px] z-[60] flex justify-center px-6 pointer-events-none">
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            className="pointer-events-auto w-full max-w-[320px] bg-black border border-primary/30 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl premium-gradient flex items-center justify-center shadow-lg neon-glow">
                    <Sparkles size={20} className="text-white" />
                 </div>
                 <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white">Support Aura ✨</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Help us grow</p>
                 </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed font-light">
                Help Aura remain a safe haven for LGBTQ+ connections with a small Super Fund contribution.
              </p>

              <div className="flex gap-2">
                 <Button 
                   onClick={() => { handleDismiss(); router.push('/super-fund'); }}
                   className="flex-1 h-10 rounded-xl premium-gradient font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5"
                 >
                    Support Now
                    <ChevronRight size={14} className="shrink-0" />
                 </Button>
                 <button 
                   onClick={handleDismiss}
                   className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white"
                 >
                    Later
                 </button>
              </div>
            </div>

            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/20"
            >
              <X size={12} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
