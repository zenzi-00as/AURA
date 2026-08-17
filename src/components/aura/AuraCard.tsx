"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BadgeCheck, 
  MapPin, 
  Shield, 
  Lock, 
  Sparkles, 
  Heart, 
  MessageSquare,
  X,
  Loader2,
  Info,
  Clock,
  Star
} from "lucide-react";
import { UserProfile, InteractionType } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { isElite, isSpotlightActive, checkPlanLimit } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment, collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { MatchModal } from "./MatchModal";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

const BlueRipple = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0.8 }}
    animate={{ scale: 2.5, opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="absolute inset-0 rounded-full bg-[#1877F2]/30 pointer-events-none z-0"
  />
);

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser } = useAuthContext();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchType, setMatchType] = useState<'like' | 'super_like'>('like');
  const [showRipple, setShowRipple] = useState(false);

  // Long press logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredLongPress = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [showSuperLikeConfirm, setShowSuperLikeConfirm] = useState(false);

  useEffect(() => {
    if ((user as any).interactionType === 'like') setIsLiked(true);
    if ((user as any).interactionType === 'super_like') setIsSuperLiked(true);
  }, [user]);

  const blurPhotos = !isElite(currentUser);
  const hasSpotlight = isSpotlightActive(user);

  const handleInteraction = async (type: InteractionType) => {
    if (!db || !currentUser || isLoading) return;

    if (type === 'like' && !isElite(currentUser)) {
      const limit = checkPlanLimit(currentUser, 'dailyLikes') as number;
      if (currentUser.dailyLikeCount >= (limit || 0)) {
        toast({
          title: "Like Limit Reached",
          description: `Aura Free allows ${limit} likes per day. Upgrade to Elite Plus for unlimited interest.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (type === 'super_like' && (currentUser.superLikeBalance || 0) <= 0) {
      setShowSuperLikeConfirm(true);
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
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
        await updateDoc(userRef, { dailyLikeCount: increment(1) });
      } else {
        setIsSuperLiked(true);
        await updateDoc(userRef, { superLikeBalance: increment(-1) });
      }

      if (reverseLikeSnap.exists()) {
        const matchId = [currentUser.uid, user.uid].sort().join("_");
        setMatchType(type);
        await setDoc(doc(db, "matches", matchId), {
          id: matchId,
          userIds: [currentUser.uid, user.uid],
          createdAt: serverTimestamp(),
          status: 'active',
          matchSource: type
        });
        setShowMatch(true);
      }

      toast({
        title: type === 'super_like' ? "Super Liked! ✦" : "Profile Liked",
        description: `Connected with ${user.name}.`
      });

    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLoading || isLiked || isSuperLiked) return;
    e.stopPropagation();
    hasTriggeredLongPress.current = false;
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      hasTriggeredLongPress.current = true;
      setIsHolding(false);
      setShowSuperLikeConfirm(true);
    }, 600);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isLoading || isLiked || isSuperLiked) return;
    e.stopPropagation();
    setIsHolding(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!hasTriggeredLongPress.current) {
        handleInteraction('like');
      }
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsHolding(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const interactionButtons = (
    <div className="flex items-center gap-2 w-full">
      <motion.button 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        whileTap={{ scale: 0.85 }}
        animate={isLiked ? { scale: [1, 1.15, 1] } : {}}
        disabled={isLoading || isLiked || isSuperLiked}
        className={cn(
          "h-12 w-14 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden shrink-0 touch-none border",
          isLiked ? "bg-gradient-to-br from-[#0057FF] to-[#0084FF] border-transparent aura-glow-blue" : 
          isSuperLiked ? "premium-gradient border-transparent neon-glow" : 
          "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
        )}
      >
        <AnimatePresence>
          {showRipple && <BlueRipple />}
        </AnimatePresence>

        {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
          <Heart size={20} className={cn((isLiked || isSuperLiked) && "text-white")} />
        )}
        
        {isHolding && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-0 left-0 h-1 bg-white/40 z-10"
          />
        )}
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
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-[#11141C] border border-white/10 rounded-[22px] overflow-hidden shadow-2xl group transition-all h-full flex flex-col"
      >
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <div className={cn("w-1.5 h-1.5 rounded-full", user.isOnline && !user.incognitoMode ? "bg-[#00D084] shadow-[0_0_8px_#00D084]" : "bg-white/20")} />
              <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
                {user.isOnline && !user.incognitoMode ? "Online" : "Offline"}
              </span>
            </div>

            {hasSpotlight && (
              <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-primary/20 backdrop-blur-md px-2 py-1 rounded-full border border-primary/30 aura-glow-blue animate-pulse">
                <span className="text-[10px]">🌟</span>
                <span className="text-[8px] font-black text-white uppercase tracking-tighter">Spotlight</span>
              </div>
            )}

            {user.photoUrl && !blurPhotos ? (
              <img src={user.photoUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full bg-[#0B0F18] flex items-center justify-center p-4 text-center">
                <Lock size={24} className="text-white/10" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        </SheetTrigger>

        <div className="p-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate max-w-[100px]">{user.name}, {user.age}</h3>
            {user.verificationStatus === 'Verified' && <BadgeCheck size={14} className="text-primary" />}
            {hasSpotlight && (
              <div className="flex items-center gap-0.5 bg-primary/20 px-1.5 py-0.5 rounded-full border border-primary/30 aura-glow-blue animate-pulse">
                <span className="text-[10px]">🌟</span>
                <span className="text-[8px] font-black text-white uppercase tracking-tighter">Spotlight</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[9px] text-white/50 font-bold uppercase">
              <MapPin size={10} className="text-primary" />
              {user.distance || "Nearby"}
            </div>
            <div className="flex flex-wrap gap-1">
               <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-widest">
                 {user.gender || "Citizen"}
               </span>
            </div>
          </div>

          <p className="text-[10px] text-white/40 font-light line-clamp-2 italic leading-relaxed flex-1">
            {user.bio || "Connecting with the Aura..."}
          </p>

          <div className="pt-2 mt-auto">
            {interactionButtons}
          </div>
        </div>

        <SheetContent side="bottom" className="bg-[#05070D] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
          <div className="h-full flex flex-col">
            <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 bg-[#080A10E0] backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl glass border border-white/10 overflow-hidden">
                   <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-sm font-bold text-white">{user.name}, {user.age}</SheetTitle>
                    {user.verificationStatus === 'Verified' && <BadgeCheck size={14} className="text-primary" />}
                    {hasSpotlight && (
                      <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30 aura-glow-blue animate-pulse">
                        <span className="text-[10px]">🌟</span>
                        <span className="text-[9px] font-bold text-white uppercase">Spotlight</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{user.distance}</span>
                </div>
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
                    <Button onClick={() => router.push('/profile?tab=elite')} className="w-full h-14 blue-gradient rounded-2xl font-bold text-white shadow-xl neon-glow">Join Elite Plus</Button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Full Bio</h4>
                   <p className="text-lg text-white font-light leading-relaxed">{user.bio}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Identity</span>
                      <p className="text-sm font-medium text-white">{user.gender}</p>
                   </div>
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Orientation</span>
                      <p className="text-sm font-medium text-white">{user.orientation}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-[#05070D] shrink-0 safe-bottom">
               {interactionButtons}
            </div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>

    <Dialog open={showSuperLikeConfirm} onOpenChange={setShowSuperLikeConfirm}>
      <DialogContent className="bg-[#05070D] border-white/10 rounded-[32px] p-8 max-w-[320px]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-[24px] premium-gradient mx-auto flex items-center justify-center shadow-lg neon-glow">
            <Sparkles size={32} className="text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">Super Like?</h3>
            <p className="text-sm text-white/60 font-light">Make your interest stand out ✦</p>
          </div>
          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => {
                if ((currentUser?.superLikeBalance || 0) > 0) {
                  setShowSuperLikeConfirm(false);
                  handleInteraction('super_like');
                } else {
                  initializeRazorpayPayment({
                    amount: 3,
                    itemType: 'SuperLike',
                    onSuccess: async () => {
                      await updateDoc(doc(db, "users", currentUser!.uid), { superLikeBalance: increment(1) });
                      setShowSuperLikeConfirm(false);
                      handleInteraction('super_like');
                    }
                  });
                }
              }}
              className="w-full h-14 rounded-2xl blue-gradient text-white font-bold shadow-xl neon-glow"
            >
              {(currentUser?.superLikeBalance || 0) > 0 ? "Send Super Like" : "Get 1 for ₹3"}
            </Button>
            <Button variant="ghost" onClick={() => setShowSuperLikeConfirm(false)} className="w-full h-12 text-white/40 uppercase tracking-widest text-[10px]">Maybe Later</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType={matchType} />
    </>
  );
}
