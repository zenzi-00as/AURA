
"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Shield, Lock } from "lucide-react";
import { UserProfile } from "@/lib/types";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  // Identity Privacy Protocol: NEVER show photoUrl to other users.
  // We strictly use initials placeholders for everyone except the self profile.
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative p-6 glass-card rounded-[32px] cursor-pointer overflow-hidden aura-glow transition-all group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-primary/20 transition-colors" />
      
      <div className="relative space-y-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {/* Privacy Placeholder: Initials only for discovery feed */}
            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center relative shrink-0">
              <span className="text-xl font-bold text-foreground/30 uppercase">{user.name[0]}</span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-background border border-border flex items-center justify-center">
                <Lock size={10} className="text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-semibold text-foreground">{user.name}, {user.age}</h3>
                {user.verificationStatus === 'Verified' && (
                  <BadgeCheck size={18} className="text-primary" />
                )}
              </div>
              {user.distance && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  <MapPin size={12} className="text-primary/60" />
                  {user.distance}
                </div>
              )}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-primary animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.5)]" : "bg-muted"}`} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-light">
          {user.bio}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-3 py-1.5 rounded-xl bg-muted/50 text-[9px] font-bold text-foreground/60 uppercase tracking-widest border border-border">
            {user.gender}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-muted/50 text-[9px] font-bold text-foreground/60 uppercase tracking-widest border border-border">
            {user.orientation}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
