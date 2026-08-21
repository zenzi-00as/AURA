
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BadgeCheck, 
  MapPin, 
  Lock, 
  Sparkles, 
  Heart, 
  MessageSquare,
  X,
  Loader2,
  Star
} from "lucide-react";
import { UserProfile, InteractionType } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { getPlanConfig, checkActionAllowed } from "@/lib/subscription-engine";
import { cn } from "@/lib/utils";
import { 
  Sheet, 
  SheetContent, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { MatchModal } from "./MatchModal";
import { UpgradeModal } from "./UpgradeModal";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchType, setMatchType] = useState<'like' | 'super_like'>('like');
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: any, feature: string, limit?: number | null} | null>(null);

  // Long press for Super Like
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [showSuperLikeConfirm, setShowSuperLikeConfirm] = useState(false);

  const blurPhotos = planConfig.profilePhotos === 'blurred';
  const hasSpotlight = user.spotlightExpiry && (user.spotlightExpiry.toDate ? user.spotlightExpiry.toDate() : new Date(user.spotlightExpiry)) > new Date();

  const handleInteraction = async (type: InteractionType) => {
    if (!db || !currentUser || isLoading) return;

    // Check Limits
    if (type === 'like') {
      const check = checkActionAllowed(currentUser, 'like');
      if (!check.allowed) {
        setUpgradeModal({ isOpen: true, plan: effectivePlan === 'free' ? 'elite' : 'elite_plus', feature: 'Likes', limit: check.limit });
        return;
      }
    }

    if (type === 'super_like' && (currentUser.superLikeBalance || 0) <= 0) {
      toast({ variant: "destructive", title: "No Super Likes", description: "Purchase Super Likes in the Membership Hub." });
      return;
    }

    setIsLoading(true);
    try {
      const likeId = `${currentUser.uid}_${user.uid}`;
      const reverseLikeId = `${user.uid}_${currentUser.uid}`;
      
      const likeRef = doc(db, "likes", likeId);
      const reverseLikeSnap = await getDoc(doc(db, "likes", reverseLikeId));

      await setDoc(likeRef, {
        id: likeId,
        fromUserId: currentUser.uid,
        toUserId: user.uid,
        type: type,
        createdAt: serverTimestamp(),
        status: 'active'
      });

      const userRef = doc(db, "users", currentUser.uid);
      if (type === 'like') {
        setIsLiked(true);
        await updateDoc(userRef, { 
          'usage.likesUsed': increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        setIsSuperLiked(true);
        await updateDoc(userRef, { 
          superLikeBalance: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

      if (reverseLikeSnap.exists()) {
        const matchId = [currentUser.uid, user.uid].sort().join("_");
        setMatchType(type);
        await setDoc(doc(db, "matches", matchId), { id: matchId, userIds: [currentUser.uid, user.uid], createdAt: serverTimestamp(), status: 'active', matchSource: type });
        setShowMatch(true);
      }

      toast({ title: type === 'super_like' ? "Super Synchronized! ✦" : "Profile Liked" });
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLoading || isLiked || isSuperLiked) return;
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      setIsHolding(false);
      setShowSuperLikeConfirm(true);
    }, 600);
  };

  const handlePointerUp = () => {
    setIsHolding(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!showSuperLikeConfirm) handleInteraction('like');
    }
  };

  const interactionButtons = (
    <div className="flex items-center gap-2 w-full">
      <motion.button 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { setIsHolding(false); if(timerRef.current) clearTimeout(timerRef.current); }}
        className={cn(
          "h-12 w-14 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden shrink-0 border",
          isLiked ? "bg-primary text-white border-transparent shadow-lg" : 
          isSuperLiked ? "premium-gradient text-white border-transparent" : 
          "bg-white/5 border-white/10 text-white/40"
        )}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={20} />}
        {isHolding && <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.6 }} className="absolute bottom-0 left-0 h-1 bg-white/40" />}
      </motion.button>

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
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <div className={cn("w-1.5 h-1.5 rounded-full", user.isOnline && !user.incognitoMode ? "bg-[#00D084]" : "bg-white/20")} />
              <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
                {user.isOnline && !user.incognitoMode ? "Online" : "Offline"}
              </span>
            </div>
            {hasSpotlight && (
              <div className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20 flex items-center justify-center">
                <span style={{ filter: 'hue-rotate(180deg) brightness(1.2)' }}>🌟</span>
              </div>
            )}
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover transition-transform duration-500 hover:scale-105", blurPhotos && "blur-xl")} />
            ) : (
              <div className="w-full h-full bg-[#0B0F18] flex items-center justify-center"><Lock size={24} className="text-white/10" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        </SheetTrigger>

        <div className="p-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate max-w-[100px]">{user.name}, {user.age}</h3>
            {user.verificationStatus === 'Verified' && <BadgeCheck size={14} className="text-primary" />}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/50 font-bold uppercase"><MapPin size={10} className="text-primary" />{user.distance || "Nearby"}</div>
          <p className="text-[10px] text-white/40 font-light line-clamp-2 leading-relaxed flex-1 italic">{user.bio}</p>
          <div className="pt-2 mt-auto">{interactionButtons}</div>
        </div>

        <SheetContent side="bottom" className="bg-[#05070D] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
          <div className="h-full flex flex-col">
            <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 bg-[#080A10E0] backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl glass border border-white/10 overflow-hidden">
                     <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} />
                  </div>
                  <SheetTitle className="text-sm font-bold text-white">{user.name}, {user.age}</SheetTitle>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
              <div className="aspect-[3/4] w-full rounded-[40px] overflow-hidden glass-card relative shadow-2xl">
                {user.photoUrl && !blurPhotos ? (
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0F18] p-8 text-center gap-6">
                    <Lock size={48} className="text-primary/20" />
                    <p className="text-sm text-white/60 font-light">Upgrade to Aura Elite Plus to unlock full-resolution identity photos.</p>
                    <Button onClick={() => { setIsDetailOpen(false); router.push('/profile?tab=eliteplus'); }} className="w-full h-14 blue-gradient rounded-2xl font-bold text-white shadow-xl neon-glow">Join Elite Plus</Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Bio</h4>
                 <p className="text-lg text-white font-light leading-relaxed">{user.bio}</p>
              </div>
            </div>
            <div className="p-8 border-t border-white/5 bg-[#05070D] shrink-0 safe-bottom">{interactionButtons}</div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>

    <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan} featureName={upgradeModal?.feature || ''} limit={upgradeModal?.limit} />
    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType={matchType} />
    </>
  );
}
