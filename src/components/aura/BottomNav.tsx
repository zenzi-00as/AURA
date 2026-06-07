
"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MessageCircle, User, Bell } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, where, Query } from "firebase/firestore";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useAuthContext();

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

  const navItems = [
    { icon: Compass, path: "/dashboard", label: t('discovery'), hasBadge: false },
    { icon: MessageCircle, path: "/chat", label: t('chats'), hasBadge: hasUnreadMessages },
    { icon: Bell, path: "/notifications", label: t('alerts'), hasBadge: hasUnreadAlerts },
    { icon: User, path: "/profile", label: t('me'), hasBadge: false },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-1.5 p-1.5 rounded-[32px] bg-background/80 backdrop-blur-2xl border border-border shadow-2xl aura-glow transition-colors">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const showBadge = item.hasBadge;

          return (
            <button
              key={item.path}
              onClick={() => router.replace(item.path)}
              className={cn(
                "relative px-6 py-3.5 rounded-[24px] flex flex-col items-center justify-center transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-primary/10 rounded-[24px]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              
              <div className="relative z-10 flex items-center justify-center">
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300",
                    isActive ? "scale-110" : "scale-100"
                  )} 
                />
                
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border-2 border-background z-20 shadow-[0_0_12px_rgba(217,70,239,0.9)]"
                  />
                )}
              </div>

              {isActive && (
                <motion.div 
                  layoutId="activeDot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_rgba(217,70,239,0.8)]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
