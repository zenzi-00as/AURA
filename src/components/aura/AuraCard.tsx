
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
  showDetailsOnly?: boolean;
}

const Sparkle = ({ index }: { index: number }) => {
  const angle = (index / 8) * Math.PI * 2;
  const distance = 35 + Math.random() * 20;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  
  return (
    <motion.div
      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
      animate={{ scale: [0, 1.2, 0], x, y, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: Math.random() * 0.2 }}
      className="absolute z-50 pointer-events-none"
    >
      <Sparkles size={12} className="text-primary fill-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
    </motion.div>
  );
};

const BlueRipple = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0.8 }}
    animate={{ scale: 2.5, opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="absolute inset-0 rounded-full bg-[#1877F2]/30 pointer-events-none z-0"
  />
);

export function AuraCard({ user, onClick, showDetailsOnly = false }: AuraCardProps) {
  const { profile: currentUser } = useAuthContext();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchType, setMatchType] = useState<'like' | 'super_like'>('like');
  const [showSparkles, setShowSparkles] = useState(false);
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

    // Check Plan Limits for Normal Likes
    if (type === 'like' && !isElite(currentUser)) {
      const limit = checkPlanLimit(currentUser, 'dailyLikes') as number;
      if (currentUser.dailyLikeCount >= (limit || 0)) {
        toast({
          title: "Out of Likes",
          description: "Upgrade to Elite for unlimited interactions.",
          variant: "destructive"
        });
        return;
      }
    }

    // Check Super Like Balance
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

      // Create Interaction Record
      await setDoc(likeRef, {
        id: likeId,
        fromUserId: currentUser.uid,
        toUserId: user.uid,
        type: type,
        createdAt: serverTimestamp(),
        status: 'active'
      });

      // Update Local Stats
      const userRef = doc(db, "users", currentUser.uid);
      if (type === 'like') {
        setIsLiked(true);
        setIsSuperLiked(false);
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
        await updateDoc(userRef, { dailyLikeCount: increment(1) });
      } else {
        setIsSuperLiked(true);
        setIsLiked(false);
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 2000);
        await updateDoc(userRef, { superLikeBalance: increment(-1) });
      }

      // Check for Match
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

        // Notification for both
        [currentUser.uid, user.uid].forEach(id => {
          addDoc(collection(db, "notifications"), {
            userId: id,
            title: "It's a Match ✦",
            body: `You and ${id === currentUser.uid ? user.name : currentUser.name} liked each other.`,
            type: "match",
            timestamp: serverTimestamp(),
            read: false,
            referenceId: matchId
          });
        });

        setShowMatch(true);
      } else {
        // Notification for target
        addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: type === 'super_like' ? "Aura Alert ✦" : "New Interest",
          body: type === 'super_like' ? `${currentUser.name} Super Liked you!` : "Someone liked your profile.",
          type: type === 'super_like' ? 'super_like' : 'like',
          timestamp: serverTimestamp(),
          read: false,
          senderId: currentUser.uid
        });
      }

      toast({
        title: type === 'super_like' ? "Super Liked! ✦" : "Profile Liked",
        description: `Your interest was sent to ${user.name}.`
      });

    } catch (error) {
      toast({ variant: "destructive", title: "Interaction failed" });
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

  const buySuperLikeCredit = () => {
    initializeRazorpayPayment({
      amount: 3,
      itemType: 'SuperLike',
      onSuccess: async (res) => {
        if (!db || !currentUser) return;
        await updateDoc(doc(db, "users", currentUser.uid), { 
          superLikeBalance: increment(1) 
        });
        setShowSuperLikeConfirm(false);
        handleInteraction('super_like');
      }
    });
  };

  const interactionButtons = (
    <div className="flex items-center gap-2 w-full">
      <motion.button 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        whileTap={{ scale: 0.82 }}
        animate={isLiked ? { scale: [0.82, 1.18, 1] } : {}}
        transition={{ duration: 0.45, ease: "easeOut" }}
        disabled={isLoading || isLiked || isSuperLiked}
        className={cn(
          "h-12 w-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all relative overflow-hidden shrink-0 touch-none",
          isHolding && "scale-110 shadow-lg aura-glow-purple",
          isLiked ? "bg-[#1877F2] border-[#1877F2] text-white shadow-[0_0_15px_rgba(24,119,242,0.5)]" : 
          isSuperLiked ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(168,85,247,0.4)]" : 
          "text-white/40 hover:text-white"
        )}
        aria-label={isLiked ? "Liked" : isSuperLiked ? "Super Liked" : "Like. Hold to Super Like."}
      >
        <AnimatePresence>
          {showRipple && <BlueRipple />}
        </AnimatePresence>

        {isLoading ? <Loader2 size={14} className="animate-spin" /> : (
          <Heart size={20} className={cn((isLiked || isSuperLiked) && "fill-current")} />
        )}
        
        {isHolding && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-0 left-0 h-1 bg-primary z-10"
          />
        )}
        
        {showSparkles && [...Array(8)].map((_, i) => (
          <Sparkle key={`sparkle-${i}`} index={i} />
        ))}
      </motion.button>

      <button 
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className="flex-1 h-12 rounded-2xl fuchsia-gradient text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-primary/20 gap-2"
      >
        <MessageSquare size={18} />
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Chat</span>
      </button>
    </div>
  );

  if (showDetailsOnly) {
     return <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType={matchType} />;
  }

  return (
    <>
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-[#111116] border border-[#FFFFFF1A] rounded-[22px] overflow-hidden shadow-lg group transition-all h-full flex flex-col will-change-transform relative"
      >
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                user.isOnline && !user.incognitoMode ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-white/20"
              )} />
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                {user.isOnline && !user.incognitoMode ? "Online" : "Offline"}
              </span>
            </div>

            {hasSpotlight && (
              <div className="absolute top-2.5 right-2.5 z-10 bg-primary/20 backdrop-blur-md p-1.5 rounded-lg border border-primary/30">
                <Sparkles size={10} className="text-primary" />
              </div>
            )}

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
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                      <Lock size={18} className="text-white/20" />
                    </div>
                    {blurPhotos && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Elite Only</p>
                        <p className="text-[7px] text-white/30 uppercase font-medium">Upgrade to see identity photo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          </div>
        </SheetTrigger>

        <div className="p-3 flex-1 flex flex-col min-w-0 text-left space-y-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight truncate leading-none">
              {user.name}, {user.age}
            </h3>
            {user.verificationStatus === 'Verified' && (
              <BadgeCheck size={14} className="text-primary shrink-0" />
            )}
          </div>
          
          <div className="flex flex-col gap-1.5">
            {user.distance && (
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold uppercase tracking-tight truncate">
                <MapPin size={10} className="text-primary shrink-0" />
                {user.distance}
              </div>
            )}
            
            <div className="flex items-center gap-1">
               <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-widest truncate">
                 {user.interestedIn?.[0] || "Discovery"}
               </span>
               {user.position && (
                 <span className="bg-white/5 text-white/40 text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest truncate">
                   {user.position}
                 </span>
               )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            {interactionButtons}
          </div>
        </div>

        <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
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
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0 safe-bottom">
               {interactionButtons}
            </div>
          </div>
        </SheetContent>
      </motion.div>
    </Sheet>

    <Dialog open={showSuperLikeConfirm} onOpenChange={setShowSuperLikeConfirm}>
      <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-8 max-w-[320px]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-[24px] premium-gradient mx-auto flex items-center justify-center shadow-lg aura-glow-purple">
            <Sparkles size={32} className="text-white fill-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">Super Like?</h3>
            <p className="text-sm text-white/60 font-light leading-relaxed px-4">Let them know you're especially interested ✨</p>
          </div>
          
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/40 font-bold uppercase tracking-widest">Aura Balance</span>
              <span className="text-primary font-bold">{currentUser?.superLikeBalance || 0}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => {
                if ((currentUser?.superLikeBalance || 0) > 0) {
                  setShowSuperLikeConfirm(false);
                  handleInteraction('super_like');
                } else {
                  buySuperLikeCredit();
                }
              }}
              className="w-full h-14 rounded-2xl premium-gradient text-white font-bold shadow-xl shadow-primary/20"
            >
              {(currentUser?.superLikeBalance || 0) > 0 ? "Send Super Like" : "Get 1 for ₹3"}
            </Button>
            <Button variant="ghost" onClick={() => setShowSuperLikeConfirm(false)} className="w-full h-12 rounded-xl text-white/20 font-bold uppercase tracking-widest text-[10px]">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType={matchType} />
    </>
  );
}
