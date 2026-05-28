"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const GENDER_OPTIONS = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman", 
  "Genderfluid", "Agender", "Prefer not to say"
];

interface GenderSelectorProps {
  selected: string;
  onSelect: (gender: string) => void;
  showOnProfile: boolean;
  onToggleVisibility: (show: boolean) => void;
}

export function GenderSelector({ selected, onSelect, showOnProfile, onToggleVisibility }: GenderSelectorProps) {
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
      
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold">Show on profile</Label>
          <p className="text-[10px] text-muted-foreground">Let others know how you identify</p>
        </div>
        <Switch 
          checked={showOnProfile} 
          onCheckedChange={onToggleVisibility} 
        />
      </div>
    </div>
  );
}