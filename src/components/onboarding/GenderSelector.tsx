
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman", 
  "Genderfluid", "Agender"
];

interface GenderSelectorProps {
  selected: string;
  onSelect: (gender: string) => void;
}

export function GenderSelector({ selected, onSelect }: GenderSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {GENDER_OPTIONS.map((opt) => (
          <motion.button
            key={opt}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt)}
            className={cn(
              "h-14 px-4 rounded-2xl text-sm font-medium transition-all flex items-center justify-between border",
              selected === opt 
                ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                : "bg-muted border-border text-foreground hover:border-primary/30"
            )}
          >
            <span>{opt}</span>
            {selected === opt && <Check size={16} className="text-white" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
