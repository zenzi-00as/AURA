"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const INTEREST_OPTIONS = [
  "Man", "Woman", "Non-binary", "Everyone"
];

interface InterestedInSelectorProps {
  selected: string[];
  onToggle: (interest: string) => void;
}

export function InterestedInSelector({ selected, onToggle }: InterestedInSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-medium px-1">You'll see people from these groups in your feed.</p>
      <div className="grid grid-cols-1 gap-2">
        {INTEREST_OPTIONS.map((opt) => {
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
  );
}