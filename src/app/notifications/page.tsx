"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { Bell, ShieldCheck, MapPin, MessageCircle, Sparkles, Settings } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useAuthContext, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, Query, doc, writeBatch } from "firebase/firestore";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useAuthContext();
  const router = useRouter();

  const notifsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", authUser.uid),
      orderBy("timestamp", "desc"),
      limit(50)
    ) as Query<Notification>;
  }, [db, authUser?.uid]);

  const { data: rawNotifications, loading } = useCollection<Notification>(notifsQuery);

  const notifications = useMemo(() => {
    return rawNotifications.filter(n => n.type !== 'message');
  }, [rawNotifications]);

  useEffect(() => {
    if (db && notifications && notifications.length > 0) {
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        const timer = setTimeout(() => {
          const batch = writeBatch(db);
          unreadNotifs.forEach(notif => {
            if (notif.id) {
              batch.update(doc(db, "notifications", notif.id), { read: true });
            }
          });
          batch.commit().catch(err => console.error("Mark read sync failed", err));
        }, 800);
        return () => clearTimeout(timer);
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
      case 'verification': return "text-primary bg-primary/10";
      case 'proximity': return "text-amber-500 bg-amber-500/10";
      case 'message': return "text-primary bg-primary/10";
      case 'welcome': return "text-primary bg-primary/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const hasUnread = useMemo(() => notifications.some(n => !n.read), [notifications]);

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 min-h-screen transition-colors duration-300">
        <header className="px-8 h-24 flex flex-col justify-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center shadow-lg shadow-primary/20 relative">
                <Bell size={18} className="text-white" />
                {hasUnread && (
                  <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border-2 border-background shadow-[0_0_8px_hsl(var(--primary))]"></span>
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{t('activity')}</h1>
            </div>
            <button 
              onClick={() => router.push('/settings/notifications')} 
              className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="px-6 space-y-3 mt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`notif-skeleton-${i}`} className="h-20 w-full rounded-[18px] bg-muted animate-pulse border border-border" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {notifications.length > 0 ? (
                notifications.map((notif, idx) => {
                  const Icon = getIcon(notif.type);
                  const colorClasses = getColor(notif.type);
                  const timeStr = notif.timestamp?.toDate 
                    ? notif.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "Just now";

                  return (
                    <motion.div
                      key={notif.id || `notif-${idx}`}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.1, delay: idx * 0.01 }}
                      className={cn(
                        "p-4 flex items-center gap-4 group active:scale-[0.98] transition-all rounded-[24px] border",
                        !notif.read ? "bg-card border-primary/40 shadow-sm" : "bg-card/50 border-border opacity-70"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 border border-border/10",
                        colorClasses
                      )}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className={cn(
                              "truncate text-sm transition-colors",
                              !notif.read ? "text-foreground font-bold" : "text-foreground/70 font-normal"
                            )}>{notif.title}</h3>
                            {!notif.read && (
                              <span className="bg-primary/20 text-primary text-[7px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-[0_0_8px_rgba(0,87,255,0.2)]">NEW</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 font-medium shrink-0 ml-2">{timeStr}</span>
                        </div>
                        <p className={cn(
                          "text-[11px] leading-snug line-clamp-2",
                          !notif.read ? "text-foreground font-medium" : "text-muted-foreground font-light"
                        )}>
                          {notif.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  key="empty-notifs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center text-muted-foreground/40">
                    <Bell size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">No alerts yet</p>
                    <p className="text-sm text-muted-foreground font-light">
                      Check back later for updates on your activity.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}