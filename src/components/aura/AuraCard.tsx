"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BadgeCheck, 
  MapPin, 
  Shield, 
  Lock, 
  Home, 
  UserCircle, 
  Sparkles, 
  Star, 
  MoreHorizontal, 
  Heart, 
  Zap, 
  MessageSquare,
  ChevronRight,
  X,
  Compass,
  Check,
  Sliders
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
  const isUserElite = user.plan === 'Elite';
  const hasSuperLikes = (currentUser?.superLikeBalance || 0) > 0;

  // Formatting chips - limit to 2
  const identityTags = [
    user.gender,
    user.position,
  ].filter(Boolean).slice(0, 2);

  const lookingFor = user.interestedIn?.slice(0, 2).join(" & ") || "Connections";

  const ActionRow = ({ className, compact = false }: { className?: string, compact?: boolean }) => (
    <div className={cn("flex items-center gap-1.5 w-full", className)}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
        className={cn(
          "rounded-xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
          compact ? "w-10 h-10" : "w-12 h-12",
          isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/60 hover:text-white"
        )}
      >
        <Heart size={compact ? 16 : 20} className={cn(isLiked && "fill-current")} />
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className={cn(
          "flex-1 rounded-xl fuchsia-gradient text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5",
          compact ? "h-10 text-[10px] uppercase tracking-widest" : "h-12 text-xs uppercase tracking-widest"
        )}
      >
        <MessageSquare size={compact ? 14 : 16} />
        <span>Chat</span>
      </button>
    </div>
  );

  return (
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -1 }}
        className="w-full bg-[#101014] border border-[#FFFFFF1A] rounded-2xl overflow-hidden shadow-xl group transition-all h-full flex flex-col"
      >
        {/* Profile Image Area - Shorter height (1:1 aspect) */}
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            {/* Online Indicator - Tiny dot */}
            {!user.incognitoMode && (
              <div className="absolute top-2 left-2 z-10">
                <div className={cn("w-2 h-2 rounded-full", user.isOnline ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-white/20")} />
              </div>
            )}

            {/* Spotlight Badge - Tiny icon only */}
            {hasSpotlight && (
              <div className="absolute top-2 right-2 z-10 bg-primary/20 backdrop-blur-xl p-1 rounded-md border border-primary/40">
                <Sparkles size={10} className="text-primary" />
              </div>
            )}

            {/* Main Image */}
            <div className="w-full h-full">
              {user.photoUrl && !blurPhotos ? (
                <img 
                  src={user.photoUrl} 
                  alt={user.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              ) : (
                <div className="w-full h-full bg-[#17171D] flex flex-col items-center justify-center p-3 text-center relative">
                  <div className={cn("absolute inset-0 bg-cover bg-center opacity-20", blurPhotos && "blur-xl grayscale")} style={{ backgroundImage: `url(${user.photoUrl})` }} />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Lock size={16} className="text-white/30" />
                    {blurPhotos && (
                      <p className="text-[7px] font-bold text-white/50 uppercase tracking-widest">Elite Only</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#101014] via-transparent to-transparent pointer-events-none" />
          </div>
        </SheetTrigger>

        {/* Content Area - Compact padding and strictly essential info */}
        <div className="p-2 flex-1 flex flex-col min-w-0 text-left">
          <div className="space-y-0.5 mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="text-[14px] font-bold text-white tracking-tight truncate">
                {user.name}, {user.age}
              </h3>
              {user.verificationStatus === 'Verified' && (
                <BadgeCheck size={12} className="text-primary shrink-0" />
              )}
            </div>
            
            {user.distance && (
              <div className="flex items-center gap-0.5 text-[9px] text-white/30 font-bold uppercase tracking-tight truncate">
                <MapPin size={8} className="text-primary shrink-0" />
                {user.distance}
              </div>
            )}
          </div>

          {/* Looking For - Tiny chip */}
          <div className="flex mb-1.5">
            <span className="h-5 px-1.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-semibold text-primary/80 uppercase flex items-center truncate max-w-full">
              {lookingFor}
            </span>
          </div>

          {/* Identity Tags - Consolidated row, max 2 */}
          <div className="flex flex-wrap gap-1 mb-2 overflow-hidden h-[20px]">
            {identityTags.map((tag, i) => (
              <span key={i} className="h-5 px-1.5 rounded-md bg-[#17171D] border border-white/5 text-[8px] font-bold text-white/40 uppercase tracking-widest flex items-center whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>

          {/* Action Row - Fixed height, aligned */}
          <ActionRow compact className="mt-auto" />
        </div>

        {/* Full Profile Detail Sheet */}
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
                        <span key={i} className="px-4 py-2 rounded-2xl bg-secondary/10 border border-secondary/20 text-[11px] font-bold text-secondary uppercase tracking-widest">
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
