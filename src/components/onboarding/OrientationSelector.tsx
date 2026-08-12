"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrientationSelectorProps {
  gender: string;
  selected: string;
  onSelect: (orientation: string) => void;
}

export function OrientationSelector({ gender, selected, onSelect }: OrientationSelectorProps) {
  const filteredOrientations = useMemo(() => {
    const common = ["Bisexual", "Pansexual", "Asexual", "Queer"];
    
    if (gender === "Man" || gender === "Trans Man") {
      return ["Straight", "Gay", ...common];
    }
    
    if (gender === "Woman" || gender === "Trans Woman") {
      return ["Straight", "Lesbian", ...common];
    }
    
    return ["Queer", "Bisexual", "Pansexual", "Asexual", "Gay", "Lesbian", "Straight"];
  }, [gender]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {filteredOrientations.map((opt) => (
            <motion.button
              key={`orient-${opt}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(opt)}
              className={cn(
                "h-11 px-4 rounded-xl text-xs font-medium transition-all flex items-center justify-between border",
                selected === opt 
                  ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                  : "bg-muted border-border text-foreground hover:border-primary/30"
              )}
            >
              <span className="truncate mr-2">{opt}</span>
              {selected === opt && <Check size={14} className="text-white shrink-0" />}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
