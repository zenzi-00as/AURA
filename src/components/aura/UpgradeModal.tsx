
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Shield, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PlanType } from "@/lib/types";
import { PLAN_CONFIG } from "@/lib/subscription-engine";
import { useCurrency } from "@/context/CurrencyContext";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: PlanType;
  featureName: string;
  limit?: number | null;
}

export function UpgradeModal({ isOpen, onClose, requiredPlan, featureName, limit }: UpgradeModalProps) {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const config = PLAN_CONFIG[requiredPlan];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-card border border-border rounded-t-[40px] sm:rounded-[40px] p-8 text-center space-y-8 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
          
          <div className="space-y-4 relative z-10">
            <div className="w-16 h-16 rounded-[24px] premium-gradient mx-auto flex items-center justify-center shadow-lg neon-glow">
              <Lock size={32} className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {limit !== undefined ? "Daily Limit Reached" : "Unlock Feature"}
              </h2>
              <p className="text-sm text-muted-foreground font-light px-4">
                {limit !== undefined 
                  ? `You've used all ${limit} ${featureName} for today. Upgrade to ${config.displayName} to increase your reach.`
                  : `${featureName} is an exclusive ${config.displayName} benefit.`}
              </p>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <Button 
              onClick={() => {
                onClose();
                router.push(`/profile?tab=${requiredPlan === 'elite_plus' ? 'eliteplus' : 'elite'}`);
              }}
              className="w-full h-14 rounded-2xl premium-gradient text-white font-bold shadow-xl flex items-center justify-between px-6"
            >
              <div className="flex flex-col items-start">
                <span>Join {config.displayName}</span>
                <span className="text-[8px] font-normal opacity-60">+ 18% GST</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60 font-normal">{formatPrice(config.price, true)}</span>
                <ChevronRight size={18} />
              </div>
            </Button>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors py-2"
            >
              Maybe Later
            </button>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <X size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
