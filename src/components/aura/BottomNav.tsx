"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MessageCircle, User, Bell } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: Compass, path: "/dashboard", label: "Discovery" },
    { icon: MessageCircle, path: "/chat", label: "Chats" },
    { icon: Bell, path: "/notifications", label: "Alerts" },
    { icon: User, path: "/profile", label: "Me" },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 rounded-[32px] bg-[#0C0B0D]/80 backdrop-blur-2xl border border-white/10 shadow-2xl aura-glow">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative px-6 py-3 rounded-[24px] flex items-center justify-center transition-all ${isActive ? "text-white" : "text-muted-foreground hover:text-white"}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 fuchsia-gradient rounded-[24px] shadow-lg shadow-primary/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={22} className="relative z-10" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}