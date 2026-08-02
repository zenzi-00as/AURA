
"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Shield, Lock, Home, UserCircle, Sparkles, Star } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { isElite, isSpotlightActive } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser } = useAuthContext();
  const blurPhotos = !isElite(currentUser);
  const hasSpotlight = isSpotlightActive(user);
  const isUserElite = user.plan === 'Elite';

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-7 glass-card cursor-pointer aura-glow transition-all group overflow-hidden",
        hasSpotlight && "border-primary/40 bg-primary/5",
        isUserElite && "border-accent/40 bg-accent/5"
      )}
    >
      {/* Dynamic Aura Reflection */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/30 transition-colors duration-700" />
      
      {hasSpotlight && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-primary/20 backdrop-blur-md px-2 py-1 rounded-full border border-primary/30">
          <Sparkles size={10} className="text-primary" />
          <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">Spotlight</span>
        </div>
      )}

      <div className="relative space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl glass border border-white/20 flex items-center justify-center relative shrink-0 shadow-inner overflow-hidden">
              {user.photoUrl && !blurPhotos ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center", blurPhotos && "blur-xl scale-125")}>
                   <span className="text-2xl font-bold text-white/20 uppercase tracking-tighter">{user.name[0]}</span>
                </div>
              )}
              {blurPhotos && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
                  <Lock size={12} className="text-white/60" />
                  <span className="text-[6px] font-bold text-white/40 uppercase">Elite Only</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">{user.name}, {user.age}</h3>
                {user.verificationStatus === 'Verified' && (
                  <BadgeCheck size={20} className="text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                )}
                {isUserElite && (
                  <Star size={18} className="text-accent fill-accent drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
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
          {!user.incognitoMode && (
            <div className={cn("w-2.5 h-2.5 rounded-full", user.isOnline ? "bg-primary animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.8)]" : "bg-white/10")} />
          )}
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
        </div>
      </div>
    </motion.div>
  );
}
