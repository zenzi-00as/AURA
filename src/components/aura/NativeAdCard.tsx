
"use client";

import { motion } from "framer-motion";
import { Info, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NativeAdCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full bg-[#11141C] border border-white/10 rounded-[22px] overflow-hidden shadow-2xl flex flex-col h-full"
    >
      <div className="relative aspect-square shrink-0 bg-[#0B0F18] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 blue-gradient" />
        <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center shadow-lg neon-glow">
            <Sparkles size={24} className="text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Sponsored</p>
            <h4 className="text-sm font-bold text-white leading-tight">Elevate Your Presence</h4>
          </div>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col space-y-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Promotion</span>
            <Info size={10} className="text-white/20" />
          </div>
          <p className="text-[10px] text-white/60 leading-relaxed line-clamp-2 italic font-light">
            Discover premium features designed for deeper connections in the Aura.
          </p>
        </div>

        <Button 
          variant="outline"
          className="w-full h-10 rounded-xl border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all gap-2"
          onClick={() => window.open('https://firebase.google.com', '_blank')}
        >
          Learn More
          <ExternalLink size={12} />
        </Button>
      </div>
    </motion.div>
  );
}
