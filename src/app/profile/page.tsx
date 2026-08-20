
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
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection, increment } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getEffectivePlan, getPlanConfig, PLAN_CONFIG } from "@/lib/subscription-engine";
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
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [superLikeQty, setSuperLikeQty] = useState(1);
  const [activeSheet, setActiveSheet] = useState<'elite' | 'eliteplus' | 'spotlight' | 'superlike' | null>(null);

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

  const handlePurchase = (itemType: 'Elite' | 'ElitePlus' | 'Spotlight' | 'SuperLike', amount: number, quantity: number = 1) => {
    initializeRazorpayPayment({
      amount,
      currency: currency.code,
      itemType: itemType === 'ElitePlus' ? 'Elite' : itemType as any,
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        const userRef = doc(db, "users", authUser.uid);
        
        if (itemType === 'Elite' || itemType === 'ElitePlus') {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 28);
          await updateDoc(userRef, { 
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
          amount,
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
    const { formatPrice } = useCurrency();
    const leftPlanLabel = isPlus ? "Elite" : "Free";
    const rightPlanLabel = isPlus ? `Elite Plus ${formatPrice(199)}` : `Elite ${formatPrice(99)}`;

    const Cross = <X size={14} className="mx-auto text-white/20" />;
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
      { label: "Spotlight", left: formatPrice(30)+"/7d", right: formatPrice(30)+"/7d" },
      { label: "Super Like", left: formatPrice(3), right: formatPrice(3) },
      { label: "Priority support", left: "Standard", right: "Priority" },
      { label: "Early access", left: Cross, right: Tick },
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
      { label: "Who Likes You", left: Cross, right: "Limited" },
      { label: "Ads", left: "Full", right: "Reduced" },
      { label: "Priority discovery", left: Cross, right: Tick },
      { label: "Spotlight", left: formatPrice(30)+"/7d", right: formatPrice(30)+"/7d" },
      { label: "Super Like", left: formatPrice(3), right: formatPrice(3) },
      { label: "Priority support", left: Cross, right: "Standard" },
      { label: "Early access", left: Cross, right: Cross },
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Plan Comparison</h3>
        <div className="rounded-3xl border border-white/5 overflow-hidden bg-white/5">
          <div className="grid grid-cols-3 bg-white/10 p-4 text-[8px] font-bold uppercase tracking-widest text-white/60">
            <div>Feature</div>
            <div className="text-center">{leftPlanLabel}</div>
            <div className="text-center text-primary">{rightPlanLabel}</div>
          </div>
          {data.map((row, i) => (
            <div key={`row-${i}`} className="grid grid-cols-3 p-4 text-[10px] border-t border-white/5 items-center">
              <div className="text-white/80">{row.label}</div>
              <div className="text-center text-white/30">{row.left}</div>
              <div className="text-center text-primary font-bold">{row.right}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 h-20 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('profile')}</h1>
        <div className="flex gap-2">
          {profile?.isAdmin && (
            <button onClick={() => router.push('/admin')} className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary"><Shield size={18} /></button>
          )}
          <button onClick={() => router.push('/settings')} className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground"><Settings size={18} /></button>
        </div>
      </header>

      <div className="px-8 space-y-10">
        {profile && (
          <div className="flex flex-col items-center text-center space-y-6 pt-6">
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
                <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-2xl fuchsia-gradient flex items-center justify-center border-4 border-background shadow-xl">
                  <BadgeCheck size={22} className="text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
                {profile.name}, {profile.age}
                {effectivePlan !== 'free' && <Star size={20} className="text-primary" />}
              </h2>
              <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                <Shield size={12} />
                {currentPlanConfig.displayName} Member
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
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Status</span>
              <span className={cn("text-[9px] font-bold", effectivePlan !== 'free' ? "text-primary" : "text-white/40")}>
                {effectivePlan !== 'free' ? `${subDaysRemaining}d left` : "Free"}
              </span>
           </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Membership Hub</h3>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide -mx-2 px-2">
            {/* Elite Card */}
            <Sheet open={activeSheet === 'elite'} onOpenChange={(o) => setActiveSheet(o ? 'elite' : null)}>
              <SheetTrigger asChild>
                <motion.button whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] premium-gradient text-white border border-white/10 text-left relative overflow-hidden group shadow-[0_0_25px_rgba(0,87,255,0.3)]">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 text-white px-2 py-0.5 rounded-md">Elite</span>
                       {effectivePlan === 'elite' && <Check size={14} className="text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{formatPrice(99)} / 28 Days</h3>
                      <p className="text-[10px] opacity-70">Unlock essential premium benefits and search reach.</p>
                    </div>
                  </div>
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                     <ComparisonTable mode="elite" />
                  </div>
                  <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                     <Button onClick={() => handlePurchase('Elite', 99)} disabled={effectivePlan === 'elite'} className="w-full h-16 rounded-[24px] bg-primary font-bold text-lg">
                        {effectivePlan === 'elite' ? "Active" : `Upgrade — ${formatPrice(99)}`}
                     </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Elite Plus Card */}
            <Sheet open={activeSheet === 'eliteplus'} onOpenChange={(o) => setActiveSheet(o ? 'eliteplus' : null)}>
              <SheetTrigger asChild>
                <motion.button whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-[280px] snap-center p-6 rounded-[32px] premium-gradient text-white border border-white/10 text-left relative overflow-hidden group shadow-[0_0_30px_rgba(0,87,255,0.4)]">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-md">Elite Plus</span>
                       {effectivePlan === 'elite_plus' && <Check size={14} className="text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{formatPrice(199)} / 28 Days</h3>
                      <p className="text-[10px] opacity-70">Unlock the complete Aura luxury experience.</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 border-2 border-white/10 rounded-[32px] animate-pulse pointer-events-none" />
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Aura Elite Plus</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                     <ComparisonTable mode="eliteplus" />
                  </div>
                  <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                     <Button onClick={() => handlePurchase('ElitePlus', 199)} disabled={effectivePlan === 'elite_plus'} className="w-full h-16 rounded-[24px] premium-gradient font-bold text-lg neon-glow">
                        {effectivePlan === 'elite_plus' ? "Active" : `Upgrade — ${formatPrice(199)}`}
                     </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Sheet open={activeSheet === 'spotlight'} onOpenChange={(o) => setActiveSheet(o ? 'spotlight' : null)}>
              <SheetTrigger asChild>
                <button className="p-6 rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center relative overflow-hidden group">
                  <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className={cn("w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10", spotlight && "animate-pulse")}>
                    <Star size={24} />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Spotlight</h4>
                    <p className="text-sm font-bold">{formatPrice(30)}</p>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[70dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
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
                        <p className="text-sm text-white/60 font-light px-4">Boost your profile to the top for 7 full days.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Zap, title: "Instant Visibility", desc: "Be the first person everyone sees in their Discovery feed." },
                        { icon: Eye, title: "10x More Reach", desc: "Get up to 10x more profile views and potential connections." },
                        { icon: Clock, title: "7-Day Synchronization", desc: "Your profile remains highlighted for 7 full days." },
                        { icon: Star, title: "Priority Results", desc: "Priority placement in search results and interactions." }
                      ].map((benefit, i) => (
                        <div key={`spot-benefit-${i}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <benefit.icon size={18} />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-white">{benefit.title}</h4>
                            <p className="text-xs text-white/40 font-light leading-relaxed">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 space-y-4">
                       <div className="flex items-center gap-3 text-primary">
                          <Sparkles size={20} />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Interaction Power</h4>
                       </div>
                       <p className="text-sm text-white/80 font-light leading-relaxed">
                         Priority Discovery significantly amplifies your profile's signal within the Aura. By materializing at the start of every member's discovery stage, you definitively increase the frequency and quality of your potential synchronizations.
                       </p>
                    </div>
                  </div>
                  <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0 safe-bottom">
                    <Button onClick={() => handlePurchase('Spotlight', 30)} className="w-full h-16 rounded-[24px] bg-primary font-bold text-lg neon-glow">
                      Activate — {formatPrice(30)}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={activeSheet === 'superlike'} onOpenChange={(o) => setActiveSheet(o ? 'superlike' : null)}>
              <SheetTrigger asChild>
                <button className="p-6 rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center relative overflow-hidden group">
                  <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                    <Heart size={24} />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Super Likes</h4>
                    <p className="text-sm font-bold">{formatPrice(3)}</p>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#070709] border-white/10 text-white rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                <div className="h-full flex flex-col">
                  <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                    <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">Super Likes</span>
                    <div className="w-10 h-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                    <div className="flex items-center justify-center gap-10 py-4">
                       <button onClick={() => setSuperLikeQty(Math.max(1, superLikeQty - 1))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40"><Minus size={24} /></button>
                       <span className="text-4xl font-bold tabular-nums">{superLikeQty}</span>
                       <button onClick={() => setSuperLikeQty(superLikeQty + 1)} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40"><Plus size={24} /></button>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Zap, title: "Priority Delivery", desc: "Your profile jumps to the front of their Discovery queue." },
                        { icon: Bell, title: "Instant Notification", desc: "They'll receive a specialized alert of your Super Like instantly." },
                        { icon: Sparkles, title: "High-Fidelity Presence", desc: "Stand out with a signature blue aura highlight on your profile." },
                        { icon: Heart, title: "3x Match Probability", desc: "Members who Super Like have a 3x higher synchronization rate." }
                      ].map((benefit, i) => (
                        <div key={`super-benefit-${i}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <benefit.icon size={18} />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-white">{benefit.title}</h4>
                            <p className="text-xs text-white/40 font-light leading-relaxed">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 space-y-4">
                       <div className="flex items-center gap-3 text-primary">
                          <Sparkles size={20} />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Interaction Power</h4>
                       </div>
                       <p className="text-sm text-white/80 font-light leading-relaxed">
                         Super like definitively signals your highest level of interest. It bypasses the standard discovery sequence to create an immediate synchronization potential.
                       </p>
                    </div>
                  </div>
                  <div className="p-8 border-t border-white/5 bg-[#070709] shrink-0">
                     <Button onClick={() => handlePurchase('SuperLike', superLikeQty * 3, superLikeQty)} className="w-full h-16 rounded-[24px] bg-primary font-bold text-lg">
                        Get {superLikeQty} — {formatPrice(superLikeQty * 3)}
                     </Button>
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
                  <DialogContent className="bg-[#070709] border-border rounded-[32px] p-8">
                    <DialogHeader><DialogTitle>Edit Presence</DialogTitle></DialogHeader>
                    <Textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="bg-muted min-h-[120px] rounded-2xl p-4" placeholder="Describe your aura..." />
                    <DialogFooter><Button onClick={handleSave} className="w-full h-14 premium-gradient rounded-2xl font-bold">Save Aura</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
            <p className="text-lg leading-relaxed text-foreground font-light">{profile.bio || "No bio added yet."}</p>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-white/5 pt-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chat USAGE</label>
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquare size={14} className="text-primary" />
                  {currentPlanConfig.newChatsPerDay === null ? "Unlimited" : `${profile.usage?.newChatsUsed || 0} / ${currentPlanConfig.newChatsPerDay}`}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media USAGE</label>
                <div className="flex items-center gap-2 font-medium">
                  <ImageIcon size={14} className="text-primary" />
                  {currentPlanConfig.mediaPerDay === null ? "Unlimited" : `${profile.usage?.mediaUsed || 0} / ${currentPlanConfig.mediaPerDay}`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-20">
          {[ 
            { label: t('settings'), path: '/settings', icon: Settings }, 
            { label: t('about'), path: '/about', icon: Info }, 
            { label: t('feedback'), path: '/feedback', icon: MessageSquare } 
          ].map((item) => (
            <button key={item.path} onClick={() => router.push(item.path)} className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><item.icon size={18} /></div>
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between hover:bg-destructive/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive"><LogOut size={18} /></div>
                  <span className="font-medium">{t('sign_out')}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#070709] border-border rounded-[32px] p-8">
              <AlertDialogHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto"><LogOut size={32} /></div>
                <div className="text-center">
                  <AlertDialogTitle>{t('sign_out')}</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to exit the Aura?</AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-3 pt-4">
                <AlertDialogAction onClick={handleSignOut} className="w-full h-14 premium-gradient rounded-2xl">Sign Out</AlertDialogAction>
                <AlertDialogCancel className="w-full h-12 rounded-xl">Cancel</AlertDialogCancel>
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
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  );
}
