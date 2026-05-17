
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, Edit3 } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

const INITIAL_CHATS = [
  { id: "1", name: "Aarav", age: 22, lastMsg: "Maybe we can grab a coffee sometime?", time: "2:44 PM", verified: true, unread: true },
  { id: "2", name: "Riyan", age: 24, lastMsg: "Hey! How's your week going?", time: "Yesterday", verified: true, unread: false },
  { id: "3", name: "Leo", age: 26, lastMsg: "I loved that playlist you shared.", time: "Tuesday", verified: false, unread: false },
];

export default function ChatList() {
  const router = useRouter();
  const { t } = useTranslation();
  const [chats, setChats] = useState(INITIAL_CHATS);

  useEffect(() => {
    // Load read status from localStorage
    const readChats = JSON.parse(localStorage.getItem('aura_read_chats') || '[]');
    setChats(prev => prev.map(chat => ({
      ...chat,
      unread: readChats.includes(chat.id) ? false : chat.unread
    })));
  }, []);

  const handleChatClick = (id: string) => {
    // Mark as read in state
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    
    // Persist read status
    const readChats = JSON.parse(localStorage.getItem('aura_read_chats') || '[]');
    if (!readChats.includes(id)) {
      localStorage.setItem('aura_read_chats', JSON.stringify([...readChats, id]));
    }

    router.push(`/chat/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-10 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t('messages')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <Search size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <Edit3 size={18} />
          </button>
        </div>
      </header>

      <div className="px-6 space-y-2 mt-4">
        {chats.map((chat, idx) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleChatClick(chat.id)}
            className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative">
              <span className="text-xl font-semibold text-white/40">{chat.name[0]}</span>
              {chat.unread && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-4 border-[#0C0B0D]" />}
            </div>
            
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-white truncate">{chat.name}, {chat.age}</h3>
                  {chat.verified && <BadgeCheck size={14} className="text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{chat.time}</span>
              </div>
              <p className={`text-sm truncate ${chat.unread ? "text-white font-medium" : "text-muted-foreground font-light"}`}>
                {chat.lastMsg}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
