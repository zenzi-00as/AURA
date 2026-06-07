
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, Edit3, X, MessageSquare, Lock } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, where, limit, Query, orderBy, doc, writeBatch } from "firebase/firestore";
import { ChatRoom, UserProfile, Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function ChatList() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const messageNotifsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", authUser.uid),
      where("type", "==", "message"),
      where("read", "==", false)
    ) as Query<Notification>;
  }, [db, authUser]);

  const { data: unreadMessageNotifs } = useCollection<Notification>(messageNotifsQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", authUser.uid),
      orderBy("lastTimestamp", "desc"),
      limit(50)
    ) as Query<ChatRoom>;
  }, [db, authUser]);

  const { data: rooms, loading: roomsLoading } = useCollection<ChatRoom>(roomsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), limit(100)) as Query<UserProfile>;
  }, [db]);

  const { data: profiles } = useCollection<UserProfile>(usersQuery);

  const chatItems = useMemo(() => {
    if (!rooms || !authUser) return [];

    return rooms.map(room => {
      const otherParticipantId = room.participants.find(id => id !== authUser.uid);
      const otherUser = profiles.find(p => p.uid === otherParticipantId);
      const otherName = room.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");

      // Check if this room has any unread notifications by matching the title (sender name)
      const isUnread = unreadMessageNotifs.some(n => 
        (room.isSystem && n.title === "AURA Team") || 
        (!room.isSystem && n.title === otherName)
      );

      if (room.isSystem || otherParticipantId === "system") {
        return {
          id: room.id,
          name: "AURA Team",
          age: "",
          lastMsg: room.lastMessage || "Welcome to AURA ❤️",
          time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
          verified: true,
          unread: isUnread,
          isSystem: true,
          otherUid: "system"
        };
      }

      return {
        id: room.id,
        name: otherName,
        age: otherUser?.age || "",
        lastMsg: room.lastMessage || "Start a conversation",
        time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
        verified: otherUser?.verificationStatus === 'Verified',
        unread: isUnread,
        isSystem: false,
        otherUid: otherParticipantId
      };
    });
  }, [rooms, profiles, authUser, unreadMessageNotifs]);

  const filteredChats = chatItems.filter(chat => chat.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
        <header className="px-8 pt-6 pb-6 flex flex-col gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
          <div className="flex justify-between items-center">
            {!isSearchOpen ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-primary/20"><span className="text-white font-bold text-sm">A</span></div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('messages')}</h1>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "100%" }} className="flex-1 mr-4">
                <div className="relative">
                  <Input autoFocus placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 bg-muted border-border rounded-2xl pl-10 pr-4 focus:ring-primary" />
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </motion.div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchTerm(""); }} className={cn("w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center transition-colors", isSearchOpen ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {isSearchOpen ? <X size={18} /> : <Search size={18} />}
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 space-y-4 mt-4">
          {roomsLoading ? (
            <div className="space-y-4 px-2">{[1, 2, 3].map(i => <div key={i} className="h-20 w-full rounded-3xl bg-muted animate-pulse" />)}</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat, idx) => (
                  <motion.div 
                    key={chat.id} 
                    layout 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    transition={{ delay: idx * 0.05 }} 
                    onClick={() => router.push(`/chat/${chat.id}`)} 
                    className={cn(
                      "group relative flex items-center gap-4 p-4 rounded-3xl hover:bg-muted cursor-pointer transition-all border border-transparent hover:border-border overflow-hidden", 
                      chat.unread ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(217,70,239,0.15)]" : "bg-card/40"
                    )}
                  >
                    {chat.unread && (
                      <motion.div 
                        layoutId={`highlight-${chat.id}`}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_15px_hsl(var(--primary))]"
                        initial={{ x: -10 }}
                        animate={{ x: 0 }}
                      />
                    )}

                    <div className={cn("w-14 h-14 rounded-2xl border border-border flex items-center justify-center relative shrink-0 ml-1", chat.isSystem ? "fuchsia-gradient" : "bg-muted")}>
                      {chat.isSystem ? <span className="text-white font-bold text-xl">A</span> : <span className="text-xl font-semibold text-foreground/40">{chat.name[0]}</span>}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-lg bg-background border border-border flex items-center justify-center"><Lock size={8} className="text-muted-foreground" /></div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={cn("font-semibold truncate text-sm transition-colors", chat.unread ? "text-primary font-bold" : "text-foreground")}>{chat.name}{chat.age ? `, ${chat.age}` : ""}</h3>
                          {chat.verified && <BadgeCheck size={14} className="text-primary" />}
                          {chat.unread && (
                            <motion.div 
                              animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }} 
                              transition={{ repeat: Infinity, duration: 1.5 }} 
                              className="w-2.5 h-2.5 rounded-full bg-primary ml-1 shadow-[0_0_10px_rgba(217,70,239,0.8)]" 
                            />
                          )}
                        </div>
                        <span className={cn("text-[10px] font-medium shrink-0 ml-2 transition-colors", chat.unread ? "text-primary font-bold" : "text-muted-foreground")}>{chat.time}</span>
                      </div>
                      <p className={cn("text-xs truncate transition-colors", chat.unread ? "text-foreground font-semibold" : "text-muted-foreground font-light")}>{chat.lastMsg}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground"><MessageSquare size={32} /></div>
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">{t('no_results')}</p>
                    <p className="text-sm text-muted-foreground font-light">{searchTerm ? "Try searching for a different name." : "Matches will appear here once you connect with someone."}</p>
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
