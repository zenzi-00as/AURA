
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_CATEGORIES = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman"
];

interface InterestedInSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
}

export function InterestedInSelector({ selected, onToggle }: InterestedInSelectorProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preferences</label>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selected.length} / 2 Selected</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {GENDER_CATEGORIES.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(opt)}
                className={cn(
                  "h-14 px-6 rounded-2xl text-sm font-medium transition-all flex items-center justify-between border",
                  isSelected 
                    ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                    : "bg-muted border-border text-foreground hover:border-primary/30"
                )}
              >
                <span>{opt}</span>
                {isSelected && <Check size={16} className="text-white" />}
              </motion.button>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-tighter">
        Select up to 2 categories to find your ideal matches.
      </p>
    </div>
  );
}
