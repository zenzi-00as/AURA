"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Coins,
  EyeOff,
  Loader2,
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
import { collection, query, orderBy, deleteDoc, doc, Query, updateDoc, serverTimestamp } from "firebase/firestore";
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
    incognito: false,
    showOnlineStatus: true,
    language: 'en',
    currency: 'INR'
  });

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [signOutCountdown, setSignOutCountdown] = useState(5);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (profile?.settings) {
      setSettings(profile.settings);
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

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    if (!db || !authUser || !profile || isUpdating) return;

    // Entitlement Check: Incognito is Elite Plus
    if (key === 'incognito' && value === true && effectivePlan !== 'elite_plus') {
      toast({ 
        title: "Elite Plus Required", 
        description: "Incognito mode is an exclusive luxury tier benefit.",
        variant: "destructive"
      });
      router.push('/profile?tab=eliteplus');
      return;
    }

    const previousValue = settings[key];
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsUpdating(key);

    try {
      await updateDoc(doc(db, "users", authUser.uid), {
        [`settings.${key}`]: value,
        // Sync legacy fields
        ...(key === 'incognito' ? { incognitoMode: value } : {}),
        ...(key === 'showOnlineStatus' ? { showOnlineStatus: value } : {}),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Aura Synchronized" });
    } catch (e: any) {
      setSettings(prev => ({ ...prev, [key]: previousValue }));
      toast({ variant: "destructive", title: "Sync Fault", description: "Failed to synchronize setting. Please try again." });
    } finally {
      setIsUpdating(null);
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
      toast({ 
        variant: "destructive", 
        title: "Deletion Fault", 
        description: "Account recently authenticated? Please sign in again to authorize deletion." 
      });
      setIsDeleting(false);
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors duration-300">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 safe-top">
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
                   {effectivePlan !== 'elite_plus' && <p className="text-[8px] text-primary font-bold uppercase">Elite Plus Required</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUpdating === 'incognito' && <Loader2 className="animate-spin text-primary" size={14} />}
                <Switch checked={settings.incognito} onCheckedChange={(v) => handleToggle('incognito', v)} disabled={isUpdating === 'incognito'} />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><User size={18} /></div>
                <div className="text-left space-y-0.5">
                  <h3 className="font-medium text-foreground">Show Online Status</h3>
                  <p className="text-[10px] text-muted-foreground font-light">Real-time presence signal.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUpdating === 'showOnlineStatus' && <Loader2 className="animate-spin text-primary" size={14} />}
                <Switch checked={settings.showOnlineStatus} onCheckedChange={(v) => handleToggle('showOnlineStatus', v)} disabled={isUpdating === 'showOnlineStatus'} />
              </div>
            </div>

            <Dialog open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><UserX size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{t('blocked_users')}</h3>
                      <p className="text-xs text-muted-foreground font-light">Manage restrictions.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold text-foreground">{t('blocked_users')}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                   {blockedLoading ? (
                     <div className="flex justify-center py-10">
                       <Loader2 className="animate-spin text-primary" size={24} />
                     </div>
                   ) : blockedUsers?.length ? blockedUsers.map(user => (
                     <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border">
                        <span className="text-sm font-medium text-foreground">{user.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleUnblock(user.id, user.name)} className="text-primary hover:text-primary/80">Unblock</Button>
                     </div>
                   )) : <p className="text-center text-muted-foreground py-10">No users restricted.</p>}
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
            <button 
              onClick={() => router.push('/settings/notifications')}
              className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Bell size={18} />
                </div>
                <div className="text-left space-y-0.5">
                   <h3 className="font-medium text-foreground">Notification Settings</h3>
                   <p className="text-[10px] text-muted-foreground font-light">Push & Alert preferences.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            <Dialog open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors text-foreground font-medium group">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Globe size={18} /></div><span>{t('language')}</span></div>
                  <span className="text-xs text-muted-foreground">{currentLang.name}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader><DialogTitle className="text-2xl font-semibold text-center text-foreground">{t('language')}</DialogTitle></DialogHeader>
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
                <DialogHeader><DialogTitle className="text-2xl font-semibold text-center text-foreground">Currency</DialogTitle></DialogHeader>
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
                    <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">Delete your Aura?</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                      Your profile and associated data will be definitively purged. This action is irreversible.
                    </DialogDescription>
                  </div>
                </DialogHeader>

                <div className="py-8 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Final Authorization</label>
                    <p className="text-[10px] text-muted-foreground px-1 italic">Type DELETE to definitively authorize this purge.</p>
                    <Input 
                      placeholder="DELETE" 
                      value={deleteConfirmText} 
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="h-14 bg-background border-rose-500/20 text-center font-bold text-lg tracking-[0.2em] text-foreground"
                    />
                  </div>
                </div>

                <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0">
                  <Button 
                    onClick={handlePermanentDeletion} 
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                    variant="destructive"
                    className="w-full h-16 rounded-[24px] font-bold text-lg shadow-xl"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Delete My Aura"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={isDeleting}
                    className="w-full h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      </div>
    </div>
  );
}
