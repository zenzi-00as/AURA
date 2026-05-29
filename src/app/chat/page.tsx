
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, Edit3, X, MessageSquare, Lock } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, limit, Query, orderBy, doc } from "firebase/firestore";
import { ChatRoom, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ChatList() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const profileRef = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return doc(db, "users", authUser.uid);
  }, [db, authUser]);

  const { data: profile } = useDoc<UserProfile>(profileRef as any);

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
      
      if (room.isSystem || otherParticipantId === "system") {
        return {
          id: room.id,
          name: "AURA Team",
          age: "",
          lastMsg: room.lastMessage || "Welcome to AURA ❤️",
          time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
          verified: true,
          unread: false,
          isSystem: true,
          otherUid: "system"
        };
      }

      const otherUser = profiles.find(p => p.uid === otherParticipantId);

      return {
        id: room.id,
        name: otherUser?.name || "Aura User",
        age: otherUser?.age || "",
        lastMsg: room.lastMessage || "Start a conversation",
        time: room.lastTimestamp?.toDate ? room.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
        verified: otherUser?.verificationStatus === 'Verified',
        unread: false,
        isSystem: false,
        otherUid: otherParticipantId
      };
    });
  }, [rooms, profiles, authUser]);

  const filteredChats = chatItems.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChatClick = (id: string) => {
    router.replace(`/chat/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 pt-6 pb-6 flex flex-col gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <div className="flex justify-between items-center">
          {!isSearchOpen ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('messages')}</h1>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              className="flex-1 mr-4"
            >
              <div className="relative">
                <Input
                  autoFocus
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 bg-muted border-border rounded-2xl pl-10 pr-4 focus:ring-primary"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </motion.div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchTerm("");
              }}
              className={`w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center transition-colors ${isSearchOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
            {!isSearchOpen && (
              <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Edit3 size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 space-y-4 mt-4">
        {/* Welcome & Verification Banner */}
        {profile && !roomsLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 p-4 glass-card rounded-[24px] border-primary/20 bg-primary/5 space-y-2"
          >
             <div className="flex items-center gap-2 text-primary font-bold text-[9px] uppercase tracking-widest">
                <BadgeCheck size={12} />
                Identity Verified
             </div>
             <div className="space-y-1">
               <h2 className="text-base font-semibold text-foreground">Welcome, {profile.name}!</h2>
               <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                 Successfully verified. Your profile is now live and secure. Start connecting with real people in the Aura community.
               </p>
             </div>
          </motion.div>
        )}

        {roomsLoading ? (
          <div className="space-y-4 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 w-full rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
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
                  onClick={() => handleChatClick(chat.id)}
                  className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl border border-border flex items-center justify-center relative",
                    chat.isSystem ? "fuchsia-gradient" : "bg-muted"
                  )}>
                    {chat.isSystem ? (
                      <span className="text-white font-bold text-xl">A</span>
                    ) : (
                      <span className="text-xl font-semibold text-foreground/40">{chat.name[0]}</span>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-lg bg-background border border-border flex items-center justify-center">
                      <Lock size={8} className="text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <h3 className={cn(
                          "font-semibold truncate",
                          chat.isSystem ? "text-primary" : "text-foreground"
                        )}>{chat.name}{chat.age ? `, ${chat.age}` : ""}</h3>
                        {chat.verified && <BadgeCheck size={14} className="text-primary" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{chat.time}</span>
                    </div>
                    <p className={`text-sm truncate ${chat.unread ? "text-foreground font-medium" : "text-muted-foreground font-light"}`}>
                      {chat.lastMsg}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                  <MessageSquare size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-medium">{t('no_results')}</p>
                  <p className="text-sm text-muted-foreground font-light">
                    {searchTerm ? "Try searching for a different name." : "Matches will appear here once you connect with someone."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
