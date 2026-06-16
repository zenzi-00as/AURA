
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { Bell, ShieldCheck, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, Query, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useUser();

  const notifsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", authUser.uid),
      where("type", "!=", "message"),
      orderBy("type"), 
      orderBy("timestamp", "desc"),
      limit(50)
    ) as Query<Notification>;
  }, [db, authUser]);

  const { data: notifications, loading } = useCollection<Notification>(notifsQuery);

  // Clear all unread general notifications when viewing the list
  useEffect(() => {
    if (db && notifications.length > 0) {
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        const batch = writeBatch(db);
        unreadNotifs.forEach(notif => {
          const ref = doc(db, "notifications", notif.id);
          batch.update(ref, { read: true });
        });
        batch.commit().catch(err => console.error("Failed to clear notifications", err));
      }
    }
  }, [db, notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'verification': return ShieldCheck;
      case 'proximity': return MapPin;
      case 'message': return MessageCircle;
      case 'welcome': return Sparkles;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'verification': return "text-emerald-500 bg-emerald-500/10";
      case 'proximity': return "text-secondary bg-secondary/10";
      case 'message': return "text-primary bg-primary/10";
      case 'welcome': return "text-amber-500 bg-amber-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 pt-6 pb-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('activity')}</h1>
        <div className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell size={18} />
          {notifications.some(n => !n.read) && (
            <div className="absolute top-2 right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
            </div>
          )}
        </div>
      </header>

      <div className="px-6 space-y-3 mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 w-full rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.length > 0 ? (
              notifications.map((notif, idx) => {
                const Icon = getIcon(notif.type);
                const colorClasses = getColor(notif.type);
                const timeStr = notif.timestamp?.toDate 
                  ? notif.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : "Just now";

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "p-4 glass-card rounded-3xl flex items-center gap-4 transition-all border",
                      notif.read ? "opacity-70 grayscale-[0.5] border-border" : "border-primary/20 bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                      colorClasses
                    )}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-foreground truncate text-sm",
                            !notif.read && "text-primary font-bold"
                          )}>{notif.title}</h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0 ml-2">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-light leading-snug line-clamp-2">
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
