"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  MessageSquare, 
  Heart, 
  UserCheck, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  Zap, 
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { UserNotificationSettings } from "@/lib/types";
import { useFcm } from "@/hooks/use-fcm";
import { cn } from "@/lib/utils";

const NOTIF_CATEGORIES = [
  { id: "newMessages", label: "New Messages", icon: MessageSquare, color: "text-primary" },
  { id: "newLikes", label: "New Likes", icon: Heart, color: "text-rose-400" },
  { id: "superLikes", label: "Super Likes", icon: Sparkles, color: "text-amber-400" },
  { id: "newMatches", label: "New Matches", icon: Heart, color: "text-[#C93CFF]" },
  { id: "profileViews", label: "Profile Views", icon: Zap, color: "text-[#00FF88]" },
  { id: "verificationUpdates", label: "Verification Updates", icon: ShieldCheck, color: "text-blue-400" },
  { id: "membershipUpdates", label: "Membership & Subscription", icon: CheckCircle2, color: "text-amber-500" },
  { id: "paymentUpdates", label: "Payment Updates", icon: CreditCard, color: "text-emerald-400" },
  { id: "spotlightUpdates", label: "Spotlight Updates", icon: Sparkles, color: "text-amber-400" },
  { id: "auraUpdates", label: "Aura Announcements", icon: Zap, color: "text-primary" },
  { id: "securityAlerts", label: "Safety & Security Alerts", icon: Lock, color: "text-destructive" },
] as const;

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const { registerPush, unregisterPush, permission, isRegistering } = useFcm();
  
  const [settings, setSettings] = useState<UserNotificationSettings>({
    pushEnabled: true,
    newMessages: true,
    newLikes: true,
    superLikes: true,
    newMatches: true,
    profileViews: true,
    verificationUpdates: true,
    membershipUpdates: true,
    paymentUpdates: true,
    spotlightUpdates: true,
    auraUpdates: true,
    securityAlerts: true
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.notificationSettings) {
      setSettings(profile.notificationSettings);
    }
    setIsLoading(false);
  }, [profile]);

  const updatePreference = async (key: keyof UserNotificationSettings, value: boolean) => {
    if (!db || !authUser) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      if (key === 'pushEnabled') {
        if (value) await registerPush();
        else await unregisterPush();
      }

      await updateDoc(doc(db, "users", authUser.uid), {
        notificationSettings: {
          ...newSettings,
          updatedAt: serverTimestamp()
        }
      });
    } catch (err: any) {
      setSettings(settings);
      toast({ 
        variant: "destructive", 
        title: "Sync Fault", 
        description: "Failed to synchronize preferences with the messaging node." 
      });
    }
  };

  const isPermissionDenied = permission === 'denied';

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors min-h-screen-safe overflow-x-hidden">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 safe-top">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
      </header>

      <div className="p-6 space-y-10">
        <section className="space-y-6">
          <div className="p-6 rounded-[32px] bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground">Push Notifications</h3>
                <p className="text-xs text-muted-foreground">Control push notifications from Aura.</p>
              </div>
              <Switch 
                disabled={isLoading || isRegistering}
                checked={settings.pushEnabled} 
                onCheckedChange={(v) => updatePreference('pushEnabled', v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            {isPermissionDenied && settings.pushEnabled && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-3 items-start"
              >
                <AlertCircle className="text-destructive shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-destructive/80 font-medium leading-relaxed">
                  Notifications are blocked on this device. Enable notification permission in your browser settings to receive real-time alerts.
                </p>
              </motion.div>
            )}

            {isRegistering && (
              <div className="flex items-center gap-2 text-primary">
                 <Loader2 className="animate-spin" size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Synchronizing messaging node...</span>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="px-2">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Alert Categories</h2>
          </div>

          <div className={cn(
            "space-y-2 transition-all duration-500",
            !settings.pushEnabled && "opacity-40 grayscale pointer-events-none"
          )}>
            {NOTIF_CATEGORIES.map((cat, idx) => (
              <motion.div 
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-5 rounded-[28px] bg-card border border-border flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-colors", cat.color)}>
                    <cat.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{cat.label}</span>
                </div>
                <Switch 
                  disabled={!settings.pushEnabled || isLoading}
                  checked={settings[cat.id as keyof UserNotificationSettings] as boolean} 
                  onCheckedChange={(v) => updatePreference(cat.id as keyof UserNotificationSettings, v)}
                  className="data-[state=checked]:bg-primary"
                />
              </motion.div>
            ))}
          </div>
        </section>

        <div className="pt-8 text-center pb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">
            Aura Activity Guard v2.5.0
          </div>
        </div>
      </div>
    </div>
  );
}