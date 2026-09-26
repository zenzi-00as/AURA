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
  X,
  Plus,
  Minus,
  Zap,
  Eye,
  Clock,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection, increment, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getPlanConfig } from "@/lib/subscription-engine";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { Purchase } from "@/lib/types";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { formatPrice, currency, getGstAmount } = useCurrency();
  const db = useFirestore();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [superLikeQty, setSuperLikeQty] = useState(1);
  const [activeSheet, setActiveSheet] = useState<'free' | 'elite' | 'eliteplus' | 'spotlight' | 'superlike' | 'history' | null>(null);

  useEffect(() => {
    if (profile?.bio) setTempBio(profile.bio);
  }, [profile]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'elite') setActiveSheet('elite');
    else if (tab === 'eliteplus') setActiveSheet('eliteplus');
    else if (tab === 'spotlight') setActiveSheet('spotlight');
    else if (tab === 'superlike') setActiveSheet('superlike');
  }, [searchParams]);

  const purchaseQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(collection(db, "purchases"), where("uid", "==", authUser.uid), orderBy("timestamp", "desc"), firestoreLimit(20));
  }, [db, authUser]);

  const { data: purchaseHistory } = useCollection<Purchase>(purchaseQuery);

  const handleSave = async () => {
    if (!db || !authUser) return;
    try {
      await updateDoc(doc(db, "users", authUser.uid), { bio: tempBio, updatedAt: serverTimestamp() });
      setIsEditing(false);
      toast({ title: "Profile Updated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Sync failed" });
    }
  };

  const handlePurchase = (itemType: 'Elite' | 'ElitePlus' | 'Spotlight' | 'SuperLike', baseAmount: number, quantity: number = 1) => {
    const totalAmount = baseAmount + getGstAmount(baseAmount);
    
    initializeRazorpayPayment({
      amount: totalAmount,
      currency: currency.code,
      itemType: itemType === 'ElitePlus' ? 'Elite' : itemType as any,
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        const userRef = doc(db, "users", authUser.uid);
        
        if (itemType === 'Elite' || itemType === 'ElitePlus') {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 28);
          await updateDoc(userRef, { 
            plan: itemType === 'Elite' ? 'elite' : 'elite_plus',
            subscription: {
              planId: itemType === 'Elite' ? 'elite' : 'elite_plus', 
              status: 'active',
              expiresAt: expiry,
              startedAt: serverTimestamp()
            },
            updatedAt: serverTimestamp()
          });
        } else if (itemType === 'Spotlight') {
          const currentExp = profile?.spotlightExpiry?.toDate ? profile.spotlightExpiry.toDate() : (profile?.spotlightExpiry ? new Date(profile.spotlightExpiry) : new Date());
          const baseDate = currentExp > new Date() ? currentExp : new Date();
          const newExpiry = new Date(baseDate);
          newExpiry.setDate(newExpiry.getDate() + 7);
          await updateDoc(userRef, { spotlightExpiry: newExpiry, updatedAt: serverTimestamp() });
        } else if (itemType === 'SuperLike') {
          await updateDoc(userRef, { superLikeBalance: increment(quantity), updatedAt: serverTimestamp() });
        }

        await addDoc(collection(db, "purchases"), {
          uid: authUser.uid,
          itemType,
          amount: totalAmount,
          currency: currency.code,
          timestamp: serverTimestamp(),
          razorpayOrderId: res.razorpay_order_id,
          status: 'Success'
        });

        setActiveSheet(null);
        toast({ title: "Activation Successful!", description: `${itemType} is now synchronizing with your Aura.` });
      }
    });
  };

  const handleSignOut = () => {
    const { auth } = initializeFirebase();
    if (auth) auth.signOut().then(() => router.replace('/auth'));
  };

  const currentPlanConfig = getPlanConfig(effectivePlan as any);
  const spotlight = profile?.spotlightExpiry && (profile.spotlightExpiry.toDate ? profile.spotlightExpiry.toDate() : new Date(profile.spotlightExpiry)) > new Date();

  const subDaysRemaining = useMemo(() => {
    if (!profile?.subscription?.expiresAt) return 0;
    const end = profile.subscription.expiresAt.toDate ? profile.subscription.expiresAt.toDate() : new Date(profile.subscription.expiresAt);
    return Math.max(0, differenceInDays(end, new Date()));
  }, [profile]);

  const ComparisonTable = ({ mode }: { mode: 'elite' | 'eliteplus' }) => {
    const isPlus = mode === 'eliteplus';
    const leftPlanLabel = isPlus ? "Elite" : "Main Plan";
    const rightPlanLabel = isPlus ? `Elite Plus ${formatPrice(199)}` : `Elite ${formatPrice(99)}`;

    const Cross = <X size={14} className="mx-auto text-muted-foreground/30" />;
    const Tick = <Check size={14} className="mx-auto text-primary" />;

    const data = isPlus ? [
      { label: "Chats/day", left: "15", right: "Unlimited" },
      { label: "Radius", left: "50 km", right: "100 km" },
      { label: "Likes/day", left: "10", right: "Unlimited" },
      { label: "Profile photos", left: "Blurred", right: "Visible" },
      { label: "Media/day", left: "5", right: "Unlimited" },
      { label: "Incognito", left: Cross, right: Tick },
      { label: "Verified badge*", left: Cross, right: Tick },
      { label: "Read receipts", left: Tick, right: Tick },
      { label: "Filters", left: "Basic", right: "Advanced" },
      { label: "Who Likes You", left: "Limited", right: "Full" },
      { label: "Ads", left: "Reduced", right: "None" },
      { label: "Priority discovery", left: Tick, right: "⭐ Highest" },
    ] : [
      { label: "Chats/day", left: "5", right: "15" },
      { label: "Radius", left: "25 km", right: "50 km" },
      { label: "Likes/day", left: "5", right: "10" },
      { label: "Profile photos", left: "Blurred", right: "Blurred" },
      { label: "Media/day", left: "2", right: "5" },
      { label: "Incognito", left: Cross, right: Cross },
      { label: "Verified badge*", left: Cross, right: Cross },
      { label: "Read receipts", left: Cross, right: Tick },
      { label: "Filters", left: "None", right: "Basic" },
      { label: "Who Likes You", left: "Limited", right: "Full" },
      { label: "Ads", left: "Full", right: "Reduced" },
      { label: "Priority discovery", left: Cross, right: Tick },
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Plan Comparison</h3>
        <div className="rounded-3xl border border-border overflow-hidden bg-muted/50">
          <div className="grid grid-cols-3 bg-muted p-4 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            <div>Feature</div>
            <div className="text-center">{leftPlanLabel}</div>
            <div className="text-center text-primary">{rightPlanLabel}</div>
          </div>
          {data.map((row, i) => (
            <div key={`row-${i}`} className="grid grid-cols-3 p-4 text-[10px] border-t border-border items-center">
              <div className="text-foreground/80 font-medium">{row.label}</div>
              <div className="text-center text-muted-foreground/40">{row.left}</div>
              <div className="text-center text-primary font-black">{row.right}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 h-16 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
        <div className="flex gap-2">
          {profile?.isAdmin && (
            <button onClick={() => router.push('/admin')} className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary"><Shield size={18} /></button>
          )}
          <button onClick={() => router.push('/settings')} className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground"><Settings size={18} /></button>
        </div>
      </header>

      <div className="px-8 space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-6 -mb-4"
        >
          <p className="text-xl font-semibold text-muted-foreground/60 tracking-tight">
            Made with love ❤️ in INDIA 🇮🇳
          </p>
        </motion.div>

        {profile && (
          <div className="flex flex-col items-center text-center space-y-6 -mt-10 pt-4">
            <div className="relative">
              <div className={cn(
                "w-36 h-36 rounded-[48px] bg-muted border-2 flex items-center justify-center aura-glow overflow-hidden relative transition-all",
                effectivePlan !== 'free' ? "border-primary shadow-[0_0_20px_rgba(0,87,255,0.3)]" : "border-primary/20"
              )}>
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-foreground/20">{profile.name?.[0] || 'U'}</span>
                )}
              </div>
              {profile.verificationStatus === 'Verified' && (
                <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-2xl premium-gradient flex items-center justify-center border-4 border-background shadow-xl">
                  <BadgeCheck size={22} className="text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
                {profile.name}, {profile.age}
                {spotlight && (
                  <span className="inline-flex items-center justify-center" style={{ filter: 'hue-rotate(180deg) brightness(1.2)' }}>
                    🌟
                  </span>
                )}
              </h2>
              <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                <Shield size={12} />
                {currentPlanConfig.displayName} Member
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 px-1">
           <div className="bg-muted/50 rounded-2xl p-3 border border-border text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Super Likes</span>
              <span className="text-sm font-bold text-foreground">{profile?.superLikeBalance || 0}</span>
           </div>
           <div className="bg-muted/50 rounded-2xl p-3 border border-border text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Spotlight</span>
              <span className={cn("text-[9px] font-bold", spotlight ? "text-[#00FF88]" : "text-muted-foreground/40")}>
                {spotlight ? "Active" : "Inactive"}
              </span>
           </div>
           <div className="bg-muted/50 rounded-2xl p-3 border border-border text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
              <span className={cn("text-[9px] font-bold", effectivePlan !== 'free' ? "text-primary" : "text-muted-foreground/40")}>
                {effectivePlan !== 'free' ? `${subDaysRemaining}d left` : "Main Plan"}
              </span>
           </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Membership Hub</h3>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide -mx-2 px-2">
            <Sheet open={activeSheet === 'free'} onOpenChange={(o) => setActiveSheet(o ? 'free' : null)}>
              <SheetTrigger asChild>
                <motion.button whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] bg-card text-foreground dark:text-white border border-border text-left relative overflow-hidden group shadow-sm">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">Main Plan</span>
                       {effectivePlan === 'free' && <Check size={14} className="text-[#00FF88]" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">Aura Free</h3>
                      <p className="text-[10px] text-muted-foreground/60">Standard features for connecting with the Aura community.</p>
                    </div>
                  </div>
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Aura Free</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                     <div className="space-y-6">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-bold">Standard Features</h3>
                           <p className="text-sm text-muted-foreground">Your basic presence in the Aura.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                           {[
                             { label: "Daily New Chats", value: "5 / day" },
                             { label: "Search Radius", value: "25 km" },
                             { label: "Daily Likes", value: "5 / day" },
                             { label: "Media Uploads", value: "2 / day" },
                             { label: "Profile Photos", value: "Blurred" },
                             { label: "Advertisements", value: "Standard" }
                           ].map((feat, i) => (
                             <div key={i} className="flex justify-between p-4 rounded-2xl bg-muted border border-border">
                               <span className="text-xs text-muted-foreground">{feat.label}</span>
                               <span className="text-xs font-bold text-foreground">{feat.value}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                     <Button onClick={() => setActiveSheet('elite')} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg">
                        Upgrade to Elite
                     </Button>
                     <div className="h-10" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={activeSheet === 'elite'} onOpenChange={(o) => setActiveSheet(o ? 'elite' : null)}>
              <SheetTrigger asChild>
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  className="flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] bg-gradient-to-br from-blue-50/50 via-white to-white dark:premium-gradient text-foreground dark:text-white border-2 border-primary text-left relative overflow-hidden group shadow-xl shadow-blue-500/10"
                >
                  {/* Atmospheric Light Effect for Light Mode - Blue light from bottom-left corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 block dark:hidden" />
                  
                  {/* Blue light effect from bottom center of the card */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none block dark:hidden" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary dark:bg-white/20 dark:text-white px-2 py-0.5 rounded-md">Elite</span>
                       {effectivePlan === 'elite' && <Check size={14} className="text-primary dark:text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{formatPrice(99)} <span className="text-[10px] font-normal opacity-60">+ 18% GST</span></h3>
                      <p className="text-[10px] text-muted-foreground/70 dark:text-white/70">Unlock essential premium benefits and search reach.</p>
                    </div>
                  </div>
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                     <ComparisonTable mode="elite" />
                     
                     <div className="p-6 rounded-[32px] bg-muted border border-border space-y-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>Base Amount</span>
                           <span>{formatPrice(99)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>GST (18%)</span>
                           <span>{formatPrice(getGstAmount(99))}</span>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between items-center">
                           <span className="text-sm font-bold">Total Payable</span>
                           <span className="text-xl font-black text-primary">{formatPrice(99, true)}</span>
                        </div>
                     </div>

                     <Button onClick={() => handlePurchase('Elite', 99)} disabled={effectivePlan === 'elite'} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg">
                        {effectivePlan === 'elite' ? "Active" : `Upgrade — ${formatPrice(99, true)}`}
                     </Button>
                     <div className="h-10" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={activeSheet === 'eliteplus'} onOpenChange={(o) => setActiveSheet(o ? 'eliteplus' : null)}>
              <SheetTrigger asChild>
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  className="flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] bg-gradient-to-br from-blue-50/50 via-white to-white dark:premium-gradient text-foreground dark:text-white border-2 border-primary text-left relative overflow-hidden group shadow-xl shadow-blue-500/10"
                >
                  {/* Atmospheric Light Effect for Light Mode - Blue light from top-right corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 block dark:hidden" />
                  
                  {/* Blue light effect from bottom center of the card */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none block dark:hidden" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary dark:bg-white/20 dark:text-white px-2 py-0.5 rounded-md">Elite Plus</span>
                       {effectivePlan === 'elite_plus' && <Check size={14} className="text-primary dark:text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{formatPrice(199)} <span className="text-[10px] font-normal opacity-60">+ 18% GST</span></h3>
                      <p className="text-[10px] text-muted-foreground/70 dark:text-white/70">Unlock the complete Aura luxury experience.</p>
                    </div>
                  </div>
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite Plus</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                     <ComparisonTable mode="eliteplus" />
                     
                     <div className="p-6 rounded-[32px] bg-muted border border-border space-y-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>Base Amount</span>
                           <span>{formatPrice(199)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>GST (18%)</span>
                           <span>{formatPrice(getGstAmount(199))}</span>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between items-center">
                           <span className="text-sm font-bold">Total Payable</span>
                           <span className="text-xl font-black text-primary">{formatPrice(199, true)}</span>
                        </div>
                     </div>

                     <Button onClick={() => handlePurchase('ElitePlus', 199)} disabled={effectivePlan === 'elite_plus'} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg neon-glow">
                        {effectivePlan === 'elite_plus' ? "Active" : `Upgrade — ${formatPrice(199, true)}`}
                     </Button>
                     <div className="h-10" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Sheet open={activeSheet === 'spotlight'} onOpenChange={(o) => setActiveSheet(o ? 'spotlight' : null)}>
              <SheetTrigger asChild>
                <button className="p-6 rounded-[28px] bg-card border border-border flex flex-col items-center gap-3 text-center relative overflow-hidden group shadow-sm">
                  <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/30 to-transparent opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className={cn("w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10", spotlight && "animate-pulse")}>
                    <Star size={24} />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spotlight</h4>
                    <p className="text-sm font-bold text-foreground">{formatPrice(30)}</p>
                    <div className="mt-2 pt-2 border-t border-border">
                       <p className="text-[8px] text-primary font-bold uppercase leading-tight">Priority Discovery Reach</p>
                    </div>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[70dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Spotlight</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 rounded-[32px] premium-gradient mx-auto flex items-center justify-center shadow-2xl neon-glow">
                        <Star size={40} className="text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold">Priority Discovery</h3>
                        <p className="text-sm text-muted-foreground font-light px-4">Boost your profile to the top for 7 full days.</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-muted border border-border space-y-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>Base Amount</span>
                           <span>{formatPrice(30)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>GST (18%)</span>
                           <span>{formatPrice(getGstAmount(30))}</span>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between items-center">
                           <span className="text-sm font-bold">Total Payable</span>
                           <span className="text-xl font-black text-primary">{formatPrice(30, true)}</span>
                        </div>
                     </div>

                    <Button onClick={() => handlePurchase('Spotlight', 30)} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg neon-glow">
                      Activate — {formatPrice(30, true)}
                    </Button>

                    <div className="space-y-3">
                      {[
                        { icon: Zap, title: "Instant Visibility", desc: "Be the first person everyone sees in their Discovery feed." },
                        { icon: Eye, title: "10x More Reach", desc: "Get up to 10x more profile views and potential connections." },
                        { icon: Clock, title: "7-Day Synchronization", desc: "Your profile remains highlighted for 7 full days." },
                        { icon: Star, title: "Priority Results", desc: "Priority placement in search results and interactions." }
                      ].map((benefit, i) => (
                        <div key={`spot-benefit-${i}`} className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <benefit.icon size={18} />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-foreground">{benefit.title}</h4>
                            <p className="text-xs text-muted-foreground font-light leading-relaxed">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <section className="space-y-4 pt-6 border-t border-border">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Spotlight Protocol</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-light italic">
                        Spotlight is Aura's priority discovery protocol. When activated, your identity node is prioritized within the global synchronization queue for 7 days. This increases your Aura's visibility to nearby members, leading to a higher rate of connection requests and profile engagements.
                      </p>
                    </section>

                    <div className="h-10" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={activeSheet === 'superlike'} onOpenChange={(o) => setActiveSheet(o ? 'superlike' : null)}>
              <SheetTrigger asChild>
                <button className="p-6 rounded-[28px] bg-card border border-border flex flex-col items-center gap-3 text-center relative overflow-hidden group shadow-sm">
                  <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/30 to-transparent opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                    <Heart size={24} />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Super Likes</h4>
                    <p className="text-sm font-bold text-foreground">{formatPrice(3)}</p>
                    <div className="mt-2 pt-2 border-t border-border">
                       <p className="text-[8px] text-primary font-bold uppercase leading-tight">3x Match Probability Sync</p>
                    </div>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Super Likes</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                    <div className="flex items-center justify-center gap-10 py-4">
                       <button onClick={() => setSuperLikeQty(Math.max(1, superLikeQty - 1))} className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Minus size={24} /></button>
                       <span className="text-4xl font-bold tabular-nums text-foreground">{superLikeQty}</span>
                       <button onClick={() => setSuperLikeQty(superLikeQty + 1)} className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Plus size={24} /></button>
                    </div>

                    <div className="p-6 rounded-[32px] bg-muted border border-border space-y-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>Base Amount</span>
                           <span>{formatPrice(3 * superLikeQty)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                           <span>GST (18%)</span>
                           <span>{formatPrice(getGstAmount(3 * superLikeQty))}</span>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between items-center">
                           <span className="text-sm font-bold">Total Payable</span>
                           <span className="text-xl font-black text-primary">{formatPrice(3 * superLikeQty, true)}</span>
                        </div>
                     </div>

                    <Button onClick={() => handlePurchase('SuperLike', 3 * superLikeQty, superLikeQty)} className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg">
                        Get {superLikeQty} — {formatPrice(3 * superLikeQty, true)}
                    </Button>

                    <div className="space-y-3">
                      {[
                        { icon: Zap, title: "Priority Delivery", desc: "Your profile jumps to the front of their Discovery queue." },
                        { icon: Star, title: "High-Fidelity Presence", desc: "Stand out with a signature blue aura highlight on your profile." },
                        { icon: Heart, title: "3x Match Probability", desc: "Members who Super Like have a 3x higher synchronization rate." }
                      ].map((benefit, i) => (
                        <div key={`super-benefit-${i}`} className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <benefit.icon size={18} />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-foreground">{benefit.title}</h4>
                            <p className="text-xs text-muted-foreground font-light leading-relaxed">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <section className="space-y-4 pt-6 border-t border-border">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Engagement Protocol</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-light italic">
                        Super Likes are high-fidelity synchronization signals. Unlike standard likes, a Super Like immediately notifies the recipient and places your profile at the front of their interaction queue with a signature blue highlight. This definitively increases the probability of a mutual match within your proximity radius.
                      </p>
                    </section>

                    <div className="h-10" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {profile && (
          <div className="glass-card p-8 rounded-[40px] space-y-8 relative overflow-hidden">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('about_me')}</h3>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild><button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary"><Pencil size={14} /></button></DialogTrigger>
                  <DialogContent className="bg-background border-border rounded-[32px] p-8">
                    <DialogHeader><DialogTitle>Edit Presence</DialogTitle></DialogHeader>
                    <Textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="bg-muted min-h-[120px] rounded-2xl p-4 text-foreground" placeholder="Describe your aura..." />
                    <DialogFooter><Button onClick={handleSave} className="w-full h-14 premium-gradient text-white rounded-2xl font-bold">Save Aura</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
            <p className="text-lg leading-relaxed text-foreground font-light">{profile.bio || "No bio added yet."}</p>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-border pt-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chat USAGE</label>
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <MessageSquare size={14} className="text-primary" />
                  {currentPlanConfig.newChatsPerDay === null ? "Unlimited" : `${profile.usage?.newChatsUsed || 0} / ${currentPlanConfig.newChatsPerDay}`}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media USAGE</label>
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ImageIcon size={14} className="text-primary" />
                  {currentPlanConfig.mediaPerDay === null ? "Unlimited" : `${profile.usage?.mediaUsed || 0} / ${currentPlanConfig.mediaPerDay}`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-20">
          <Sheet open={activeSheet === 'history'} onOpenChange={(o) => setActiveSheet(o ? 'history' : null)}>
            <SheetTrigger asChild>
               <button className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Clock size={18} /></div>
                  <span className="font-medium text-foreground">Purchase History</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-background border-border text-foreground rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
               <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-border shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">History</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-4 scrollbar-hide">
                    {purchaseHistory && purchaseHistory.length > 0 ? purchaseHistory.map((p) => (
                      <div key={p.id} className="p-5 rounded-[28px] bg-muted border border-border flex items-center justify-between">
                         <div className="space-y-1">
                            <h4 className="font-bold text-sm text-foreground">{p.itemType} Activation</h4>
                            <p className="text-[10px] text-muted-foreground">{p.timestamp?.toDate ? p.timestamp.toDate().toLocaleDateString() : "Just now"}</p>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-sm font-bold text-primary">{p.currency} {p.amount}</p>
                            <span className="text-[8px] font-bold text-[#00FF88] bg-[#00FF88]/10 px-2 py-0.5 rounded-md uppercase">Success</span>
                         </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center space-y-4">
                         <Clock size={40} className="text-muted-foreground/10 mx-auto" />
                         <p className="text-sm text-muted-foreground/30">No transaction records found.</p>
                      </div>
                    )}
                  </div>
               </div>
            </SheetContent>
          </Sheet>

          {[ 
            { label: t('settings'), path: '/settings', icon: Settings }, 
            { label: t('about'), path: '/about', icon: Info }, 
            { label: t('support'), path: '/support', icon: Headphones }, 
            { label: t('feedback'), path: '/feedback', icon: MessageSquare } 
          ].map((item) => (
            <button key={item.path} onClick={() => router.push(item.path)} className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><item.icon size={18} /></div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between hover:bg-destructive/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive"><LogOut size={18} /></div>
                  <span className="font-medium text-foreground">{t('sign_out')}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background border-border rounded-[32px] p-8">
              <AlertDialogHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto"><LogOut size={32} /></div>
                <div className="text-center">
                  <AlertDialogTitle className="text-foreground">{t('sign_out')}</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">Are you sure you want to exit the Aura?</AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-3 pt-4">
                <AlertDialogAction onClick={handleSignOut} className="w-full h-14 premium-gradient text-white rounded-2xl">Sign Out</AlertDialogAction>
                <AlertDialogCancel className="w-full h-12 rounded-xl text-foreground">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  );
}