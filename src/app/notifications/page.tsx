"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { Bell, ShieldCheck, MapPin, MessageCircle, Info } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, Query } from "firebase/firestore";
import { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useUser();

  const notifsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", authUser.uid),
      orderBy("timestamp", "desc"),
      limit(50)
    ) as Query<Notification>;
  }, [db, authUser]);

  const { data: notifications, loading } = useCollection<Notification>(notifsQuery);

  const getIcon = (type: string) => {
    switch (type) {
      case 'verification': return ShieldCheck;
      case 'proximity': return MapPin;
      case 'message': return MessageCircle;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'verification': return "text-primary";
      case 'proximity': return "text-secondary";
      case 'message': return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 pt-6 pb-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('activity')}</h1>
        <button className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={18} />
        </button>
      </header>

      <div className="px-6 space-y-4 mt-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-full rounded-[32px] bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.length > 0 ? (
              notifications.map((notif, idx) => {
                const Icon = getIcon(notif.type);
                const color = getColor(notif.type);
                const timeStr = notif.timestamp?.toDate 
                  ? notif.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : "Just now";

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 glass-card rounded-[32px] flex items-start gap-4"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center ${color}`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-foreground">{notif.title}</h3>
                        <span className="text-[10px] text-muted-foreground font-medium">{timeStr}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-light leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Bell size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-medium">No alerts yet</p>
                  <p className="text-sm text-muted-foreground font-light">
                    Check back later for updates on your matches and activity.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
