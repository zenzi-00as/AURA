"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface OrientationSelectorProps {
  gender: string;
  selected: string;
  onSelect: (orientation: string) => void;
  showOnProfile: boolean;
  onToggleVisibility: (show: boolean) => void;
}

export function OrientationSelector({ gender, selected, onSelect, showOnProfile, onToggleVisibility }: OrientationSelectorProps) {
  const filteredOrientations = useMemo(() => {
    const common = ["Bisexual", "Pansexual", "Asexual", "Queer"];
    
    if (gender === "Man" || gender === "Trans Man") {
      return ["Straight", "Gay", ...common];
    }
    
    if (gender === "Woman" || gender === "Trans Woman") {
      return ["Straight", "Lesbian", ...common];
    }
    
    // Non-binary, Genderfluid, Agender, etc.
    return ["Queer", "Bisexual", "Pansexual", "Asexual", "Gay", "Lesbian", "Straight"];
  }, [gender]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredOrientations.map((opt) => (
            <motion.button
              key={opt}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(opt)}
              className={cn(
                "h-14 px-6 rounded-2xl text-sm font-medium transition-all flex items-center justify-between border",
                selected === opt 
                  ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                  : "bg-muted border-border text-foreground hover:border-primary/30"
              )}
            >
              <span>{opt}</span>
              {selected === opt && <Check size={16} className="text-white" />}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold">Show on profile</Label>
          <p className="text-[10px] text-muted-foreground">Visible to your matches</p>
        </div>
        <Switch 
          checked={showOnProfile} 
          onCheckedChange={onToggleVisibility} 
        />
      </div>
    </div>
  );
}