"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Lock, Heart, MessageSquare, X, Loader2, MoreVertical, ShieldAlert, UserX, Flag, Circle } from "lucide-react";
import { UserProfile, InteractionType } from "@/lib/types";
import { useAuthContext } from "@/firebase/auth-context";
import { getPlanConfig } from "@/lib/subscription-engine";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { MatchModal } from "./MatchModal";
import { UpgradeModal } from "./UpgradeModal";
import { handleSecureLike } from "@/actions/interactions";
import { handleBlockUser, handleReportUser } from "@/actions/moderation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PrivacyWatermark } from "./PrivacyWatermark";
import { PrivacyObscure } from "./PrivacyObscure";

interface AuraCardProps {
  user: UserProfile;
  onClick?: () => void;
}

const REPORT_CATEGORIES = [
  "Harassment or bullying",
  "Spam or scam",
  "Fake profile / impersonation",
  "Inappropriate content",
  "Sexual or exploitative content",
  "Threats or violence",
  "Hate or abusive behavior",
  "Underage/safety concern",
  "Other"
];

export function AuraCard({ user, onClick }: AuraCardProps) {
  const { profile: currentUser, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: any, feature: string, limit?: number | null} | null>(null);

  // Moderation state
  const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const blurPhotos = planConfig.profilePhotos === 'blurred';
  const showOnline = user.showOnlineStatus !== false && user.isOnline;

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

  const onBlock = async () => {
    if (!currentUser) return;
    const res = await handleBlockUser(currentUser.uid, user.uid, user.name);
    if (res.success) {
      toast({ title: "User Blocked", description: "You will no longer encounter this profile." });
      setIsDetailOpen(false);
    } else {
      toast({ variant: "destructive", title: "Safety sync fault", description: res.error });
    }
  };

  const onReport = async () => {
    if (!currentUser || !reportCategory) return;
    setIsReporting(true);
    const res = await handleReportUser({
      reporterId: currentUser.uid,
      targetId: user.uid,
      reason: reportCategory,
      description: reportDescription
    });
    if (res.success) {
      toast({ title: "Report Submitted", description: "Thank you for helping keep Aura safe." });
      setIsReportDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Report sync fault", description: res.error });
    }
    setIsReporting(false);
  };

  const interactionButtons = (
    <div className="flex items-center gap-2 w-full">
      <button 
        onClick={() => handleInteraction('like')}
        className={cn(
          "h-12 w-14 rounded-2xl flex items-center justify-center transition-all shrink-0 border",
          isLiked ? "bg-primary text-white border-transparent" : "bg-muted border-border text-muted-foreground"
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

  const cardVariants = {
    idle: { scale: 1 },
    hover: { scale: reducedMotion ? 1.01 : 1.03 },
    tap: { scale: reducedMotion ? 0.99 : 0.98 },
    active: { scale: reducedMotion ? 1.02 : 1.06, zIndex: 10 }
  };

  return (
    <>
    <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <motion.div 
        layout 
        variants={cardVariants}
        initial="idle"
        animate={isDetailOpen ? "active" : "idle"}
        whileHover={!isDetailOpen ? "hover" : ""}
        whileTap={!isDetailOpen ? "tap" : ""}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full bg-card border border-border rounded-[22px] overflow-hidden shadow-2xl h-full flex flex-col"
      >
        <SheetTrigger asChild>
          <div className="relative aspect-square cursor-pointer overflow-hidden shrink-0">
            {user.photoUrl ? <img src={user.photoUrl} alt="" className={cn("w-full h-full object-cover", blurPhotos && "blur-xl")} /> : <div className="w-full h-full bg-muted" />}
            
            {/* Soften overlay in light mode to prevent "black texture" smudges */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 dark:from-black/80 to-transparent pointer-events-none" />
            
            {showOnline && (
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md pl-1.5 pr-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Online</span>
              </div>
            )}
          </div>
        </SheetTrigger>

        <div className="p-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-card-foreground truncate max-w-[100px]">{user.name}, {user.age}</h3>
            {user.verificationStatus === 'Verified' && <BadgeCheck size={14} className="text-primary" />}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase"><MapPin size={10} className="text-primary" />{user.distance || "Nearby"}</div>
          <div className="pt-2 mt-auto">{interactionButtons}</div>
        </div>

        <SheetContent 
          side="bottom" 
          className={cn(
            "bg-background border-border text-foreground rounded-t-[40px] p-0 h-[92dvh] overflow-hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-0",
            "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          )}
        >
          <PrivacyObscure>
            <div 
              className="h-full flex flex-col"
              onContextMenu={(e) => e.preventDefault()}
            >
              <header className="px-8 h-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <SheetTitle className="text-sm font-bold text-foreground m-0">{user.name}, {user.age}</SheetTitle>
                        {showOnline && <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />}
                      </div>
                      <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mt-0.5">
                        {showOnline ? "Active Presence" : "Offline"}
                      </span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground ml-2"><MoreVertical size={14} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border text-foreground rounded-2xl">
                          <DropdownMenuItem onClick={() => setIsBlockAlertOpen(true)} className="gap-2 text-rose-500 focus:text-rose-500"><UserX size={16} /> Block User</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)} className="gap-2"><Flag size={16} /> Report User</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
              </header>
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide select-none">
                <div 
                  className="aspect-[3/4] w-full rounded-[40px] overflow-hidden glass-card relative shadow-2xl"
                  onDragStart={(e) => e.preventDefault()}
                >
                  {user.photoUrl && !blurPhotos ? (
                    <>
                      <PrivacyWatermark />
                      <img 
                        src={user.photoUrl} 
                        alt="" 
                        className="w-full h-full object-cover pointer-events-none" 
                        style={{ WebkitTouchCallout: 'none' }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-6">
                      <Lock size={48} className="text-primary/20" />
                      <p className="text-sm text-muted-foreground font-light">Join Elite Plus to unlock full identity photos.</p>
                    </div>
                  )}
                </div>
                <p className="text-lg text-foreground font-light leading-relaxed">{user.bio}</p>
              </div>
              <div className="p-8 border-t border-border bg-background shrink-0 safe-bottom">{interactionButtons}</div>
            </div>
          </PrivacyObscure>
        </SheetContent>
      </motion.div>
    </Sheet>

    <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan} featureName={upgradeModal?.feature || ''} limit={upgradeModal?.limit} />
    <MatchModal isOpen={showMatch} onClose={() => setShowMatch(false)} user={user} currentUser={currentUser} matchType='like' />

    {/* Moderation Dialogs */}
    <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
      <AlertDialogContent className="bg-popover border-border text-foreground rounded-[32px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Block this user?</AlertDialogTitle>
          <AlertDialogDescription>
            Blocked users cannot contact you or interact with your profile. You will no longer see each other in Discovery.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onBlock} className="bg-rose-500 hover:bg-rose-600 text-white border-none">Block</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
      <DialogContent className="bg-popover border-border text-foreground rounded-[32px] p-8">
        <DialogHeader>
          <DialogTitle>Report User</DialogTitle>
          <DialogDescription>Help us keep Aura safe. Your report is strictly private.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={reportCategory} onValueChange={setReportCategory}>
            <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-12">
              <SelectValue placeholder="Select Reason" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground rounded-xl">
              {REPORT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea 
            placeholder="Tell us more (optional)" 
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            className="bg-muted border-border rounded-xl min-h-[100px] resize-none text-foreground"
          />
        </div>
        <DialogFooter>
          <Button onClick={onReport} disabled={!reportCategory || isReporting} className="w-full h-12 premium-gradient font-bold rounded-xl text-white">
            {isReporting ? <Loader2 className="animate-spin" /> : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}