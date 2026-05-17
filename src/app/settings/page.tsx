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
  Mail
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
import { LANGUAGES } from "@/lib/translations";

const MOCK_BLOCKED_USERS = [
  { id: "b1", name: "Stranger12", date: "2 days ago" },
  { id: "b2", name: "SpamBot99", date: "1 week ago" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    privateProfile: false,
  });
  const [blockedUsers, setBlockedUsers] = useState(MOCK_BLOCKED_USERS);
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [signOutCountdown, setSignOutCountdown] = useState(5);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSignOutDialogOpen && signOutCountdown > 0) {
      interval = setInterval(() => {
        setSignOutCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSignOutDialogOpen && signOutCountdown === 0) {
      router.push("/auth");
    }
    return () => clearInterval(interval);
  }, [isSignOutDialogOpen, signOutCountdown, router]);

  const handleSignOutClick = () => {
    setSignOutCountdown(5);
    setIsSignOutDialogOpen(true);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUnblock = (id: string, name: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
    toast({
      title: "User Unblocked",
      description: `${name} can now find and message you again.`,
    });
  };

  const handleDeleteAccount = () => {
    toast({
      variant: "destructive",
      title: "Account Deleted",
      description: "Your account and all associated data have been permanently removed.",
    });
    router.push("/auth");
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors duration-300">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 transition-colors">
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
            <Dialog open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                      <UserX size={18} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{t('blocked_users')}</h3>
                      <p className="text-xs text-muted-foreground font-light">Manage who can't contact you.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold">{t('blocked_users')}</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                    People in this list won't be able to message you or see your profile on Aura.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {blockedUsers.length > 0 ? (
                      blockedUsers.map((user) => (
                        <motion.div
                          key={user.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                              <User size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-[10px] text-muted-foreground">Blocked {user.date}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnblock(user.id, user.name)}
                            className="text-[10px] font-bold uppercase tracking-widest text-foreground hover:text-primary hover:bg-primary/10 rounded-xl px-4"
                          >
                            Unblock
                          </Button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                          <Shield size={24} />
                        </div>
                        <p className="text-sm text-muted-foreground font-light">Your blocked list is clear.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={() => setIsBlockedListOpen(false)}
                    className="w-full h-14 rounded-2xl bg-muted text-foreground font-bold text-lg hover:bg-muted/80 transition-colors border border-border"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Bell size={14} className="text-secondary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('notifications')}</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border transition-colors">
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">{t('push_notifications')}</h3>
                <p className="text-xs text-muted-foreground font-light">Alerts for messages and activity.</p>
              </div>
              <Switch 
                checked={settings.notifications} 
                onCheckedChange={() => toggleSetting('notifications')} 
              />
            </div>
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
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                      <Globe size={18} />
                    </div>
                    <span>{t('language')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{currentLang.name}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold text-center">{t('language')}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-2 py-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLanguageOpen(false);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${language === lang.code ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"}`}
                    >
                      <span className="flex items-center gap-3">
                        <span>{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </span>
                      {language === lang.code && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between p-6 bg-card rounded-[32px] border border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Palette size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{t('dark_mode')}</h3>
                  <p className="text-xs text-muted-foreground font-light">{t('dark_mode_desc')}</p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={toggleTheme} 
              />
            </div>

            <button 
              onClick={() => window.location.href = "mailto:support@aura.com"}
              className="w-full flex items-center justify-between p-6 bg-card rounded-[32px] border border-border hover:bg-muted/50 transition-colors text-foreground font-medium group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Mail size={18} />
                </div>
                <div className="text-left space-y-1">
                  <h3 className="font-medium text-foreground">{t('email_support')}</h3>
                  <p className="text-xs text-muted-foreground font-light">{t('email_support_desc')}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h2 className="text-[10px] font-bold text-destructive uppercase tracking-widest px-1">{t('account_actions')}</h2>
          <div className="space-y-2">
            <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
              <DialogTrigger asChild>
                <button 
                  onClick={handleSignOutClick}
                  className="w-full flex items-center gap-4 p-6 bg-card rounded-[32px] border border-border hover:bg-rose-500/10 hover:border-rose-500/20 transition-all text-foreground group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-rose-500 transition-colors">
                    <LogOut size={18} />
                  </div>
                  <span className="font-medium">{t('sign_out')}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-8">
                <DialogHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                    <LogOut size={32} />
                  </div>
                  <div className="space-y-2 text-center">
                    <DialogTitle className="text-2xl font-semibold">{t('sign_out')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                      You will login at any time with the same number you used to join Aura.
                    </DialogDescription>
                  </div>
                </DialogHeader>
                
                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-muted/20"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={276}
                        strokeDashoffset={276 - (276 * signOutCountdown) / 5}
                        className="text-primary transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <span className="absolute text-3xl font-bold">{signOutCountdown}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Secure Redirect</p>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsSignOutDialogOpen(false)}
                    className="w-full h-12 rounded-xl text-foreground hover:text-primary transition-colors font-bold"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-4 p-6 bg-rose-500/5 rounded-[32px] border border-rose-500/10 hover:bg-rose-500/10 transition-all text-rose-500 group">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Trash2 size={18} />
                  </div>
                  <span className="font-medium">{t('delete_account')}</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-8">
                <AlertDialogHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2 text-center">
                    <AlertDialogTitle className="text-2xl font-semibold">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                      This action is permanent and cannot be undone. All your messages, matches, and profile data will be scrubbed from Aura.
                    </AlertDialogDescription>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-3 pt-4 sm:flex-col">
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-medium text-lg hover:bg-destructive/90 transition-colors"
                  >
                    Delete Permanently
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full h-12 rounded-xl bg-muted border-transparent text-foreground hover:bg-muted/80 hover:text-foreground transition-colors border border-border font-bold">
                    {t('cancel')}
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <div className="pt-8 text-center space-y-2 pb-12">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Aura v1.0.4</p>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground underline decoration-muted">
            <button onClick={() => router.push('/terms')}>Terms</button>
            <button onClick={() => router.push('/privacy')}>Privacy</button>
          </div>
        </div>
      </div>
    </div>
  );
}