"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  MessageSquare, 
  Heart, 
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
import { UserNotificationPreferences } from "@/lib/types";
import { useFcm } from "@/hooks/use-fcm";
import { cn } from "@/lib/utils";

const NOTIF_CATEGORIES = [
  { id: "newMatches", label: "New Matches", icon: Heart, color: "text-[#C93CFF]" },
  { id: "newMessages", label: "New Messages", icon: MessageSquare, color: "text-primary" },
  { id: "profileViews", label: "Profile Views", icon: Zap, color: "text-[#00FF88]" },
  { id: "verificationUpdates", label: "Identity Updates", icon: ShieldCheck, color: "text-blue-400" },
  { id: "membershipUpdates", label: "Membership Events", icon: CheckCircle2, color: "text-amber-500" },
  { id: "paymentUpdates", label: "Payment Status", icon: CreditCard, color: "text-emerald-400" },
  { id: "spotlightUpdates", label: "Spotlight Alerts", icon: Sparkles, color: "text-amber-400" },
] as const;

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const { registerPush, unregisterPush, permission, isRegistering } = useFcm();
  
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    pushEnabled: true,
    newMatches: true,
    newMessages: true,
    profileViews: true,
    verificationUpdates: true,
    membershipUpdates: true,
    paymentUpdates: true,
    spotlightUpdates: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPreferences(profile.notificationPreferences);
    }
    setIsLoading(false);
  }, [profile]);

  const updatePreference = async (key: keyof UserNotificationPreferences, value: boolean) => {
    if (!db || !authUser || isUpdating) return;

    const previousValue = preferences[key];
    setPreferences(prev => ({ ...prev, [key]: value }));
    setIsUpdating(key);

    try {
      if (key === 'pushEnabled') {
        if (value) await registerPush();
        else await unregisterPush();
      }

      await updateDoc(doc(db, "users", authUser.uid), {
        [`notificationPreferences.${key}`]: value,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      setPreferences(prev => ({ ...prev, [key]: previousValue }));
      toast({ 
        variant: "destructive", 
        title: "Sync Fault", 
        description: "Failed to synchronize preference with Aura backend." 
      });
    } finally {
      setIsUpdating(null);
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
                <h3 className="font-bold text-lg text-foreground">Master Toggle</h3>
                <p className="text-xs text-muted-foreground">Main push notification node.</p>
              </div>
              <div className="flex items-center gap-2">
                {isUpdating === 'pushEnabled' && <Loader2 className="animate-spin text-primary" size={14} />}
                <Switch 
                  disabled={isLoading || isRegistering || isUpdating === 'pushEnabled'}
                  checked={preferences.pushEnabled} 
                  onCheckedChange={(v) => updatePreference('pushEnabled', v)}
                />
              </div>
            </div>
            
            {isPermissionDenied && preferences.pushEnabled && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-3 items-start">
                <AlertCircle className="text-destructive shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-destructive/80 font-medium leading-relaxed">
                  System notifications are blocked. Enable them in your browser/OS settings to receive Aura alerts.
                </p>
              </div>
            )}

            {isRegistering && (
              <div className="flex items-center gap-2 text-primary">
                 <Loader2 className="animate-spin" size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Synchronizing device node...</span>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="px-2">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Alert Channels</h2>
          </div>

          <div className={cn(
            "space-y-2 transition-all duration-500",
            !preferences.pushEnabled && "opacity-40 grayscale pointer-events-none"
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
                <div className="flex items-center gap-2">
                  {isUpdating === cat.id && <Loader2 className="animate-spin text-primary" size={12} />}
                  <Switch 
                    disabled={!preferences.pushEnabled || isLoading || isUpdating === cat.id}
                    checked={preferences[cat.id as keyof UserNotificationPreferences] as boolean} 
                    onCheckedChange={(v) => updatePreference(cat.id as keyof UserNotificationPreferences, v)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
