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
  Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";
import { LANGUAGES } from "@/lib/translations";
import { useCollection, useFirestore, useUser, useMemoFirebase, initializeFirebase, useAuthContext } from "@/firebase";
import { collection, query, orderBy, deleteDoc, doc, Query, updateDoc } from "firebase/firestore";
import { BlockedUser } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getPlanConfig } from "@/lib/subscription-engine";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const db = useFirestore();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [settings, setSettings] = useState({
    notifications: true,
    privateProfile: false,
    incognito: false,
    onlineStatus: true
  });
  
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [signOutCountdown, setSignOutCountdown] = useState(5);

  useEffect(() => {
    if (profile) {
      setSettings({
        notifications: true,
        privateProfile: false,
        incognito: !!profile.incognitoMode,
        onlineStatus: !!profile.isOnline
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
    if (!db || !authUser) return;

    if (key === 'incognito' && !planConfig.incognito) {
      toast({ title: "Elite Plus Required", description: "Incognito mode is an Elite Plus benefit." });
      return;
    }

    try {
      const updateKey = key === 'incognito' ? 'incognitoMode' : 
                      key === 'onlineStatus' ? 'isOnline' : key;
      
      await updateDoc(doc(db, "users", authUser.uid), {
        [updateKey]: value
      });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: "Preference Updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed" });
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
    return () => clearInterval(interval);
  }, [isSignOutDialogOpen, signOutCountdown, router]);

  const handleUnblock = (blockId: string, name: string) => {
    if (!db || !authUser) return;
    const blockRef = doc(db, "users", authUser.uid, "blockedUsers", blockId);
    deleteDoc(blockRef).catch(() => {});
    toast({ title: "User Unblocked", description: `${name} can now find you again.` });
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
                <h3 className="font-medium text-foreground">Show Online Status</h3>
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
                      <p className="text-xs text-muted-foreground font-light">Manage restrictions.</p>
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
                   {blockedLoading ? <Loader2 className="animate-spin mx-auto" /> : blockedUsers?.length ? blockedUsers.map(user => (
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
          <h2 className="text-[10px] font-bold text-destructive uppercase tracking-widest px-1">{t('account_actions')}</h2>
          <div className="space-y-2">
            <button onClick={handleSignOutClick} className="w-full h-16 px-8 rounded-3xl bg-muted border border-border flex items-center gap-4 text-foreground hover:bg-rose-500/10 transition-all">
               <LogOut size={18} className="text-rose-500" />
               <span className="font-medium">{t('sign_out')}</span>
            </button>
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
