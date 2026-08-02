
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Settings, LogOut, Shield, Heart, Pencil, Sparkles, Check, MessageSquare, Lock, Info, Home, UserCircle, Star, Zap, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { isElite, isSpotlightActive } from "@/lib/plan-limits";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isIncognito, setIsIncognito] = useState(false);

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
        toast({ title: "Spotlight Active!", description: "You are now more visible to users nearby." });
      }
    });
  };

  const handleSignOut = () => {
    const { auth } = initializeFirebase();
    auth.signOut().then(() => router.replace('/auth'));
  };

  const elite = isElite(profile);
  const spotlight = isSpotlightActive(profile);

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
        <header className="px-8 pt-4 pb-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('profile')}</h1>
          <div className="flex gap-2">
            {profile?.isAdmin && (
              <button onClick={() => router.push('/admin')} className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary"><Shield size={18} /></button>
            )}
            <button onClick={() => router.push('/settings')} className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground"><Settings size={18} /></button>
          </div>
        </header>

        <div className="px-8 space-y-12">
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

          {/* Incognito Toggle */}
          <div className="mx-2 p-6 glass-card border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Lock size={20} className="text-primary mt-1 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Incognito Mode</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">Hide online status and typing indicators.</p>
              </div>
            </div>
            <Switch checked={isIncognito} onCheckedChange={toggleIncognito} />
          </div>

          {/* Elite CTA */}
          {!elite && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={buyElite}
              className="w-full p-8 rounded-[40px] premium-gradient text-white relative overflow-hidden group shadow-2xl"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left space-y-1">
                  <h3 className="text-2xl font-bold flex items-center gap-2">Upgrade to Elite <Star size={24} className="fill-white" /></h3>
                  <p className="text-xs opacity-70">Unlock full search, unlimited chats & blurred photos.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">₹199</span>
                  <p className="text-[8px] opacity-60">28 DAYS</p>
                </div>
              </div>
            </motion.button>
          )}

          {/* Purchase Spotlights */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={buySpotlight} className="p-6 glass-card border-primary/30 flex flex-col items-center gap-3 text-center">
                <Zap size={24} className="text-primary" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Get Spotlight</h4>
                  <p className="text-[14px] font-bold text-white">₹30 / 7 Days</p>
                </div>
             </button>
             <button onClick={() => {}} className="p-6 glass-card border-accent/30 flex flex-col items-center gap-3 text-center">
                <Heart size={24} className="text-accent" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Super Likes</h4>
                  <p className="text-[14px] font-bold text-white">₹3 / Each</p>
                </div>
             </button>
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
                        <Textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} className="bg-muted min-h-[120px] rounded-2xl" />
                        <DialogFooter><Button onClick={handleSave} className="w-full h-14 premium-gradient rounded-2xl">Save Aura</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
              </div>
              <p className="text-lg leading-relaxed text-foreground font-light">{profile.bio || "No bio added yet."}</p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-white/5 pt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LIMITS</label>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <MessageSquare size={14} className="text-primary" />
                    {elite ? "Unlimited" : `${profile.dailyChatCount} / 5 Chats`}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MEDIA</label>
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
