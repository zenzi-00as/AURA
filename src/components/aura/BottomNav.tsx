"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MessageCircle, User, Bell, Heart } from "lucide-react";
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
  const hasUnreadLikes = unreadNotifications.some(n => n.type === 'like' || n.type === 'super_like');
  const hasUnreadAlerts = unreadNotifications.some(n => n.type !== 'message' && n.type !== 'like' && n.type !== 'super_like');

  const navItems = [
    { icon: Compass, path: "/dashboard", label: t('discovery') },
    { icon: Heart, path: "/likes", label: "Interests", hasBadge: hasUnreadLikes },
    { icon: MessageCircle, path: "/chat", label: t('chats'), hasBadge: hasUnreadMessages },
    { icon: Bell, path: "/notifications", label: t('alerts'), hasBadge: hasUnreadAlerts },
    { icon: User, path: "/profile", label: t('me') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-4 pb-8">
      <nav className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-[32px] glass-dark border border-border shadow-2xl w-full max-w-[380px] mx-auto mb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <button
              key={`nav-item-${item.path}`}
              onClick={() => router.replace(item.path)}
              className={cn(
                "relative flex-1 py-3 rounded-[24px] flex flex-col items-center justify-center transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-primary/10 rounded-[24px]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              
              <div className="relative z-10">
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-500",
                    isActive ? "scale-110 drop-shadow(0 0 10px rgba(0, 87, 255, 0.6))" : "scale-100"
                  )} 
                />
                
                {item.hasBadge && (
                  <div className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary border border-background"></span>
                  </div>
                )}
              </div>

              {isActive && (
                <motion.div 
                  layoutId="activeDot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}