"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Shield, 
  Bell, 
  UserX, 
  LogOut, 
  Trash2, 
  Globe, 
  Smartphone,
  ChevronRight,
  AlertTriangle,
  User,
  Check,
  Palette,
  Mail,
  Coins,
  EyeOff,
  Loader2,
  AlertCircle,
  Settings
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";
import { LANGUAGES } from "@/lib/translations";
import { useCollection, useFirestore, useMemoFirebase, initializeFirebase, useAuthContext } from "@/firebase";
import { collection, query, orderBy, deleteDoc, doc, Query, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { BlockedUser } from "@/lib/types";
import { getPlanConfig } from "@/lib/subscription-engine";
import { deleteAuraAccountData } from "@/actions/account";
import { useFcm } from "@/hooks/use-fcm";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const db = useFirestore();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  const { registerPush, unregisterPush, isRegistering } = useFcm();
  
  const [settings, setSettings] = useState({
    pushEnabled: true,
    privateProfile: false,
    incognito: false,
    onlineStatus: true
  });
  
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [signOutCountdown, setSignOutCountdown] = useState(5);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettings({
        pushEnabled: profile.notificationSettings?.pushEnabled ?? true,
        privateProfile: false,
        incognito: !!profile.incognitoMode,
        onlineStatus: profile.showOnlineStatus ?? true
      });
    }
  }, [profile]);

  const blockedQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "users", authUser.uid, "blockedUsers"),
      orderBy("blockedAt", "desc")
    ) as Query<BlockedUser>;
  }, [db, authUser]);

  const { data: blockedUsers, loading: blockedLoading } = useCollection<BlockedUser>(blockedQuery);

  const handleToggle = async (key: string, value: boolean) => {
    if (!db || !authUser || !profile) return;

    // INCOGNITO ELITE PLUS GUARD
    if (key === 'incognito' && !planConfig.incognito) {
      toast({ 
        title: "Elite Plus Required", 
        description: "Incognito mode is an exclusive Elite Plus benefit.",
        variant: "destructive"
      });
      router.push('/profile?tab=eliteplus');
      return;
    }

    // Optimistic UI update
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      if (key === 'pushEnabled') {
        if (value) await registerPush();
        else await unregisterPush();
        
        await updateDoc(doc(db, "users", authUser.uid), {
          'notificationSettings.pushEnabled': value,
          updatedAt: serverTimestamp()
        });
      } else {
        const updateKey = key === 'incognito' ? 'incognitoMode' : 
                        key === 'onlineStatus' ? 'showOnlineStatus' : key;
        
        await updateDoc(doc(db, "users", authUser.uid), {
          [updateKey]: value,
          updatedAt: serverTimestamp()
        });
      }
      toast({ title: "Preference Synchronized" });
    } catch (e: any) {
      // Rollback UI
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast({ variant: "destructive", title: "Sync Fault", description: "Failed to synchronize setting. Please try again." });
    }
  };

  const handleSignOutClick = () => {
    setSignOutCountdown(5);
    setIsSignOutDialogOpen(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSignOutDialogOpen && signOutCountdown > 0) {
      interval = setInterval(() => setSignOutCountdown((prev) => prev - 1), 1000);
    } else if (isSignOutDialogOpen && signOutCountdown === 0) {
      const { auth } = initializeFirebase();
      if (auth) auth.signOut().then(() => router.push("/auth"));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSignOutDialogOpen, signOutCountdown, router]);

  const handleUnblock = (blockId: string, name: string) => {
    if (!db || !authUser) return;
    const blockRef = doc(db, "users", authUser.uid, "blockedUsers", blockId);
    deleteDoc(blockRef).catch(() => {});
    toast({ title: "User Unblocked", description: `${name} can now find you again.` });
  };

  const handlePermanentDeletion = async () => {
    if (!authUser || deleteConfirmText !== "DELETE" || isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await deleteAuraAccountData(authUser.uid);
      if (!result.success) throw new Error(result.error);

      const { auth } = initializeFirebase();
      if (auth?.currentUser) {
        await deleteUser(auth.currentUser);
      }

      toast({ title: "Aura Deleted", description: "Your presence has been definitively removed." });
      router.replace('/auth');
    } catch (e: any) {
      console.error("Deletion Error:", e);
      if (e.code === 'auth/requires-recent-login') {
        toast({ 
          variant: "destructive", 
          title: "Security Verification Required", 
          description: "Please sign out and sign in again before deleting your account." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Deletion Synchronicity Fault", 
          description: "Failed to purge all data nodes. Please try again." 
        });
      }
      setIsDeleting(false);
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors duration-300">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{t('settings')}</h1>
      </header>

      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield size={14} className="text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('privacy_safety')}</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><EyeOff size={18} /></div>
                <div className="text-left space-y-0.5">
                   <h3 className="font-medium text-foreground">Incognito Mode</h3>
                   {!planConfig.incognito && <p className="text-[8px] text-primary font-bold uppercase">Requires Elite Plus</p>}
                </div>
              </div>
              <Switch checked={settings.incognito} onCheckedChange={(v) => handleToggle('incognito', v)} />
            </div>

            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><User size={18} /></div>
                <div className="text-left space-y-0.5">
                  <h3 className="font-medium text-foreground">Show Online Status</h3>
                  <p className="text-[10px] text-muted-foreground font-light">Let others see when you're active.</p>
                </div>
              </div>
              <Switch checked={settings.onlineStatus} onCheckedChange={(v) => handleToggle('onlineStatus', v)} />
            </div>

            <Dialog open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><UserX size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{t('blocked_users')}</h3>
                      <p className="text-xs text-muted-foreground font-light">Manage restricted relationships.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold">{t('blocked_users')}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                   {blockedLoading ? (
                     <div className="flex justify-center py-10">
                       <Loader2 className="animate-spin text-primary" size={24} />
                     </div>
                   ) : blockedUsers?.length ? blockedUsers.map(user => (
                     <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border">
                        <span className="text-sm font-medium">{user.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleUnblock(user.id, user.name)}>Unblock</Button>
                     </div>
                   )) : <p className="text-center text-muted-foreground py-10">Clear list.</p>}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Smartphone size={14} className="text-muted-foreground" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('general')}</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Bell size={18} />
                </div>
                <div className="text-left space-y-0.5">
                   <h3 className="font-medium text-foreground">Push Notifications</h3>
                   <p className="text-[10px] text-muted-foreground font-light">Receive real-time Aura alerts.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {settings.pushEnabled && (
                  <button 
                    onClick={() => router.push('/settings/notifications')}
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <Switch 
                  disabled={isRegistering}
                  checked={settings.pushEnabled} 
                  onCheckedChange={(v) => handleToggle('pushEnabled', v)} 
                />
              </div>
            </div>

            <Dialog open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors text-foreground font-medium group">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Globe size={18} /></div><span>{t('language')}</span></div>
                  <span className="text-xs text-muted-foreground">{currentLang.name}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader><DialogTitle className="text-2xl font-semibold text-center">{t('language')}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-2 py-4">
                  {LANGUAGES.map((lang) => (
                    <button key={`lang-${lang.code}`} onClick={() => { setLanguage(lang.code); setIsLanguageOpen(false); }} className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${language === lang.code ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"}`}><span className="flex items-center gap-3"><span>{lang.flag}</span><span className="font-medium">{lang.name}</span></span>{language === lang.code && <Check size={18} />}</button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors text-foreground font-medium group">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Coins size={18} /></div><span>Currency</span></div>
                  <span className="text-xs text-muted-foreground">{currency.code} ({currency.symbol})</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader><DialogTitle className="text-2xl font-semibold text-center">Currency</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-2 py-4">
                  {CURRENCIES.map((curr) => (
                    <button key={`curr-${curr.code}`} onClick={() => { setCurrency(curr.code); setIsCurrencyOpen(false); }} className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${currency.code === curr.code ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"}`}><span className="flex items-center gap-3"><span>{curr.flag}</span><span className="font-medium">{curr.name}</span></span>{currency.code === curr.code && <Check size={18} />}</button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border transition-colors">
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Palette size={18} /></div><div className="space-y-1"><h3 className="font-medium text-foreground">{t('dark_mode')}</h3><p className="text-xs text-muted-foreground font-light">{t('dark_mode_desc')}</p></div></div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Account Actions</h2>
          <div className="space-y-2">
            <button onClick={handleSignOutClick} className="w-full h-16 px-8 rounded-3xl bg-muted border border-border flex items-center gap-4 text-foreground hover:bg-rose-500/10 transition-all">
               <LogOut size={18} className="text-rose-500" />
               <span className="font-medium">{t('sign_out')}</span>
            </button>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogTrigger asChild>
                <button className="w-full h-16 px-8 rounded-3xl bg-muted border border-border flex items-center gap-4 text-foreground hover:bg-rose-500/10 transition-all group">
                   <Trash2 size={18} className="text-muted-foreground group-hover:text-rose-500 transition-colors" />
                   <span className="font-medium">Delete Account</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[40px] w-[calc(100%-40px)] max-w-[440px] p-10">
                <DialogHeader className="space-y-6">
                  <div className="w-20 h-20 rounded-[32px] bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto shadow-xl">
                    <AlertTriangle size={40} />
                  </div>
                  <div className="text-center space-y-2">
                    <DialogTitle className="text-3xl font-bold tracking-tight">Delete your Aura?</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                      Your profile and associated personal data will be permanently purged. This action cannot be undone.
                    </DialogDescription>
                  </div>
                </DialogHeader>

                <div className="py-8 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Final Confirmation</label>
                    <p className="text-[10px] text-muted-foreground px-1 italic">Type DELETE to definitively authorize this action.</p>
                    <Input 
                      placeholder="DELETE" 
                      value={deleteConfirmText} 
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="h-14 bg-background border-rose-500/20 text-center font-bold text-lg tracking-[0.2em]"
                    />
                  </div>
                </div>

                <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0">
                  <Button 
                    onClick={handlePermanentDeletion} 
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                    variant="destructive"
                    className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl relative overflow-hidden"
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" />
                        <span>Purging Identity...</span>
                      </div>
                    ) : (
                      "Delete My Account"
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={isDeleting}
                    className="w-full h-12 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
          <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-8">
            <DialogHeader className="space-y-4"><div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto"><LogOut size={32} /></div><div className="space-y-2 text-center"><DialogTitle className="text-2xl font-semibold">{t('sign_out')}</DialogTitle><DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">Secure redirect in progress.</DialogDescription></div></DialogHeader>
            <div className="py-6 flex flex-col items-center justify-center space-y-4"><div className="relative w-24 h-24 flex items-center justify-center"><svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/20" /><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * signOutCountdown) / 5} className="text-primary transition-all duration-1000 ease-linear" /></svg><span className="absolute text-3xl font-bold">{signOutCountdown}</span></div><p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Secure Redirect</p></div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
