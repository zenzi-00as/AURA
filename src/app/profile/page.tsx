
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { 
  BadgeCheck, 
  Settings, 
  LogOut, 
  Shield, 
  Heart, 
  Pencil, 
  Sparkles, 
  Check, 
  MessageSquare, 
  Lock, 
  Info, 
  Star, 
  Image as ImageIcon, 
  ChevronRight, 
  AlertCircle, 
  Clock,
  X,
  Plus,
  Minus,
  Eye,
  ShieldCheck,
  UserCheck,
  Compass,
  SlidersHorizontal,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection, increment } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PLAN_CONFIG, isElite, isElitePlus, isSpotlightActive, usePlan, checkPlanLimit } from "@/lib/plan-limits";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { formatPrice, currency } = useCurrency();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const { plan: currentPlan, remainingDailyChats, remainingDailyLikes, remainingDailyMedia } = usePlan();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isIncognito, setIsIncognito] = useState(false);
  
  const [superLikeQty, setSuperLikeQty] = useState(1);
  const [activeSheet, setActiveSheet] = useState<'elite' | 'eliteplus' | 'spotlight' | 'superlike' | null>(null);

  useEffect(() => {
    if (profile?.bio) setTempBio(profile.bio);
    if (profile?.incognitoMode) setIsIncognito(true);
  }, [profile]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'elite') setActiveSheet('elite');
    else if (tab === 'eliteplus') setActiveSheet('eliteplus');
    else if (tab === 'spotlight') setActiveSheet('spotlight');
    else if (tab === 'superlike') setActiveSheet('superlike');
  }, [searchParams]);

  const handleSave = async () => {
    if (!db || !authUser) return;
    try {
      await updateDoc(doc(db, "users", authUser.uid), { bio: tempBio });
      setIsEditing(false);
      toast({ title: "Profile Updated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handlePurchase = (itemType: 'Elite' | 'ElitePlus' | 'Spotlight' | 'SuperLike', amount: number, quantity: number = 1) => {
    initializeRazorpayPayment({
      amount,
      currency: currency.code,
      itemType: itemType as any,
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        const userRef = doc(db, "users", authUser.uid);
        
        if (itemType === 'Elite' || itemType === 'ElitePlus') {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 28);
          await updateDoc(userRef, { 
            plan: itemType === 'Elite' ? 'elite' : 'elite_plus', 
            subscriptionEndDate: expiry,
            subscriptionStatus: 'Active'
          });
        } else if (itemType === 'Spotlight') {
          const currentExp = profile?.spotlightExpiry?.toDate ? profile.spotlightExpiry.toDate() : (profile?.spotlightExpiry ? new Date(profile.spotlightExpiry) : new Date());
          const baseDate = currentExp > new Date() ? currentExp : new Date();
          const newExpiry = new Date(baseDate);
          newExpiry.setDate(newExpiry.getDate() + 7);
          await updateDoc(userRef, { spotlightExpiry: newExpiry });
        } else if (itemType === 'SuperLike') {
          await updateDoc(userRef, { superLikeBalance: increment(quantity) });
        }

        await addDoc(collection(db, "purchases"), {
          uid: authUser.uid,
          itemType,
          amount,
          currency: currency.code,
          timestamp: serverTimestamp(),
          razorpayOrderId: res.razorpay_order_id,
          status: 'Success'
        });

        setActiveSheet(null);
        toast({ title: "Activation Successful!", description: `Your ${itemType} feature is now active.` });
      }
    });
  };

  const handleSignOut = () => {
    const { auth } = initializeFirebase();
    if (auth) auth.signOut().then(() => router.replace('/auth'));
  };

  const eliteTier = isElite(profile);
  const plusTier = isElitePlus(profile);
  const spotlight = isSpotlightActive(profile);

  const subDaysRemaining = useMemo(() => {
    if (!profile?.subscriptionEndDate) return 0;
    const end = profile.subscriptionEndDate.toDate ? profile.subscriptionEndDate.toDate() : new Date(profile.subscriptionEndDate);
    return Math.max(0, differenceInDays(end, new Date()));
  }, [profile]);

  const ComparisonTable = () => (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Plan Comparison</h3>
      <div className="rounded-3xl border border-white/5 overflow-hidden bg-white/5">
        <div className="grid grid-cols-4 bg-white/10 p-4 text-[8px] font-bold uppercase tracking-widest text-white/60">
          <div>Feature</div>
          <div className="text-center">Free</div>
          <div className="text-center text-primary">Elite</div>
          <div className="text-center text-[#2563FF]">Elite+</div>
        </div>
        {[
          { label: "Daily Chats", free: "5", elite: "15", plus: "Unlimited" },
          { label: "Search Radius", free: "25km", elite: "50km", plus: "100km" },
          { label: "Profile Photos", free: "Blurred", elite: "Blurred", plus: "Visible" },
          { label: "Media Sharing", free: "2/day", elite: "5/day", plus: "Unlimited" },
          { label: "No Ads", free: "—", elite: "—", plus: "✓" },
          { label: "Who Likes You", free: "—", elite: "✓", plus: "✓" },
          { label: "Incognito", free: "—", elite: "—", plus: "✓" },
        ].map((row, i) => (
          <div key={`compare-row-${i}`} className="grid grid-cols-4 p-4 text-[10px] border-t border-white/5 items-center">
            <div className="text-white/80">{row.label}</div>
            <div className="text-center text-white/30">{row.free}</div>
            <div className="text-center text-primary font-bold">{row.elite}</div>
            <div className="text-center text-[#2563FF] font-bold">{row.plus}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 pt-4 pb-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('profile')}</h1>
        <div className="flex gap-2">
          {profile?.isAdmin && (
            <button onClick={() => router.push('/admin')} className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary"><Shield size={18} /></button>
          )}
          <button onClick={() => router.push('/settings')} className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground"><Settings size={18} /></button>
        </div>
      </header>

      <div className="px-8 space-y-10">
        {profile && (
          <div className="flex flex-col items-center text-center space-y-6 pt-6">
            <div className="relative">
              <div className={cn(
                "w-36 h-36 rounded-[48px] bg-muted border-2 flex items-center justify-center aura-glow overflow-hidden relative transition-all",
                eliteTier ? "border-primary shadow-[0_0_20px_rgba(0,87,255,0.3)]" : "border-primary/20"
              )}>
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-foreground/20">{profile.name?.[0] || 'U'}</span>
                )}
                {plusTier && (
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-[48px] animate-pulse pointer-events-none" />
                )}
              </div>
              {profile.verificationStatus === 'Verified' && (
                <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-2xl fuchsia-gradient flex items-center justify-center border-4 border-background shadow-xl">
                  <BadgeCheck size={22} className="text-white" />
                </div>
              )}
              {spotlight && (
                <div className="absolute -top-2 -left-2 w-11 h-11 rounded-2xl bg-primary flex items-center justify-center border-4 border-background shadow-xl">
                  <Star size={20} className="text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
                {profile.name}, {profile.age}
                {eliteTier && <Star size={20} className="text-primary" />}
              </h2>
              <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                <Shield size={12} />
                {profile.plan === 'elite' ? 'Elite' : profile.plan === 'elite_plus' ? 'Elite Plus' : 'Free'} Member
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 px-1">
           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Super Likes</span>
              <span className="text-sm font-bold text-white">{profile?.superLikeBalance || 0}</span>
           </div>
           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Spotlight</span>
              <span className={cn("text-[9px] font-bold", spotlight ? "text-primary" : "text-white/40")}>
                {spotlight ? "Active" : "Inactive"}
              </span>
           </div>
           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Premium</span>
              <span className={cn("text-[9px] font-bold", eliteTier ? "text-primary" : "text-white/40")}>
                {eliteTier ? `${subDaysRemaining}d left` : "Upgrade"}
              </span>
           </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Membership Hub</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide -mx-2 px-2">
              {/* Elite Card */}
              <Sheet open={activeSheet === 'elite'} onOpenChange={(o) => setActiveSheet(o ? 'elite' : null)}>
                <SheetTrigger asChild>
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] premium-gradient text-white border border-white/10 text-left relative overflow-hidden group transition-all",
                      profile?.plan === 'elite' && "opacity-90 shadow-[0_0_25px_rgba(37,99,255,0.3)]"
                    )}
                  >
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 text-white px-2 py-0.5 rounded-md">Elite</span>
                         {profile?.plan === 'elite' && <Check size={14} className="text-white" />}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight">{formatPrice(99)} / 28 Days</h3>
                        <p className="text-[10px] opacity-70">Unlock essential premium benefits and search reach.</p>
                      </div>
                    </div>
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                  <div className="h-full flex flex-col">
                    <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                      <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                      <SheetTitle className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite</SheetTitle>
                      <div className="w-10 h-10" />
                    </header>
                    <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                       <ComparisonTable />
                    </div>
                    <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                       <Button onClick={() => handlePurchase('Elite', 99)} disabled={profile?.plan === 'elite'} className="w-full h-16 rounded-[24px] bg-primary text-white font-bold text-lg">
                          {profile?.plan === 'elite' ? "Active Membership" : `Upgrade to Elite — ${formatPrice(99)}`}
                       </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Elite Plus Card */}
              <Sheet open={activeSheet === 'eliteplus'} onOpenChange={(o) => setActiveSheet(o ? 'eliteplus' : null)}>
                <SheetTrigger asChild>
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] premium-gradient text-white relative overflow-hidden group border border-white/10 transition-all",
                      profile?.plan === 'elite_plus' && "opacity-90 shadow-[0_0_25px_rgba(37,99,255,0.3)]"
                    )}
                  >
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-md">Elite Plus</span>
                         {profile?.plan === 'elite_plus' && <Check size={14} className="text-white" />}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight">{formatPrice(199)} / 28 Days</h3>
                        <p className="text-[10px] opacity-70">Unlock the complete Aura luxury experience.</p>
                      </div>
                    </div>
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                  <div className="h-full flex flex-col">
                    <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                      <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                      <SheetTitle className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite Plus</SheetTitle>
                      <div className="w-10 h-10" />
                    </header>
                    <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                       <ComparisonTable />
                    </div>
                    <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                       <Button onClick={() => handlePurchase('ElitePlus', 199)} disabled={profile?.plan === 'elite_plus'} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg neon-glow">
                          {profile?.plan === 'elite_plus' ? "Active Membership" : `Upgrade to Elite Plus — ${formatPrice(199)}`}
                       </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex justify-center -mt-2 mb-4">
              <motion.div 
                animate={{ x: [0, 8, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2"
              >
                <div className="h-[2px] w-6 rounded-full bg-primary/30" />
                <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">Swipe to Compare</span>
                <div className="h-[2px] w-6 rounded-full bg-primary/30" />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Sheet open={activeSheet === 'spotlight'} onOpenChange={(o) => setActiveSheet(o ? 'spotlight' : null)}>
                  <SheetTrigger asChild>
                    <button className={cn(
                      "p-6 w-full rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center group hover:border-primary/40 transition-all relative overflow-hidden",
                      spotlight && "bg-primary/10 border-primary/30 aura-glow-purple"
                    )}>
                      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/30 to-transparent pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
                      <div className={cn("w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10", spotlight && "animate-pulse")}>
                        <Star size={24} className="text-primary" />
                      </div>
                      <div className="space-y-1 relative z-10">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Spotlight</h4>
                        <p className="text-sm font-bold text-white">{formatPrice(30)}</p>
                      </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                    <div className="h-full flex flex-col">
                      <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                          <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                          <SheetTitle className="text-sm font-bold uppercase tracking-[0.3em]">Spotlight Boost</SheetTitle>
                          <div className="w-10 h-10" />
                      </header>
                      <div className="p-8 space-y-6">
                        <h3 className="text-2xl font-bold">Priority Discovery</h3>
                        <p className="text-sm text-white/60">Boost your profile to the top of discovery for 7 full days.</p>
                        <Button onClick={() => handlePurchase('Spotlight', 30)} className="w-full h-14 rounded-2xl bg-primary font-bold">Activate Spotlight — {formatPrice(30)}</Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <p className="text-[9px] text-white/30 text-center px-1 font-light leading-snug">Boost your profile visibility for 7 full days.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Sheet open={activeSheet === 'superlike'} onOpenChange={(o) => setActiveSheet(o ? 'superlike' : null)}>
                  <SheetTrigger asChild>
                    <button className="p-6 w-full rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center group hover:border-accent/40 transition-all relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-accent/20 to-transparent pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform relative z-10">
                          <Heart size={24} className="text-accent" />
                      </div>
                      <div className="space-y-1 relative z-10">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Super Likes</h4>
                          <p className="text-sm font-bold text-white">{formatPrice(3)}</p>
                      </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                    <div className="h-full flex flex-col">
                      <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                          <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                          <SheetTitle className="text-sm font-bold uppercase tracking-[0.3em]">Super Likes</SheetTitle>
                          <div className="w-10 h-10" />
                      </header>
                      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 rounded-[32px] bg-accent/10 mx-auto flex items-center justify-center text-accent">
                            <Heart size={40} className="fill-accent" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Stand out from the crowd</h3>
                            <p className="text-sm text-white/60 font-light">3x more likely to get a match with a Super Like.</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-10 py-4">
                           <button onClick={() => setSuperLikeQty(Math.max(1, superLikeQty - 1))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-white/40"><Minus size={24} /></button>
                           <span className="text-4xl font-bold tabular-nums">{superLikeQty}</span>
                           <button onClick={() => setSuperLikeQty(superLikeQty + 1)} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-white/40"><Plus size={24} /></button>
                        </div>

                        <div className="space-y-6">
                          <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                             <div className="flex items-center gap-3 text-accent">
                                <Sparkles size={20} />
                                <h4 className="text-[10px] font-bold uppercase tracking-widest">Interaction Power</h4>
                             </div>
                             <p className="text-sm text-white/80 font-light leading-relaxed">
                               Super like is a special feature that tells someone you are very interested in them. When you tap the blue heart icon on a profile, your profile jumps to the top of their queue and shows up with notification.
                             </p>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { title: "3x More Matches", desc: "Members using Super Likes see a significant increase in synchronization." },
                              { title: "Immediate Notification", desc: "The recipient is instantly alerted of your high-interest synchronization request." },
                              { title: "Cinematic Reveal", desc: "Your profile is highlighted with a premium blue aura in their discovery stage." }
                            ].map((feat, i) => (
                              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                    <Check size={16} />
                                 </div>
                                 <div className="space-y-0.5">
                                    <h5 className="text-[10px] font-bold text-white uppercase">{feat.title}</h5>
                                    <p className="text-[10px] text-white/40 font-light leading-snug">{feat.desc}</p>
                                 </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-8 opacity-20 text-center space-y-4">
                           <div className="w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center mx-auto">
                              <span className="text-xl font-bold">A</span>
                           </div>
                           <p className="text-[8px] font-bold uppercase tracking-[0.4em]">Aura Identity Services</p>
                        </div>
                      </div>
                      <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                         <Button onClick={() => handlePurchase('SuperLike', superLikeQty * 3, superLikeQty)} className="w-full h-16 rounded-[24px] bg-accent text-white font-bold text-lg shadow-lg shadow-accent/20">
                            Get {superLikeQty} Super Like{superLikeQty > 1 ? 's' : ''} — {formatPrice(superLikeQty * 3)}
                         </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <p className="text-[9px] text-white/30 text-center px-1 font-light leading-snug">Express 3x more interest with a ✦ highlight.</p>
              </div>
            </div>
          </div>
        </div>

        {profile && (
          <div className="glass-card p-8 rounded-[40px] space-y-8 relative overflow-hidden">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('about_me')}</h3>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild><button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary"><Pencil size={14} /></button></DialogTrigger>
                  <DialogContent className="bg-[#070709] border-border rounded-[32px] p-8">
                    <DialogHeader><DialogTitle>Edit Presence</DialogTitle></DialogHeader>
                    <Textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="bg-muted min-h-[120px] rounded-2xl p-4 focus:ring-primary" placeholder="Describe your aura..." />
                    <DialogFooter><Button onClick={handleSave} className="w-full h-14 premium-gradient rounded-2xl font-bold">Save Aura</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
            <p className="text-lg leading-relaxed text-foreground font-light">{profile.bio || "No bio added yet."}</p>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-white/5 pt-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chat LIMITS</label>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <MessageSquare size={14} className="text-primary" />
                  {remainingDailyChats === "Unlimited" ? "Unlimited" : `${profile.dailyChatCount} / ${checkPlanLimit(profile, 'dailyNewChats')} Daily`}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MEDIA LIMITS</label>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <ImageIcon size={14} className="text-primary" />
                  {remainingDailyMedia === "Unlimited" ? "Unlimited" : `${profile.dailyMediaCount} / ${checkPlanLimit(profile, 'dailyMediaUploads')} Daily`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {[ 
            { label: t('settings'), path: '/settings', icon: Settings }, 
            { label: t('about'), path: '/about', icon: Info }, 
            { label: t('feedback'), path: '/feedback', icon: MessageSquare } 
          ].map((item) => (
            <button key={item.path} onClick={() => router.push(item.path)} className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between group hover:bg-primary/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><item.icon size={18} /></div><span className="font-medium text-foreground">{item.label}</span></div><div className="text-muted-foreground">→</div></button>
          ))}
          <AlertDialog>
            <AlertDialogTrigger asChild><button className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between group hover:bg-destructive/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><LogOut size={18} /></div><span className="font-medium text-foreground">{t('sign_out')}</span></div><div className="text-muted-foreground">→</div></button></AlertDialogTrigger>
            <AlertDialogContent className="bg-[#070709] border-border rounded-[32px] p-8">
              <AlertDialogHeader className="space-y-4"><div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto"><LogOut size={32} /></div><div className="text-center"><AlertDialogTitle>{t('sign_out')}</AlertDialogTitle><AlertDialogDescription>Are you sure you want to exit the Aura?</AlertDialogDescription></div></AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-3 pt-4"><AlertDialogAction onClick={handleSignOut} className="w-full h-14 premium-gradient rounded-2xl">Sign Out</AlertDialogAction><AlertDialogCancel className="w-full h-12 rounded-xl">Cancel</AlertDialogCancel></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  );
}
