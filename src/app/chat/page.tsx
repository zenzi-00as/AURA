"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, where, limit, Query, orderBy } from "firebase/firestore";
import { ChatRoom, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Input } from "@/components/ui/input";

export default function ChatList() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState("");

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", authUser.uid),
      orderBy("lastTimestamp", "desc"),
      limit(50)
    ) as Query<ChatRoom>;
  }, [db, authUser?.uid]);

  const { data: rooms, loading: roomsLoading } = useCollection<ChatRoom>(roomsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "users"), 
      where("onboardingCompleted", "==", true),
      where("incognitoMode", "==", false),
      limit(100)
    ) as Query<UserProfile>;
  }, [db, authUser?.uid]);

  const { data: profiles } = useCollection<UserProfile>(usersQuery);

  const chatItems = useMemo(() => {
    if (!rooms || !authUser || !profiles) return [];
    
    const profileMap = new Map(profiles.map(p => [p.uid, p]));
    const now = new Date();
    
    return rooms.map(room => {
      const lastTs = room.lastTimestamp?.toDate ? room.lastTimestamp.toDate() : new Date(room.lastTimestamp);
      const isExpired = (now.getTime() - lastTs.getTime()) > 24 * 60 * 60 * 1000;
      
      const participants = Array.isArray(room.participants) ? room.participants : [];
      const otherId = participants.find(id => id !== (authUser?.uid || ''));
      const otherUser = otherId ? profileMap.get(otherId) : null;
      const isSpotlight = otherUser?.spotlightExpiry && (otherUser.spotlightExpiry.toDate ? otherUser.spotlightExpiry.toDate() : new Date(otherUser.spotlightExpiry)) > new Date();

      return {
        id: room.id,
        name: room.isSystem ? "AURA Team" : (otherUser?.name || "Aura Member"),
        lastMsg: isExpired ? "Conversation expired" : (room.lastMessage || (room.isSystem ? "Welcome to AURA ❤️" : "Start a conversation")),
        time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
        verified: room.isSystem || otherUser?.verificationStatus === 'Verified',
        unreadCount: isExpired ? 0 : ((room.unreadCount && authUser && room.unreadCount[authUser.uid]) || 0),
        isSystem: room.isSystem,
        isOnline: otherUser?.isOnline,
        isSpotlight,
        isExpired
      };
    });
  }, [rooms, profiles, authUser]);

  const filteredChats = useMemo(() => {
    if (!searchTerm) return chatItems;
    const term = searchTerm.toLowerCase();
    return chatItems.filter(chat => (chat.name || "").toLowerCase().includes(term));
  }, [chatItems, searchTerm]);

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors min-h-screen">
        <header className="px-8 h-24 flex flex-col justify-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center shadow-lg shadow-primary/20"><MessageSquare size={18} className="text-white" /></div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{t('messages')}</h1>
            </div>
            <div className="relative w-40">
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 bg-muted border-border rounded-xl px-4 text-xs text-foreground placeholder:text-muted-foreground/50" />
            </div>
          </div>
        </header>

        <div className="px-6 space-y-3 mt-6">
          {roomsLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={`skel-${i}`} className="h-20 w-full rounded-[24px] bg-muted animate-pulse" />)}</div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredChats.map((chat, idx) => (
                <motion.div 
                  key={chat.id || `chat-${idx}`} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1, delay: idx * 0.02 }}
                  onClick={() => router.push(`/chat/${chat.id}`)} 
                  className={cn(
                    "p-4 rounded-[28px] flex items-center gap-4 border transition-all cursor-pointer", 
                    chat.unreadCount > 0 ? "bg-card shadow-md border-primary/40" : "bg-card border-border",
                    chat.isExpired && "opacity-40 grayscale"
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-2xl border border-border flex items-center justify-center relative shrink-0", chat.isSystem ? "premium-gradient" : "bg-muted")}>
                    {chat.isSystem ? <span className="text-white font-bold text-xl">A</span> : <span className="text-xl font-semibold text-muted-foreground/60">{chat.name?.[0] || "?"}</span>}
                    {chat.isOnline && !chat.isExpired && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={cn("truncate text-sm transition-colors", chat.unreadCount > 0 ? "text-foreground font-bold" : "text-foreground/80")}>{chat.name}</h3>
                        {chat.verified && <BadgeCheck size={14} className="text-primary" />}
                        {chat.isSpotlight && (
                          <span className="inline-flex items-center justify-center" style={{ filter: 'hue-rotate(180deg) brightness(1.2)' }}>🌟</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{chat.time}</span>
                    </div>
                    <p className={cn("text-xs truncate", chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{chat.lastMsg}</p>
                  </div>
                  {chat.unreadCount > 0 && <div className="h-5 min-w-[20px] px-2 rounded-full premium-gradient flex items-center justify-center"><span className="text-[9px] font-bold text-white">{chat.unreadCount}</span></div>}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}