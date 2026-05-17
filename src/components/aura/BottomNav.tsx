"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MessageCircle, User, Bell } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, Query, doc, writeBatch } from "firebase/firestore";
import { Notification } from "@/lib/types";
import { useEffect } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useUser();

  // Query for unread notifications in real-time
  const unreadQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", authUser.uid),
      where("read", "==", false)
    ) as Query<Notification>;
  }, [db, authUser]);

  const { data: unreadNotifications } = useCollection<Notification>(unreadQuery);

  const hasUnreadMessages = unreadNotifications.some(n => n.type === 'message');
  const hasUnreadAlerts = unreadNotifications.some(n => n.type !== 'message');

  // Automatically mark notifications as read when on the corresponding tab
  useEffect(() => {
    if (!db || !authUser || unreadNotifications.length === 0) return;

    const clearNotifications = async (types: string[]) => {
      const batch = writeBatch(db);
      let count = 0;
      
      unreadNotifications.forEach(n => {
        if (types.includes(n.type)) {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
          count++;
        }
      });

      if (count > 0) {
        try {
          await batch.commit();
        } catch (err) {
          console.error("Failed to clear notifications:", err);
        }
      }
    };

    if (pathname === "/chat") {
      clearNotifications(['message']);
    } else if (pathname === "/notifications") {
      clearNotifications(['verification', 'proximity']);
    }
  }, [pathname, unreadNotifications, db, authUser]);

  const navItems = [
    { icon: Compass, path: "/dashboard", label: t('discovery'), hasBadge: false },
    { icon: MessageCircle, path: "/chat", label: t('chats'), hasBadge: hasUnreadMessages },
    { icon: Bell, path: "/notifications", label: t('alerts'), hasBadge: hasUnreadAlerts },
    { icon: User, path: "/profile", label: t('me'), hasBadge: false },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 rounded-[32px] bg-background/80 backdrop-blur-2xl border border-border shadow-2xl aura-glow transition-colors">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const showBadge = item.hasBadge && !isActive;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative px-6 py-3 rounded-[24px] flex items-center justify-center transition-all ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 fuchsia-gradient rounded-[24px] shadow-lg shadow-primary/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center">
                <item.icon size={22} className={`relative z-10 ${isActive ? 'text-foreground' : ''}`} />
                
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_12px_rgba(217,70,239,0.8)] border-2 border-background z-20"
                  />
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
