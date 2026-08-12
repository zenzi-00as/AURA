"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, X, MessageSquare, Sparkles } from "lucide-react";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

      const unreadCount = room.unreadCount?.[authUser.uid] || 0;
      const isTyping = room.typing && otherParticipantId && room.typing[otherParticipantId];

      return {
        id: room.id,
        name: otherName,
        age: otherUser?.age || "",
        lastMsg: room.lastMessage || (room.isSystem ? "Welcome to AURA ❤️" : "Start a conversation"),
        time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
        verified: room.isSystem || otherUser?.verificationStatus === 'Verified',
        unreadCount,
        isSystem: room.isSystem || otherParticipantId === 'system',
        otherUid: otherParticipantId,
        isOnline: otherUser?.isOnline,
        isTyping
      };
    });
  }, [rooms, profiles, authUser]);

  const filteredChats = chatItems.filter(chat => chat.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors aura-doodle min-h-screen">
        <header className="px-8 h-20 flex flex-col justify-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-[#2A2A2A] safe-top">
          <div className="flex justify-between items-center">
            {!isSearchOpen ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-[#C93CFF]/20">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-white">{t('messages')}</h1>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "100%" }} className="flex-1 mr-4">
                <div className="relative">
                  <Input autoFocus placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 bg-[#0F0F0F] border-[#2A2A2A] rounded-2xl pl-10 pr-4 focus:ring-[#C93CFF] text-white" />
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F8F8F]" />
                </div>
              </motion.div>
            )}
            <button onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchTerm(""); }} className={cn("w-10 h-10 rounded-full bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center transition-colors", isSearchOpen ? "text-[#C93CFF]" : "text-[#8F8F8F] hover:text-white")}>
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>
        </header>

        <div className="px-6 space-y-3 mt-4">
          {roomsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={`skeleton-${i}`} className="h-24 w-full rounded-[18px] bg-[#0F0F0F] animate-pulse border border-[#2A2A2A]" />)}</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat, idx) => (
                  <motion.div 
                    key={chat.id || `chat-${idx}`} 
                    layout 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    transition={{ delay: idx * 0.05, duration: 0.25 }} 
                    onClick={() => router.push(`/chat/${chat.id}`)} 
                    className={cn(
                      "aura-card p-[18px] flex items-center gap-4 relative overflow-hidden group active:scale-[0.98]", 
                      chat.unreadCount > 0 ? "aura-card-unread" : "aura-card-read"
                    )}
                  >
                    <div className={cn("w-14 h-14 rounded-[14px] border border-[#2A2A2A] flex items-center justify-center relative shrink-0", chat.isSystem ? "fuchsia-gradient" : "bg-[#151515]")}>
                      {chat.isSystem ? <span className="text-white font-bold text-xl">A</span> : <span className="text-xl font-semibold text-[#8F8F8F]">{chat.name[0]}</span>}
                      {chat.isOnline && !chat.isSystem && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0F0F0F] shadow-sm animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={cn("truncate text-sm transition-colors", chat.unreadCount > 0 ? "text-white font-bold" : "text-[#8F8F8F] font-normal")}>
                            {chat.name}{chat.age ? `, ${chat.age}` : ""}
                          </h3>
                          {chat.verified && <BadgeCheck size={14} className="text-[#C93CFF]" />}
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#C93CFF]/20 text-[#C93CFF] text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter aura-glow-purple">NEW</span>
                          )}
                        </div>
                        <span className={cn("text-[10px] shrink-0 ml-2 transition-colors", chat.unreadCount > 0 ? "text-[#C93CFF] font-bold" : "text-[#8F8F8F]")}>
                          {chat.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {chat.isTyping ? (
                            <p className="text-xs text-[#C93CFF] font-bold italic flex items-center gap-1">
                              <Sparkles size={10} className="animate-pulse" />
                              Typing...
                            </p>
                          ) : (
                            <p className={cn("text-xs truncate transition-colors", chat.unreadCount > 0 ? "text-white font-semibold" : "text-[#8F8F8F] font-light")}>
                              {chat.lastMsg}
                            </p>
                          )}
                        </div>
                        
                        {chat.unreadCount > 0 && (
                          <div className="h-5 min-w-[20px] px-1.5 rounded-full fuchsia-gradient flex items-center justify-center shadow-lg shadow-[#C93CFF]/30">
                            <span className="text-[9px] font-bold text-white">{chat.unreadCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div key="empty-chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center text-[#8F8F8F]"><MessageSquare size={32} /></div>
                  <div className="space-y-1">
                    <p className="text-white font-medium">{t('no_results')}</p>
                    <p className="text-sm text-[#8F8F8F] font-light">{searchTerm ? "Try searching for a different name." : "Matches will appear here once you connect with someone."}</p>
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
