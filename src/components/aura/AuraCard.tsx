"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Shield, Lock, Home, UserCircle } from "lucide-react";
import { UserProfile } from "@/lib/types";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative p-7 glass-card cursor-pointer aura-glow transition-all group overflow-hidden"
    >
      {/* Dynamic Aura Reflection */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/30 transition-colors duration-700" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-3xl -ml-12 -mb-12" />
      
      <div className="relative space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl glass border border-white/20 flex items-center justify-center relative shrink-0 shadow-inner">
              <span className="text-2xl font-bold text-white/20 uppercase tracking-tighter">{user.name[0]}</span>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg glass border border-white/20 flex items-center justify-center shadow-lg">
                <Lock size={12} className="text-white/60" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">{user.name}, {user.age}</h3>
                {user.verificationStatus === 'Verified' && (
                  <BadgeCheck size={20} className="text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                )}
              </div>
              {user.distance && (
                <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
                  <MapPin size={12} className="text-primary/80" />
                  {user.distance}
                </div>
              )}
            </div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${user.isOnline ? "bg-primary animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.8)]" : "bg-white/10"}`} />
        </div>

        <p className="text-sm text-white/70 line-clamp-2 leading-relaxed font-light italic">
          "{user.bio}"
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <span className="px-4 py-2 rounded-2xl glass border border-white/10 text-[9px] font-bold text-white/60 uppercase tracking-[0.15em] flex items-center gap-2">
            <UserCircle size={12} className="text-primary" />
            {user.position || "Versatile"}
          </span>
          {user.room === "Yes" && (
            <span className="px-4 py-2 rounded-2xl bg-primary/10 text-[9px] font-bold text-primary uppercase tracking-[0.15em] border border-primary/20 flex items-center gap-2">
              <Home size={12} />
              HOSTING
            </span>
          )}
          <span className="px-4 py-2 rounded-2xl glass border border-white/10 text-[9px] font-bold text-white/60 uppercase tracking-[0.15em]">
            {user.gender}
          </span>
          <span className="px-4 py-2 rounded-2xl glass border border-white/10 text-[9px] font-bold text-white/60 uppercase tracking-[0.15em]">
            {user.orientation}
          </span>
        </div>
      </div>
    </motion.div>
  );
}