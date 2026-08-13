
"use client";

import React, { useState, useMemo } from "react";
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
  SlidersHorizontal,
  Zap,
  Star,
  Loader2
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

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
  showDetailsOnly?: boolean;
}

export function AuraCard({ user, onClick, showDetailsOnly = false }: AuraCardProps) {
  const { profile: currentUser } = useAuthContext();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);

  const blurPhotos = !isElite(currentUser);
  const hasSpotlight = isSpotlightActive(user);

  const handleInteraction = async (type: InteractionType) => {
    if (!db || !currentUser || isLoading) return;

    // Check Plan Limits for Normal Likes
    if (type === 'like' && !isElite(currentUser)) {
      const limit = checkPlanLimit(currentUser, 'dailyLikes') as number;
      if (currentUser.dailyLikeCount >= limit) {
        toast({
          title: "Out of Likes",
          description: "Upgrade to Elite for unlimited interactions.",
          variant: "destructive"
        });
        return;
      }
    }

    // Check Super Like Balance
    if (type === 'super_like' && currentUser.superLikeBalance <= 0) {
      toast({
        title: "Super Like",
        description: "₹3 each. Refill your balance to use.",
      });
      // Launch Super Like purchase sheet logic or redirect to profile
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
        await updateDoc(userRef, { dailyLikeCount: increment(1) });
      } else {
        setIsSuperLiked(true);
        await updateDoc(userRef, { superLikeBalance: increment(-1) });
      }

      // Check for Match
      if (reverseLikeSnap.exists()) {
        const matchId = [currentUser.uid, user.uid].sort().join("_");
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

  if (showDetailsOnly) {
     return <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} />;
  }

  return (
    <>
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-[#111116] border border-[#FFFFFF1A] rounded-2xl overflow-hidden shadow-lg group transition-all h-full flex flex-col will-change-transform"
      >
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            {!user.incognitoMode && user.isOnline && (
              <div className="absolute top-2 left-2 z-10 w-2 h-2 bg-emerald-500 rounded-full border border-black shadow-[0_0_8px_#10b981] animate-pulse" />
            )}

            {hasSpotlight && (
              <div className="absolute top-2 right-2 z-10 bg-primary/20 backdrop-blur-md p-1 rounded-md border border-primary/30">
                <Sparkles size={8} className="text-primary" />
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
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-0.5">
                      <Lock size={14} className="text-white/20" />
                    </div>
                    {blurPhotos && (
                      <p className="text-[7px] font-black text-primary uppercase tracking-widest">Elite Only</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        </SheetTrigger>

        <div className="p-2.5 flex-1 flex flex-col min-w-0 text-left space-y-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <h3 className="text-xs font-bold text-white tracking-tight truncate">
              {user.name}, {user.age}
            </h3>
            {user.verificationStatus === 'Verified' && (
              <BadgeCheck size={12} className="text-primary shrink-0" />
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            {user.distance && (
              <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold uppercase tracking-tight truncate">
                <MapPin size={8} className="text-primary shrink-0" />
                {user.distance}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1 mt-auto">
            <button 
              disabled={isLoading || isLiked || isSuperLiked}
              onClick={(e) => { e.stopPropagation(); handleInteraction('like'); }}
              className={cn(
                "w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/40 hover:text-white"
              )}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Heart size={16} className={cn(isLiked && "fill-current")} />}
            </button>

            <button 
              disabled={isLoading || isLiked || isSuperLiked}
              onClick={(e) => { e.stopPropagation(); handleInteraction('super_like'); }}
              className={cn(
                "w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                isSuperLiked ? "bg-primary/20 border-primary/40 text-primary" : "text-white/40 hover:text-white"
              )}
            >
              <Star size={16} className={cn(isSuperLiked && "fill-current")} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="flex-1 h-9 rounded-xl fuchsia-gradient text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-primary/20"
            >
              <MessageSquare size={14} />
            </button>
          </div>
        </div>

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
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-background/80 backdrop-blur-xl shrink-0 safe-bottom">
               <div className="flex items-center gap-3 w-full">
                <button 
                  disabled={isLoading || isLiked}
                  onClick={() => handleInteraction('like')}
                  className={cn(
                    "w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                    isLiked ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "text-white/60 hover:text-white"
                  )}
                >
                  <Heart size={24} className={cn(isLiked && "fill-current")} />
                </button>
                <button 
                  disabled={isLoading || isSuperLiked}
                  onClick={() => handleInteraction('super_like')}
                  className={cn(
                    "w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all active:scale-90 shrink-0",
                    isSuperLiked ? "bg-primary/20 border-primary/40 text-primary" : "text-white/60 hover:text-white"
                  )}
                >
                  <Star size={24} className={cn(isSuperLiked && "fill-current")} />
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
    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} />
    </>
  );
}
