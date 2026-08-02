
"use client";

import { useAuthContext } from "@/firebase/auth-context";
import { isElite } from "@/lib/plan-limits";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

export function AdBanner() {
  const { profile } = useAuthContext();

  if (isElite(profile)) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-muted/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group"
    >
      <div className="flex justify-between items-center text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">
        <span>Sponsored</span>
        <Info size={10} />
      </div>
      <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center border border-white/5">
        <span className="text-xs text-white/40 font-medium">Premium Content Space</span>
      </div>
      <p className="text-[10px] text-white/30 text-center">Upgrade to Elite to remove advertisements.</p>
      
      {/* Aesthetic shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </motion.div>
  );
}
