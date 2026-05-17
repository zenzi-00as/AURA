"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin } from "lucide-react";
import { UserProfile } from "@/lib/types";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative p-6 glass-card rounded-[32px] cursor-pointer overflow-hidden aura-glow transition-colors"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-8 -mt-8" />
      
      <div className="relative space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xl font-semibold text-foreground">{user.name}, {user.age}</h3>
              {user.verificationStatus === 'Verified' && (
                <BadgeCheck size={18} className="text-primary" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <MapPin size={12} className="text-primary/60" />
              {user.distance}
            </div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${user.online ? "bg-primary animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.5)]" : "bg-muted"}`} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-light">
          {user.bio}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-bold text-foreground/60 uppercase tracking-widest border border-border">
            {user.gender}
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-bold text-foreground/60 uppercase tracking-widest border border-border">
            {user.orientation}
          </span>
        </div>
      </div>
    </motion.div>
  );
}