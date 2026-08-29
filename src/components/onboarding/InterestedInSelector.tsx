"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_CATEGORIES = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman", "Genderfluid", "Agender"
];

interface InterestedInSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
}

export function InterestedInSelector({ selected, onToggle }: InterestedInSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Preferences</label>
          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{selected.length} / 2 Selected</span>
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
          {GENDER_CATEGORIES.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <motion.button
                key={`interest-${opt}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(opt)}
                className={cn(
                  "h-11 px-4 rounded-xl text-xs font-medium transition-all flex items-center justify-between border",
                  isSelected 
                    ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                    : "bg-muted border-border text-foreground hover:border-primary/30"
                )}
              >
                <span className="truncate mr-1">{opt}</span>
                {isSelected && (
                  <Check 
                    size={14} 
                    className="text-white shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,1)]" 
                    strokeWidth={4.5} 
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground text-center font-medium uppercase tracking-tighter">
        Choose who you want to discover.
      </p>
    </div>
  );
}
