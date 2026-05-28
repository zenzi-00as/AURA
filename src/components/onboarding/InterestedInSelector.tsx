
"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_CATEGORIES = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman"
];

interface InterestedInSelectorProps {
  gender: string;
  orientation: string;
  selected: string[];
  onToggle: (interest: string) => void;
  onBulkSelect: (interests: string[]) => void;
}

export function InterestedInSelector({ gender, orientation, selected, onToggle, onBulkSelect }: InterestedInSelectorProps) {
  
  const handleQuickAction = (type: 'opposite' | 'same' | 'everyone') => {
    if (type === 'everyone') {
      onBulkSelect(["Everyone"]);
      return;
    }

    let interests: string[] = [];
    const isMan = ["Man", "Trans Man"].includes(gender);
    const isWoman = ["Woman", "Trans Woman"].includes(gender);

    if (type === 'opposite') {
      if (isMan) interests = ["Woman", "Trans Woman"];
      else if (isWoman) interests = ["Man", "Trans Man"];
      else interests = ["Everyone"];
    } else if (type === 'same') {
      if (isMan) interests = ["Man", "Trans Man"];
      else if (isWoman) interests = ["Woman", "Trans Woman"];
      else interests = ["Non-binary"];
    }

    onBulkSelect(interests);
  };

  const isEveryone = selected.includes("Everyone");

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 px-1">
        <button
          onClick={() => handleQuickAction('opposite')}
          className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-colors"
        >
          <UserPlus size={14} />
          Opposite Gender
        </button>
        <button
          onClick={() => handleQuickAction('same')}
          className="px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-secondary/20 transition-colors"
        >
          <Users size={14} />
          Same Gender
        </button>
        <button
          onClick={() => handleQuickAction('everyone')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border",
            isEveryone 
              ? "fuchsia-gradient text-white border-transparent" 
              : "bg-muted border-border text-muted-foreground hover:border-primary/30"
          )}
        >
          <Sparkles size={14} />
          Everyone
        </button>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Specific Preferences</label>
        <div className="grid grid-cols-1 gap-2">
          {GENDER_CATEGORIES.map((opt) => {
            const isSelected = selected.includes(opt) || isEveryone;
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.98 }}
                disabled={isEveryone}
                onClick={() => onToggle(opt)}
                className={cn(
                  "h-14 px-6 rounded-2xl text-sm font-medium transition-all flex items-center justify-between border",
                  isSelected 
                    ? "fuchsia-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                    : "bg-muted border-border text-foreground hover:border-primary/30",
                  isEveryone && "opacity-50 cursor-not-allowed"
                )}
              >
                <span>{opt}</span>
                {isSelected && <Check size={16} className="text-white" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
