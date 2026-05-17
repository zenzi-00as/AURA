"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Search, Edit3, X, MessageSquare } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";

const INITIAL_CHATS = [
  { id: "1", name: "Aarav", age: 22, lastMsg: "Maybe we can grab a coffee sometime?", time: "2:44 PM", verified: true, unread: true },
  { id: "2", name: "Riyan", age: 24, lastMsg: "Hey! How's your week going?", time: "Yesterday", verified: true, unread: false },
  { id: "3", name: "Leo", age: 26, lastMsg: "I loved that playlist you shared.", time: "Tuesday", verified: false, unread: false },
];

export default function ChatList() {
  const router = useRouter();
  const { t } = useTranslation();
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const readChats = JSON.parse(localStorage.getItem('aura_read_chats') || '[]');
    setChats(prev => prev.map(chat => ({
      ...chat,
      unread: readChats.includes(chat.id) ? false : chat.unread
    })));
  }, []);

  const handleChatClick = (id: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    const readChats = JSON.parse(localStorage.getItem('aura_read_chats') || '[]');
    if (!readChats.includes(id)) {
      localStorage.setItem('aura_read_chats', JSON.stringify([...readChats, id]));
    }
    router.push(`/chat/${id}`);
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="px-6 space-y-2 mt-4">
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
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center relative">
                  <span className="text-xl font-semibold text-foreground/40">{chat.name[0]}</span>
                  {chat.unread && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-4 border-background" />}
                </div>
                
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-foreground truncate">{chat.name}, {chat.age}</h3>
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
                <p className="text-foreground font-medium">No conversations found</p>
                <p className="text-sm text-muted-foreground font-light">Try searching for a different name.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
