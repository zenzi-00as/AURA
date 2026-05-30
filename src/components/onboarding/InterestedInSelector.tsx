
"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_CATEGORIES = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman"
];

interface InterestedInSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
  onQuickSelect?: () => void;
}

export function InterestedInSelector({ selected, onToggle, onQuickSelect }: InterestedInSelectorProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preferences</label>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selected.length} / 2 Selected</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
          {/* Integrated Quick-Select Option */}
          {onQuickSelect && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onQuickSelect}
              className="h-14 px-5 rounded-2xl bg-primary/5 border border-dashed border-primary/30 text-primary transition-all flex items-center justify-between hover:bg-primary/10"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={16} />
                <span className="text-sm font-semibold">Same as my profile</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </motion.button>
          )}

          {GENDER_CATEGORIES.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(opt)}
                className={cn(
                  "h-14 px-5 rounded-2xl text-sm font-medium transition-all flex items-center justify-between border",
                  isSelected 
                    ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                    : "bg-muted border-border text-foreground hover:border-primary/30"
                )}
              >
                <span className="truncate mr-1">{opt}</span>
                {isSelected && <Check size={16} className="text-white shrink-0" />}
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

import { ChevronRight } from "lucide-react";
