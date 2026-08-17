"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, X, MessageSquare, Sparkles, Shield, Clock, Zap } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, where, limit, Query, orderBy } from "firebase/firestore";
import { ChatRoom, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Input } from "@/components/ui/input";
import { isSpotlightActive } from "@/lib/plan-limits";

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
      const isSpotlight = isSpotlightActive(otherUser);

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
        isTyping,
        privacyEnabled: room.privacyEnabled,
        isSpotlight
      };
    });
  }, [rooms, profiles, authUser]);

  const filteredChats = chatItems.filter(chat => chat.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors aura-doodle min-h-screen">
        <header className="px-8 h-24 flex flex-col justify-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-white/5 safe-top">
          <div className="flex justify-between items-center">
            {!isSearchOpen ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold tracking-tight text-white">{t('messages')}</h1>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Digital Presence</span>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "100%" }} className="flex-1 mr-4">
                <div className="relative">
                  <Input autoFocus placeholder="Search auras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 bg-white/5 border-white/10 rounded-2xl pl-10 pr-4 focus:ring-primary text-white placeholder:text-white/20" />
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                </div>
              </motion.div>
            )}
            <button onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchTerm(""); }} className={cn("w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-colors", isSearchOpen ? "text-primary" : "text-white/30 hover:text-white")}>
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>
        </header>

        <div className="px-6 space-y-3 mt-6">
          {roomsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={`skeleton-${i}`} className="h-24 w-full rounded-[24px] bg-white/5 animate-pulse border border-white/5" />)}</div>
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
                      "p-4 rounded-[28px] flex items-center gap-4 relative overflow-hidden group active:scale-[0.98] border transition-all cursor-pointer", 
                      chat.unreadCount > 0 ? "bg-white/10 border-primary/20 aura-glow-purple" : "bg-white/5 border-white/5"
                    )}
                  >
                    <div className={cn("w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center relative shrink-0", chat.isSystem ? "premium-gradient" : "bg-[#151515]")}>
                      {chat.isSystem ? <span className="text-white font-bold text-xl">A</span> : <span className="text-xl font-semibold text-white/20">{chat.name[0]}</span>}
                      {chat.isOnline && !chat.isSystem && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#070709] shadow-sm animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={cn("truncate text-sm transition-colors", chat.unreadCount > 0 ? "text-white font-bold" : "text-white/60 font-medium")}>
                            {chat.name}{chat.age ? `, ${chat.age}` : ""}
                          </h3>
                          {chat.verified && <BadgeCheck size={14} className="text-primary" />}
                          {chat.isSpotlight && <Zap size={14} className="text-primary fill-primary animate-pulse" />}
                          {chat.privacyEnabled && <Shield size={12} className="text-primary/60" />}
                        </div>
                        <span className={cn("text-[10px] shrink-0 ml-2 font-bold uppercase tracking-tighter opacity-30")}>
                          {chat.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {chat.isTyping ? (
                            <p className="text-xs text-primary font-bold italic flex items-center gap-1">
                              <Sparkles size={10} className="animate-pulse" />
                              typing...
                            </p>
                          ) : (
                            <p className={cn("text-xs truncate transition-colors", chat.unreadCount > 0 ? "text-white font-semibold" : "text-white/30 font-light")}>
                              {chat.lastMsg}
                            </p>
                          )}
                        </div>
                        
                        {chat.unreadCount > 0 && (
                          <div className="h-5 min-w-[20px] px-2 rounded-full premium-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-[9px] font-bold text-white">{chat.unreadCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {chat.privacyEnabled && (
                       <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/20" />
                    )}
                  </motion.div>
                ))
              ) : (
                <motion.div key="empty-chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10"><MessageSquare size={32} /></div>
                  <div className="space-y-1">
                    <p className="text-white font-medium">Quiet in the Aura</p>
                    <p className="text-sm text-white/20 font-light max-w-[200px] mx-auto">Matches will appear here once you synchronize with someone.</p>
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
