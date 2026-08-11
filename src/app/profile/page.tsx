"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Home, 
  UserCircle, 
  Star, 
  Zap, 
  Image as ImageIcon, 
  ChevronRight, 
  AlertCircle, 
  Clock,
  ArrowLeft,
  X,
  Plus,
  Minus,
  Eye,
  ShieldCheck,
  UserCheck,
  ZapOff,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection, increment } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { isElite, isSpotlightActive } from "@/lib/plan-limits";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isIncognito, setIsIncognito] = useState(false);
  
  // Monetization States
  const [superLikeQty, setSuperLikeQty] = useState(1);
  const [activeSheet, setActiveSheet] = useState<'elite' | 'spotlight' | 'superlike' | null>(null);

  useEffect(() => {
    if (profile?.bio) setTempBio(profile.bio);
    if (profile?.incognitoMode) setIsIncognito(true);
  }, [profile]);

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

  const toggleIncognito = async (val: boolean) => {
    if (!db || !authUser) return;
    setIsIncognito(val);
    await updateDoc(doc(db, "users", authUser.uid), { incognitoMode: val });
    toast({ title: val ? "Incognito Enabled" : "Incognito Disabled" });
  };

  const buyElite = () => {
    initializeRazorpayPayment({
      amount: 199,
      itemType: 'Elite',
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 28);
        await updateDoc(doc(db, "users", authUser.uid), { 
          plan: 'Elite', 
          subscriptionEndDate: expiry,
          verificationStatus: 'Verified'
        });
        await addDoc(collection(db, "purchases"), {
          uid: authUser.uid,
          itemType: 'Elite',
          amount: 199,
          timestamp: serverTimestamp(),
          razorpayOrderId: res.razorpay_order_id,
          status: 'Success'
        });
        setActiveSheet(null);
        toast({ title: "Elite Activated!", description: "Welcome to the exclusive Aura realm." });
      }
    });
  };

  const buySpotlight = () => {
    initializeRazorpayPayment({
      amount: 30,
      itemType: 'Spotlight',
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        await updateDoc(doc(db, "users", authUser.uid), { spotlightExpiry: expiry });
        await addDoc(collection(db, "purchases"), {
          uid: authUser.uid,
          itemType: 'Spotlight',
          amount: 30,
          timestamp: serverTimestamp(),
          razorpayOrderId: res.razorpay_order_id,
          status: 'Success'
        });
        setActiveSheet(null);
        toast({ title: "Spotlight Active!", description: "You are now more visible to users nearby." });
      }
    });
  };

  const buySuperLikes = () => {
    const total = superLikeQty * 3;
    initializeRazorpayPayment({
      amount: total,
      itemType: 'SuperLike',
      onSuccess: async (res) => {
        if (!db || !authUser) return;
        await updateDoc(doc(db, "users", authUser.uid), { 
          superLikeBalance: increment(superLikeQty) 
        });
        await addDoc(collection(db, "purchases"), {
          uid: authUser.uid,
          itemType: 'SuperLike',
          amount: total,
          timestamp: serverTimestamp(),
          razorpayOrderId: res.razorpay_order_id,
          status: 'Success'
        });
        setActiveSheet(null);
        toast({ title: "Super Likes Added!", description: `${superLikeQty} Super Likes have materialized in your aura.` });
      }
    });
  };

  const handleSignOut = () => {
    const { auth } = initializeFirebase();
    auth.signOut().then(() => router.replace('/auth'));
  };

  const elite = isElite(profile);
  const spotlight = isSpotlightActive(profile);
  const vStatus = profile?.verification?.status || 'not_submitted';

  const eliteDaysRemaining = useMemo(() => {
    if (!profile?.subscriptionEndDate) return 0;
    const end = profile.subscriptionEndDate.toDate ? profile.subscriptionEndDate.toDate() : new Date(profile.subscriptionEndDate);
    return Math.max(0, differenceInDays(end, new Date()));
  }, [profile]);

  const spotlightDaysRemaining = useMemo(() => {
    if (!profile?.spotlightExpiry) return 0;
    const end = profile.spotlightExpiry.toDate ? profile.spotlightExpiry.toDate() : new Date(profile.spotlightExpiry);
    return Math.max(0, differenceInDays(end, new Date()));
  }, [profile]);

  // Sub-components for Details
  const ComparisonTable = () => (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">FREE vs ELITE PLUS</h3>
      <div className="rounded-3xl border border-white/5 overflow-hidden bg-white/5">
        <div className="grid grid-cols-3 bg-white/10 p-4 text-[9px] font-bold uppercase tracking-widest text-white/60">
          <div>Feature</div>
          <div className="text-center">Free</div>
          <div className="text-center text-primary">Elite+</div>
        </div>
        {[
          { label: "Daily Chats", free: "5", elite: "Unlimited" },
          { label: "Search Radius", free: "50km", elite: "100km" },
          { label: "Profile Photos", free: "Blurred", elite: "Visible" },
          { label: "Advanced Filters", free: "No", elite: "Yes" },
          { label: "Media Sharing", free: "2/day", elite: "Unlimited" },
          { label: "No Ads", free: "—", elite: "✓" },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-3 p-4 text-[11px] border-t border-white/5 items-center">
            <div className="text-white/80">{row.label}</div>
            <div className="text-center text-white/30">{row.free}</div>
            <div className="text-center text-primary font-bold">{row.elite}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AuthGuard>
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
                  elite ? "border-accent shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-primary/20"
                )}>
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-foreground/20">{profile.name?.[0] || 'U'}</span>
                  )}
                  {elite && (
                    <div className="absolute inset-0 border-4 border-accent/20 rounded-[48px] animate-pulse pointer-events-none" />
                  )}
                </div>
                {profile.verificationStatus === 'Verified' && (
                  <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-2xl fuchsia-gradient flex items-center justify-center border-4 border-background shadow-xl">
                    <BadgeCheck size={22} className="text-white" />
                  </div>
                )}
                {spotlight && (
                  <div className="absolute -top-2 -left-2 w-11 h-11 rounded-2xl bg-primary flex items-center justify-center border-4 border-background shadow-xl animate-bounce">
                    <Zap size={22} className="text-white" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
                  {profile.name}, {profile.age}
                  {elite && <Star size={20} className="text-accent fill-accent" />}
                </h2>
                <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                  <Shield size={12} />
                  {profile.plan} {profile.verificationStatus === 'Verified' ? "Verified Member" : "Aura Citizen"}
                </div>
              </div>
            </div>
          )}

          {/* Premium Balances Area */}
          <div className="grid grid-cols-3 gap-2 px-1">
             <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Super Likes</span>
                <span className="text-sm font-bold text-white">{profile?.superLikeBalance || 0}</span>
             </div>
             <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Spotlight</span>
                <span className={cn("text-[9px] font-bold", spotlight ? "text-primary" : "text-white/40")}>
                  {spotlight ? `${spotlightDaysRemaining}d left` : "Inactive"}
                </span>
             </div>
             <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center gap-1">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Elite</span>
                <span className={cn("text-[9px] font-bold", elite ? "text-accent" : "text-white/40")}>
                  {elite ? `${eliteDaysRemaining}d left` : "Free"}
                </span>
             </div>
          </div>

          {/* Identity Verification Status */}
          <div className="mx-1 p-6 glass-card border-primary/10 bg-primary/5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Identity Verification</h4>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    {vStatus === 'approved' ? "Identity Verified" : vStatus === 'pending' ? "Under Review" : vStatus === 'rejected' ? "Needs Attention" : "Not Verified"}
                  </p>
                </div>
              </div>
              {vStatus === 'approved' && <BadgeCheck size={20} className="text-primary mt-2" />}
            </div>

            <div className="pt-2">
              {vStatus === 'approved' ? (
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Verification Approved</span>
                </div>
              ) : vStatus === 'pending' ? (
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center gap-3">
                  <Clock size={14} className="text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Review in Progress</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {vStatus === 'rejected' && profile?.verification?.rejectionReason && (
                    <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-3 mb-2">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Rejection Reason</span>
                        <p className="text-[11px] text-rose-400/80">{profile.verification.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={() => router.push('/profile/verify')}
                    className="w-full h-11 rounded-xl glass border-primary/20 text-primary text-[11px] font-bold uppercase tracking-widest hover:bg-primary/5"
                  >
                    {vStatus === 'rejected' ? "Upload New Image" : "Verify Profile"}
                    <ChevronRight size={14} className="ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Incognito Toggle */}
          <div className="mx-1 p-6 glass-card border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Lock size={20} className="text-primary mt-1 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Incognito Mode</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">Hide online status and typing indicators.</p>
              </div>
            </div>
            <Switch checked={isIncognito} onCheckedChange={toggleIncognito} />
          </div>

          {/* MONETIZATION HUB */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Aura Premium Hub</h3>
               {!elite && <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Unlock Features</span>}
            </div>
            
            <div className="space-y-3">
              {/* ELITE PLUS BANNER */}
              <Sheet open={activeSheet === 'elite'} onOpenChange={(o) => setActiveSheet(o ? 'elite' : null)}>
                <SheetTrigger asChild>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full p-7 rounded-[32px] premium-gradient text-white relative overflow-hidden group shadow-2xl text-left border border-white/10",
                      elite && "grayscale-[0.5] opacity-80"
                    )}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-md">Elite Plus</span>
                           {elite && <Check size={14} className="text-white" />}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">₹199 / 28 Days</h3>
                        <p className="text-[10px] opacity-70">Unlock the complete Aura luxury experience.</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                         View Benefits <ChevronRight size={14} />
                      </div>
                    </div>
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] p-0 h-[92dvh] overflow-hidden">
                  <div className="h-full flex flex-col">
                    <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                      <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                      <h2 className="text-sm font-bold uppercase tracking-[0.3em]">Elite Plus</h2>
                      <div className="w-10 h-10" />
                    </header>
                    
                    <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-hide">
                       <div className="text-center space-y-3">
                          <div className="w-20 h-20 rounded-[32px] premium-gradient mx-auto flex items-center justify-center neon-glow">
                             <Star size={32} className="text-white fill-white" />
                          </div>
                          <div className="space-y-1">
                             <h3 className="text-3xl font-bold tracking-tighter">Aura Elite Plus</h3>
                             <p className="text-sm text-white/60 font-light">More discovery. More connections. More control.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-8">
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-1">Discover</h4>
                             <div className="grid grid-cols-1 gap-3">
                                {[
                                  { icon: Compass, label: "100 km search radius" },
                                  { icon: Sliders, label: "Advanced discovery filters" },
                                  { icon: Eye, label: "See who likes you" },
                                  { icon: Heart, label: "Unlimited discovery likes" },
                                ].map((b, i) => (
                                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                     <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><b.icon size={18} /></div>
                                     <span className="text-sm font-medium">{b.label}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <h4 className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] px-1">Connect</h4>
                             <div className="grid grid-cols-1 gap-3">
                                {[
                                  { icon: MessageSquare, label: "Unlimited new chats" },
                                  { icon: UserCheck, label: "Read receipts enabled" },
                                  { icon: ImageIcon, label: "Unlimited media sharing" },
                                ].map((b, i) => (
                                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                     <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary"><b.icon size={18} /></div>
                                     <span className="text-sm font-medium">{b.label}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] px-1">Trust & Visibility</h4>
                             <div className="grid grid-cols-1 gap-3">
                                {[
                                  { icon: ShieldCheck, label: "Identity Verification badge" },
                                  { icon: ImageIcon, label: "Profile images visible" },
                                  { icon: Sparkles, label: "Priority discovery features" },
                                ].map((b, i) => (
                                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                     <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent"><b.icon size={18} /></div>
                                     <span className="text-sm font-medium">{b.label}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <ComparisonTable />

                       <div className="pb-12 pt-4">
                          <p className="text-[10px] text-white/30 text-center leading-relaxed">
                            Payment is processed securely via Razorpay. Subscriptions recur every 28 days unless cancelled. Cancel anytime in Settings.
                          </p>
                       </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-background/80 backdrop-blur-xl shrink-0">
                       <Button 
                         onClick={buyElite} 
                         disabled={elite}
                         className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg neon-glow flex items-center justify-between px-8"
                       >
                          <span>{elite ? "Elite Plus Active" : "Upgrade to Elite Plus"}</span>
                          <span className="text-sm opacity-80">₹199 • 28d</span>
                       </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* SPOTLIGHT & SUPER LIKE GRID */}
              <div className="grid grid-cols-2 gap-3">
                <Sheet open={activeSheet === 'spotlight'} onOpenChange={(o) => setActiveSheet(o ? 'spotlight' : null)}>
                  <SheetTrigger asChild>
                    <button className={cn(
                      "p-6 rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center group hover:border-primary/40 transition-all",
                      spotlight && "bg-primary/10 border-primary/30 aura-glow-purple"
                    )}>
                       <div className={cn("w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform", spotlight && "animate-pulse")}>
                          <Zap size={24} />
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Spotlight</h4>
                          <p className="text-sm font-bold text-white">₹30 / 7 Days</p>
                       </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                    <div className="h-full flex flex-col">
                       <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                          <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                          <h2 className="text-sm font-bold uppercase tracking-[0.3em]">Get Spotlight</h2>
                          <div className="w-10 h-10" />
                       </header>
                       <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                          <div className="text-center space-y-3">
                             <div className="w-20 h-20 rounded-[32px] bg-primary/20 mx-auto flex items-center justify-center border border-primary/30">
                                <Zap size={32} className="text-primary" />
                             </div>
                             <div className="space-y-1">
                                <h3 className="text-3xl font-bold tracking-tighter">⚡ SPOTLIGHT</h3>
                                <p className="text-sm text-white/60 font-light">Be seen by more people nearby.</p>
                             </div>
                          </div>
                          
                          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                             <p className="text-sm text-white/80 font-light leading-relaxed">
                                Spotlight temporarily boosts your profile visibility in discovery. When active, you'll receive priority placement in results for users in your vicinity.
                             </p>
                             <div className="space-y-3 pt-2">
                                {[
                                  "Increased discovery visibility",
                                  "Priority placement in results",
                                  "Active for 7 full days",
                                  "Automatically expires",
                                ].map((t, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs text-white/60">
                                     <Check size={14} className="text-primary" />
                                     <span>{t}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Visual Boost Preview</h4>
                             <div className="flex items-center justify-center gap-8 py-4">
                                <div className="flex flex-col items-center gap-2">
                                   <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center opacity-40"><UserCircle size={24} /></div>
                                   <span className="text-[9px] font-bold text-white/20 uppercase">Normal</span>
                                </div>
                                <div className="text-white/20"><ChevronRight size={24} /></div>
                                <div className="flex flex-col items-center gap-2">
                                   <div className="w-20 h-20 rounded-[28px] bg-primary/10 border-2 border-primary/40 flex items-center justify-center aura-glow-purple"><UserCircle size={32} className="text-primary" /></div>
                                   <span className="text-[9px] font-bold text-primary uppercase">Spotlight</span>
                                </div>
                             </div>
                          </div>

                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                             <div className="flex items-start gap-3 text-white/40">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed">Spotlight increases visibility only. It does not guarantee likes, matches, or specific interaction rates. Results vary based on profile quality and local activity.</p>
                             </div>
                          </div>
                       </div>
                       <div className="p-8 border-t border-white/5 bg-background/80 backdrop-blur-xl shrink-0">
                          <Button 
                            onClick={buySpotlight}
                            className="w-full h-16 rounded-[24px] bg-primary text-white font-bold text-lg aura-glow-purple flex items-center justify-between px-8"
                          >
                             <span>Activate Spotlight</span>
                             <span className="text-sm opacity-80">₹30</span>
                          </Button>
                       </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={activeSheet === 'superlike'} onOpenChange={(o) => setActiveSheet(o ? 'superlike' : null)}>
                  <SheetTrigger asChild>
                    <button className="p-6 rounded-[28px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center group hover:border-accent/40 transition-all">
                       <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                          <Heart size={24} className="fill-accent" />
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Super Likes</h4>
                          <p className="text-sm font-bold text-white">₹3 / Each</p>
                       </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] p-0 h-[80dvh] overflow-hidden">
                    <div className="h-full flex flex-col">
                       <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
                          <button onClick={() => setActiveSheet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><X size={20} /></button>
                          <h2 className="text-sm font-bold uppercase tracking-[0.3em]">Super Likes</h2>
                          <div className="w-10 h-10" />
                       </header>
                       <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                          <div className="text-center space-y-3">
                             <div className="w-20 h-20 rounded-[32px] bg-accent/20 mx-auto flex items-center justify-center border border-accent/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                <Heart size={32} className="text-accent fill-accent" />
                             </div>
                             <div className="space-y-1">
                                <h3 className="text-3xl font-bold tracking-tighter">💜 SUPER LIKE</h3>
                                <p className="text-sm text-white/60 font-light">Stand out from the crowd.</p>
                             </div>
                          </div>

                          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                             <p className="text-sm text-white/80 font-light leading-relaxed">
                                A Super Like sends a stronger signal that you're genuinely interested. It's more noticeable than a normal Like and lets the other user know they've made a real impression.
                             </p>
                             <div className="space-y-3 pt-2">
                                {[
                                  "High-visibility notification",
                                  "Premium heart indicator",
                                  "Show sincere interest",
                                  "No expiration for balance",
                                ].map((t, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs text-white/60">
                                     <Check size={14} className="text-accent" />
                                     <span>{t}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-5">
                             <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1 text-center">Select Quantity</h4>
                             <div className="flex items-center justify-center gap-10">
                                <button 
                                  onClick={() => setSuperLikeQty(Math.max(1, superLikeQty - 1))}
                                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                                >
                                   <Minus size={24} />
                                </button>
                                <div className="text-4xl font-bold tracking-tighter w-12 text-center">{superLikeQty}</div>
                                <button 
                                  onClick={() => setSuperLikeQty(superLikeQty + 1)}
                                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                                >
                                   <Plus size={24} />
                                </button>
                             </div>
                             <p className="text-center text-[10px] font-bold text-accent uppercase tracking-widest">Total: ₹{superLikeQty * 3}</p>
                          </div>
                       </div>
                       <div className="p-8 border-t border-white/5 bg-background/80 backdrop-blur-xl shrink-0">
                          <Button 
                            onClick={buySuperLikes}
                            className="w-full h-16 rounded-[24px] bg-accent text-white font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-between px-8"
                          >
                             <span>Buy Super Likes</span>
                             <span className="text-sm opacity-80">₹{superLikeQty * 3}</span>
                          </Button>
                       </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {profile && (
            <div className="glass-card p-8 rounded-[40px] space-y-8 relative overflow-hidden">
              <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('about_me')}</h3>
                  <div className="flex gap-2">
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild><button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary"><Pencil size={14} /></button></DialogTrigger>
                      <DialogContent className="glass-dark border-border rounded-[32px] p-8">
                        <DialogHeader><DialogTitle>Edit Presence</DialogTitle></DialogHeader>
                        <Textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="bg-muted min-h-[120px] rounded-2xl p-4 focus:ring-primary" placeholder="Describe your aura..." />
                        <DialogFooter><Button onClick={handleSave} className="w-full h-14 premium-gradient rounded-2xl font-bold">Save Aura</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
              </div>
              <p className="text-lg leading-relaxed text-foreground font-light">{profile.bio || "No bio added yet."}</p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-white/5 pt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chat LIMITS</label>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <MessageSquare size={14} className="text-primary" />
                    {elite ? "Unlimited" : `${profile.dailyChatCount} / 5 Daily`}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MEDIA LIMITS</label>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <ImageIcon size={14} className="text-primary" />
                    {elite ? "Unlimited" : `${profile.dailyMediaCount} / 2 Daily`}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {[ { label: t('settings'), path: '/settings', icon: Settings }, { label: t('about'), path: '/about', icon: Info }, { label: t('feedback'), path: '/feedback', icon: MessageSquare } ].map((item) => (
              <button key={item.path} onClick={() => router.push(item.path)} className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between group hover:bg-primary/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><item.icon size={18} /></div><span className="font-medium text-foreground">{item.label}</span></div><div className="text-muted-foreground">→</div></button>
            ))}
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="w-full h-16 rounded-3xl bg-muted border border-border px-8 flex items-center justify-between group hover:bg-destructive/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><LogOut size={18} /></div><span className="font-medium text-foreground">{t('sign_out')}</span></div><div className="text-muted-foreground">→</div></button></AlertDialogTrigger>
              <AlertDialogContent className="glass-dark border-border rounded-[32px] p-8">
                <AlertDialogHeader className="space-y-4"><div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto"><LogOut size={32} /></div><div className="text-center"><AlertDialogTitle>{t('sign_out')}</AlertDialogTitle><AlertDialogDescription>Are you sure you want to exit the Aura?</AlertDialogDescription></div></AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-3 pt-4"><AlertDialogAction onClick={handleSignOut} className="w-full h-14 premium-gradient rounded-2xl">Sign Out</AlertDialogAction><AlertDialogCancel className="w-full h-12 rounded-xl">Cancel</AlertDialogCancel></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function Sliders(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}
