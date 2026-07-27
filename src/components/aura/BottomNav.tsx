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
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-4 pb-10">
      <nav className="pointer-events-auto flex items-center gap-2 p-2 rounded-[32px] glass-dark border border-white/10 shadow-2xl w-full max-w-[340px] mx-auto mb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const showBadge = item.hasBadge;

          return (
            <button
              key={item.path}
              onClick={() => router.replace(item.path)}
              className={cn(
                "relative flex-1 py-4 rounded-[24px] flex flex-col items-center justify-center transition-all duration-300 active:scale-90",
                isActive ? "text-primary" : "text-white/40 hover:text-white"
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
                  size={24} 
                  className={cn(
                    "transition-all duration-500",
                    isActive ? "scale-110 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "scale-100"
                  )} 
                />
                
                {showBadge && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary border border-black shadow-[0_0_8px_#EC4899]"></span>
                  </motion.div>
                )}
              </div>

              {isActive && (
                <motion.div 
                  layoutId="activeDot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_#A855F7]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}