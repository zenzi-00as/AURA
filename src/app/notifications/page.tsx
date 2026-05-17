
"use client";

import { motion } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { Bell, ShieldCheck, MapPin, MessageCircle } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

const NOTIFS = [
  { id: 1, title: "Account Verified", body: "Identity check complete. Welcome to Aura.", icon: ShieldCheck, time: "2h ago", color: "text-primary" },
  { id: 2, title: "Aarav is nearby", body: "Someone in your discovery range just logged in.", icon: MapPin, time: "5h ago", color: "text-secondary" },
  { id: 3, title: "New Message", body: "Riyan sent you a message.", icon: MessageCircle, time: "Yesterday", color: "text-primary" },
];

export default function NotificationsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-10 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <h1 className="text-xl font-semibold tracking-tight">{t('activity')}</h1>
        <button className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
          <Bell size={18} />
        </button>
      </header>

      <div className="px-6 space-y-4 mt-4">
        {NOTIFS.map((notif, idx) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 glass-card rounded-[32px] flex items-start gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${notif.color}`}>
              <notif.icon size={22} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">{notif.title}</h3>
                <span className="text-[10px] text-muted-foreground font-medium">{notif.time}</span>
              </div>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                {notif.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
