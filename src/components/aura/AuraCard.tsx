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
  Check
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

  // Formatting chips
  const identityTags = [
    user.gender,
    user.position,
    user.room === "Yes" ? "Hosting" : null,
  ].filter(Boolean);

  const lookingFor = user.interestedIn?.slice(0, 2).join(" & ") || "New connections";

  const ActionRow = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center gap-3 w-full", className)}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
        className={cn(
          "w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center transition-all active:scale-90",
          isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/60 hover:text-white"
        )}
      >
        <Heart size={20} className={cn(isLiked && "fill-current")} />
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); }}
        className="flex-1 h-12 rounded-2xl glass border border-white/10 flex items-center justify-center gap-2 text-white/80 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95"
      >
        <Zap size={16} className="text-amber-400 fill-amber-400" />
        {hasSuperLikes ? "Super Like" : "Buy Super Like"}
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className="flex-1 h-12 rounded-2xl fuchsia-gradient text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform"
      >
        <div className="flex items-center justify-center gap-2">
          <MessageSquare size={16} />
          <span>Chat</span>
        </div>
      </button>
    </div>
  );

  return (
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4 }}
        className="w-full bg-[#111116] border border-[#FFFFFF1A] rounded-[32px] overflow-hidden shadow-2xl group transition-all"
      >
        {/* Profile Image Area */}
        <SheetTrigger asChild>
          <div className="relative aspect-[4/5] cursor-pointer overflow-hidden">
            {/* Online Indicator */}
            {!user.incognitoMode && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <div className={cn("w-2 h-2 rounded-full", user.isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-white/20")} />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">{user.isOnline ? "Online" : "Recently"}</span>
              </div>
            )}

            {/* Menu */}
            <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors">
              <MoreHorizontal size={18} />
            </button>

            {/* Spotlight Badge */}
            {hasSpotlight && (
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-primary/20 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-primary/40">
                <Sparkles size={12} className="text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Spotlight</span>
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
                <div className="w-full h-full bg-[#17171D] flex flex-col items-center justify-center p-8 text-center relative">
                  <div className={cn("absolute inset-0 bg-cover bg-center opacity-30", blurPhotos && "blur-3xl grayscale")} style={{ backgroundImage: `url(${user.photoUrl})` }} />
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                      <Lock size={32} className="text-white/40" />
                    </div>
                    {blurPhotos ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-white uppercase tracking-widest">Elite Only</p>
                        <p className="text-[10px] text-white/40 font-light leading-relaxed">Upgrade to see identity photo</p>
                      </div>
                    ) : (
                      <span className="text-4xl font-bold text-white/10 uppercase">{user.name[0]}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111116] via-transparent to-transparent pointer-events-none" />
          </div>
        </SheetTrigger>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          <div className="space-y-1">
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
              <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold uppercase tracking-[0.1em]">
                <MapPin size={12} className="text-primary" />
                {user.distance}
              </div>
            )}
          </div>

          {/* Looking For */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Looking for:</span>
            <span className="text-[10px] font-semibold text-primary uppercase">{lookingFor}</span>
          </div>

          {/* Bio Preview */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">About</h4>
            <p className="text-sm text-white/70 leading-relaxed font-light line-clamp-2">
              {user.bio || "No bio added yet."}
            </p>
          </div>

          {/* Identity Tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {identityTags.map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-[#17171D] border border-white/5 text-[9px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                {tag === 'Hosting' && <Home size={10} className="text-primary" />}
                {tag}
              </span>
            ))}
          </div>

          {/* Quick Actions */}
          <ActionRow className="pt-2" />
        </div>

        {/* Detail Sheet */}
        <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
          <div className="h-full flex flex-col">
            <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center overflow-hidden">
                   <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white tracking-tight">{user.name}, {user.age}</span>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{user.distance}</span>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
              {/* Massive Hero Photo */}
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

              {/* Identity Details */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Full Bio</h4>
                   <p className="text-lg text-white font-light leading-relaxed leading-relaxed">{user.bio}</p>
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
               <ActionRow />
            </div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>
  );
}
