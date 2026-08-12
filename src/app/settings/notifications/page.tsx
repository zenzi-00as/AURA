"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  MessageSquare, 
  Users, 
  AtSign, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  Phone, 
  Tag, 
  Zap, 
  ShieldAlert, 
  Lock, 
  Volume2, 
  Vibrate, 
  AppWindow, 
  Lightbulb, 
  Eye, 
  Mail, 
  Smartphone, 
  Calendar,
  Save,
  Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { UserNotificationSettings } from "@/lib/types";

const SETTING_GROUPS = [
  {
    title: "Activity",
    items: [
      { id: "newMessages", label: "New Messages", icon: MessageSquare },
      { id: "groupMessages", label: "Group Messages", icon: Users },
      { id: "mentions", label: "Mentions", icon: AtSign },
      { id: "likes", label: "Likes", icon: Heart },
      { id: "comments", label: "Comments", icon: MessageCircle },
      { id: "newFollowers", label: "New Followers", icon: UserPlus },
      { id: "friendRequests", label: "Friend Requests", icon: UserCheck },
      { id: "calls", label: "Calls", icon: Phone },
    ]
  },
  {
    title: "Marketing & Security",
    items: [
      { id: "promotions", label: "Promotions", icon: Tag },
      { id: "updates", label: "Product Updates", icon: Zap },
      { id: "securityAlerts", label: "Security Alerts", icon: ShieldAlert },
      { id: "loginAlerts", label: "Login Alerts", icon: Lock },
    ]
  },
  {
    title: "System Alerts",
    items: [
      { id: "sound", label: "Sound", icon: Volume2 },
      { id: "vibration", label: "Vibration", icon: Vibrate },
      { id: "popupNotification", label: "Pop-up Notification", icon: AppWindow },
      { id: "ledFlash", label: "LED Flash", icon: Lightbulb },
      { id: "lockScreenPreview", label: "Lock Screen Preview", icon: Eye },
      { id: "badgeCount", label: "Badge Count", icon: Bell },
    ]
  },
  {
    title: "Delivery Methods",
    items: [
      { id: "pushNotifications", label: "Push Notifications", icon: Smartphone },
      { id: "emailNotifications", label: "Email Notifications", icon: Mail },
      { id: "dndSchedule", label: "Do Not Disturb Schedule", icon: Calendar },
    ]
  }
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<UserNotificationSettings>({
    newMessages: true,
    groupMessages: true,
    mentions: true,
    likes: true,
    comments: true,
    newFollowers: true,
    friendRequests: true,
    calls: true,
    promotions: false,
    updates: true,
    securityAlerts: true,
    loginAlerts: true,
    sound: true,
    vibration: true,
    popupNotification: true,
    ledFlash: false,
    lockScreenPreview: true,
    emailNotifications: true,
    pushNotifications: true,
    dndSchedule: false,
    notificationPreview: true,
    muteIndividualChats: false,
    notificationTone: "Default",
    badgeCount: true
  });

  useEffect(() => {
    if (profile?.notificationSettings) {
      setSettings(profile.notificationSettings);
    }
  }, [profile]);

  const toggleSetting = (id: keyof UserNotificationSettings) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    if (!db || !authUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", authUser.uid), {
        notificationSettings: settings
      });
      toast({ title: "Settings Saved", description: "Your notification preferences have been synchronized." });
      router.back();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors aura-doodle min-h-screen">
      <header className="px-6 h-20 flex items-center justify-between border-b border-[#2A2A2A] bg-background/80 backdrop-blur-xl sticky top-0 z-20 safe-top">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[#8F8F8F] hover:text-white transition-colors p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-white">Notification Settings</h1>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="h-10 px-4 rounded-xl fuchsia-gradient text-white font-bold text-xs"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <div className="flex items-center gap-2"><Save size={16} /> Save</div>}
        </Button>
      </header>

      <div className="p-6 space-y-10">
        {SETTING_GROUPS.map((group, gIdx) => (
          <motion.section 
            key={`notif-group-${group.title}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gIdx * 0.1 }}
            className="space-y-4"
          >
            <h2 className="text-[10px] font-bold text-[#8F8F8F] uppercase tracking-[0.2em] px-2">{group.title}</h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div 
                  key={`notif-item-${item.id}`}
                  className="aura-card aura-card-read p-5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#151515] border border-[#2A2A2A] flex items-center justify-center text-[#8F8F8F] group-hover:text-[#C93CFF] transition-colors">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-medium text-white">{item.label}</span>
                  </div>
                  <Switch 
                    checked={settings[item.id as keyof UserNotificationSettings] as boolean} 
                    onCheckedChange={() => toggleSetting(item.id as keyof UserNotificationSettings)}
                    className="data-[state=checked]:bg-[#C93CFF]"
                  />
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        <div className="pt-8 text-center pb-12">
          <p className="text-[10px] text-[#8F8F8F] uppercase tracking-[0.4em] font-bold opacity-40">Aura Activity Guard v1.0.4</p>
        </div>
      </div>
    </div>
  );
}
