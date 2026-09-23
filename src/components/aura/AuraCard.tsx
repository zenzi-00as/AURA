
"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Lock, Sparkles, Heart, MessageSquare, X, Loader2, Star } from "lucide-react";
import { UserProfile, InteractionType } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { getPlanConfig } from "@/lib/subscription-engine";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { MatchModal } from "./MatchModal";
import { UpgradeModal } from "./UpgradeModal";
import { handleSecureLike } from "@/actions/interactions";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: any, feature: string, limit?: number | null} | null>(null);

  const blurPhotos = planConfig.profilePhotos === 'blurred';

  const handleInteraction = async (type: InteractionType) => {
    if (!currentUser || isLoading || isLiked) return;

    setIsLoading(true);
    const result = await handleSecureLike(currentUser.uid, user.uid, type);

    if (result.success) {
      setIsLiked(true);
      toast({ title: type === 'super_like' ? "Super Synchronized! ✦" : "Profile Liked" });
    } else {
      if (result.error.includes("limit")) {
        setUpgradeModal({ isOpen: true, plan: effectivePlan === 'free' ? 'elite' : 'elite_plus', feature: 'Likes' });
      } else {
        toast({ variant: "destructive", title: "Action failed", description: result.error });
      }
    }
    setIsLoading(false);
  };

  const interactionButtons = (
    <div className="flex items-center gap-2 w-full">
      <button 
        onClick={() => handleInteraction('like')}
        className={cn(
          "h-12 w-14 rounded-2xl flex items-center justify-center transition-all shrink-0 border",
          isLiked ? "bg-primary text-white border-transparent" : "bg-white/5 border-white/10 text-white/40"
        )}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={20} />}
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className="flex-1 h-12 rounded-2xl blue-gradient text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center shadow-lg neon-glow gap-2 active:scale-95 transition-transform"
      >
        <MessageSquare size={16} />
        Chat
      </button>
    </div>
  );

  return (
    <>
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-[#11141C] border border-white/10 rounded-[22px] overflow-hidden shadow-2xl h-full flex flex-col">
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            {user.photoUrl ? <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} /> : <div className="w-full h-full bg-[#0B0F18]" />}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        </SheetTrigger>

        <div className="p-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate max-w-[100px]">{user.name}, {user.age}</h3>
            {user.verificationStatus === 'Verified' && <BadgeCheck size={14} className="text-primary" />}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/50 font-bold uppercase"><MapPin size={10} className="text-primary" />{user.distance || "Nearby"}</div>
          <div className="pt-2 mt-auto">{interactionButtons}</div>
        </div>

        <SheetContent side="bottom" className="bg-[#05070D] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
          <div className="h-full flex flex-col">
            <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 bg-[#080A10E0] backdrop-blur-xl shrink-0">
                <SheetTitle className="text-sm font-bold text-white">{user.name}, {user.age}</SheetTitle>
                <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
              <div className="aspect-[3/4] w-full rounded-[40px] overflow-hidden glass-card relative shadow-2xl">
                {user.photoUrl && !blurPhotos ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-6"><Lock size={48} className="text-primary/20" /><p className="text-sm text-white/60 font-light">Join Elite Plus to unlock full identity photos.</p></div>}
              </div>
              <p className="text-lg text-white font-light leading-relaxed">{user.bio}</p>
            </div>
            <div className="p-8 border-t border-white/5 bg-[#05070D] shrink-0 safe-bottom">{interactionButtons}</div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>

    <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan} featureName={upgradeModal?.feature || ''} limit={upgradeModal?.limit} />
    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType='like' />
    </>
  );
}
