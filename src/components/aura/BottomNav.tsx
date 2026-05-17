"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MessageCircle, User, Bell } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useState, useEffect } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeUpdates, setActiveUpdates] = useState<Record<string, boolean>>({
    "/chat": true,
    "/notifications": false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveUpdates(prev => ({ ...prev, "/notifications": true }));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const navItems = [
    { icon: Compass, path: "/dashboard", label: t('discovery') },
    { icon: MessageCircle, path: "/chat", label: t('chats') },
    { icon: Bell, path: "/notifications", label: t('alerts') },
    { icon: User, path: "/profile", label: t('me') },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 rounded-[32px] bg-background/80 backdrop-blur-2xl border border-border shadow-2xl aura-glow transition-colors">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const hasUpdate = activeUpdates[item.path];

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
                
                {hasUpdate && !isActive && (
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
