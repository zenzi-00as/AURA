"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  BadgeCheck, 
  MapPin, 
  Shield, 
  Lock, 
  Sparkles, 
  Heart, 
  MessageSquare,
  X,
  Compass,
  SlidersHorizontal
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { isElite, isSpotlightActive } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser } = useAuthContext();
  const [isLiked, setIsLiked] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const blurPhotos = !isElite(currentUser);
  const hasSpotlight = isSpotlightActive(user);

  // Formatting chips - minimal for quad grid
  const identityTags = [
    user.gender,
    user.position,
  ].filter(Boolean).slice(0, 2);

  return (
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-[#111116] border border-[#FFFFFF1A] rounded-2xl overflow-hidden shadow-lg group transition-all h-full flex flex-col will-change-transform"
      >
        {/* Profile Image Area - STRICT 1:1 ASPECT */}
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            {/* Online Indicator - Small dot */}
            {!user.incognitoMode && user.isOnline && (
              <div className="absolute top-2 left-2 z-10 w-2 h-2 bg-emerald-500 rounded-full border border-black shadow-[0_0_8px_#10b981] animate-pulse" />
            )}

            {/* Spotlight Badge */}
            {hasSpotlight && (
              <div className="absolute top-2 right-2 z-10 bg-primary/20 backdrop-blur-md p-1 rounded-md border border-primary/30">
                <Sparkles size={8} className="text-primary" />
              </div>
            )}

            {/* Main Image */}
            <div className="w-full h-full bg-[#17171D]">
              {user.photoUrl && !blurPhotos ? (
                <img 
                  src={user.photoUrl} 
                  alt="" 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
                  {user.photoUrl && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-xl grayscale" style={{ backgroundImage: `url(${user.photoUrl})` }} />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-0.5">
                      <Lock size={14} className="text-white/20" />
                    </div>
                    {blurPhotos && (
                      <div className="space-y-0">
                        <p className="text-[7px] font-black text-primary uppercase tracking-widest">Elite Only</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gradient for Legibility */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        </SheetTrigger>

        {/* Content Area - Quad Grid Optimized */}
        <div className="p-2.5 flex-1 flex flex-col min-w-0 text-left space-y-1.5">
          {/* Identity Row */}
          <div className="flex items-center gap-1 min-w-0">
            <h3 className="text-xs font-bold text-white tracking-tight truncate">
              {user.name}, {user.age}
            </h3>
            {user.verificationStatus === 'Verified' && (
              <BadgeCheck size={12} className="text-primary shrink-0" />
            )}
          </div>
          
          {/* Metadata Row */}
          <div className="flex flex-col gap-1">
            {user.distance && (
              <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold uppercase tracking-tight truncate">
                <MapPin size={8} className="text-primary shrink-0" />
                {user.distance}
              </div>
            )}
            <div className="flex">
              <span className="h-5 px-1.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold text-primary/80 uppercase flex items-center truncate max-w-full tracking-tighter">
                {user.interestedIn?.slice(0, 1).join("") || "Discovering"}
              </span>
            </div>
          </div>

          {/* Action Row - Compact Icons */}
          <div className="flex items-center gap-2 pt-1 mt-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
              className={cn(
                "w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/40 hover:text-white"
              )}
            >
              <Heart size={16} className={cn(isLiked && "fill-current")} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="flex-1 h-9 rounded-xl fuchsia-gradient text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-primary/20"
            >
              <MessageSquare size={14} />
            </button>
          </div>
        </div>

        {/* Full Profile Sheet - High Detail Experience */}
        <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
          <div className="h-full flex flex-col">
            <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center overflow-hidden">
                   <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} />
                </div>
                <div className="flex flex-col">
                  <SheetTitle className="text-sm font-bold text-white tracking-tight">{user.name}, {user.age}</SheetTitle>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{user.distance}</span>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
              <div className="aspect-[3/4] w-full rounded-[40px] overflow-hidden glass border-2 border-white/10 relative shadow-2xl">
                {user.photoUrl && !blurPhotos ? (
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#17171D] flex items-center justify-center">
                    <Lock size={48} className="text-white/10" />
                  </div>
                )}
                {blurPhotos && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Lock size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold">Identity Obscured</h4>
                      <p className="text-sm text-white/60 font-light leading-relaxed">Upgrade to Elite Plus to unlock full-resolution identity photos and 100km discovery.</p>
                    </div>
                    <Button className="w-full h-14 premium-gradient rounded-2xl font-bold text-white shadow-xl">Join Elite Plus</Button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Full Bio</h4>
                   <p className="text-lg text-white font-light leading-relaxed">{user.bio}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Identity</span>
                      <p className="text-sm font-medium text-white">{user.gender}</p>
                   </div>
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Orientation</span>
                      <p className="text-sm font-medium text-white">{user.orientation}</p>
                   </div>
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Dynamic</span>
                      <p className="text-sm font-medium text-white">{user.position || "Versatile"}</p>
                   </div>
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Can Host</span>
                      <p className="text-sm font-medium text-white">{user.room || "Ask me"}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">Interests</h4>
                   <div className="flex flex-wrap gap-2">
                      {user.interestedIn?.map((interest, i) => (
                        <span key={`full-interest-${interest}-${i}`} className="px-4 py-2 rounded-2xl bg-secondary/10 border border-secondary/20 text-[11px] font-bold text-secondary uppercase tracking-widest">
                          {interest}
                        </span>
                      ))}
                   </div>
                </div>
              </div>

              <div className="pb-12 text-center">
                 <div className="flex items-center justify-center gap-2 text-white/20 mb-4">
                    <Shield size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Secure Private Discovery</span>
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-background/80 backdrop-blur-xl shrink-0 safe-bottom">
               <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={cn(
                    "w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                    isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/60 hover:text-white"
                  )}
                >
                  <Heart size={24} className={cn(isLiked && "fill-current")} />
                </button>
                <button 
                  onClick={() => onClick?.()}
                  className="flex-1 h-14 rounded-2xl fuchsia-gradient text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} />
                  <span>Send Message</span>
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>
  );
}
