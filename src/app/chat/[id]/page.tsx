
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Send, CheckCheck, BadgeCheck, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { doc, collection, query, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, where, getDocs, writeBatch, setDoc } from "firebase/firestore";
import { ChatRoom, UserProfile, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser, profile } = useAuthContext();
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roomRef = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return doc(db, "chatRooms", roomId);
  }, [db, roomId]);

  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  const otherUid = useMemo(() => {
    if (!room || !authUser) return null;
    return room.participants.find(uid => uid !== authUser.uid);
  }, [room, authUser]);

  const otherUserRef = useMemoFirebase(() => {
    if (!db || !otherUid || otherUid === 'system') return null;
    return doc(db, "users", otherUid);
  }, [db, otherUid]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc"));
  }, [db, roomId]);

  const { data: messages } = useCollection<Message>(messagesQuery as any);

  useEffect(() => {
    if (db && authUser && roomId) {
      const clearNotifs = async () => {
        const notifQuery = query(
          collection(db, "notifications"), 
          where("userId", "==", authUser.uid), 
          where("type", "==", "message"), 
          where("read", "==", false),
          where("roomId", "==", roomId)
        );
        
        const snapshot = await getDocs(notifQuery);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(notifDoc => {
          batch.update(notifDoc.ref, { read: true });
        });

        await batch.commit();
      };
      
      clearNotifs();
    }
  }, [db, authUser, roomId]);

  useEffect(() => {
    // Scroll to bottom on load and when messages update
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const setTypingState = (isTyping: boolean) => {
    if (!db || !roomId || !authUser || room?.isSystem) return;
    updateDoc(doc(db, "chatRooms", roomId), {
      [`typing.${authUser.uid}`]: isTyping
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (!room?.isSystem) {
      setTypingState(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingState(false);
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !db || !roomId || !authUser || !otherUid) return;
    const msg = input;
    setInput("");
    setTypingState(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      addDoc(collection(db, "chatRooms", roomId, "messages"), { 
        senderId: authUser.uid, 
        text: msg, 
        timestamp: serverTimestamp(), 
        seen: false 
      });

      updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: msg, 
        lastTimestamp: serverTimestamp() 
      });

      if (otherUid !== 'system') {
        addDoc(collection(db, "notifications"), {
          userId: otherUid,
          title: profile?.name || "Aura Message",
          body: msg,
          type: "message",
          timestamp: serverTimestamp(),
          read: false,
          roomId: roomId,
          senderId: authUser.uid
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: "Please try again." });
    }
  };

  if (roomLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen-safe">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';
  const isOtherTyping = otherUid && room?.typing && room.typing[otherUid];

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background h-screen-safe overflow-hidden transition-colors">
        <header className="px-6 h-16 sm:h-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl z-20 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
              <ArrowLeft size={22} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground text-sm">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
              </div>
              <AnimatePresence mode="wait">
                {isOtherTyping ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[10px] text-primary font-bold italic">Typing...</motion.p>
                ) : !room?.isSystem ? (
                  <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", otherUser?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                    <span className={cn("text-[8px] font-bold uppercase tracking-[0.1em]", otherUser?.isOnline ? "text-emerald-500" : "text-muted-foreground")}>{otherUser?.isOnline ? "Active Now" : "Offline"}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border text-foreground rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
              {!room?.isSystem && (
                <>
                  <DropdownMenuItem onClick={() => {}} className="rounded-xl px-4 py-3 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-3">
                    <ShieldAlert size={16} /><span className="text-sm">Report & Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="rounded-xl px-4 py-3 text-muted-foreground hover:text-foreground focus:bg-muted cursor-pointer flex items-center gap-3">
                    <Trash2 size={16} /><span className="text-sm">Delete Conversation</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-4">
          <div className="text-center py-2"><span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Private Connection</span></div>
          {messages.map((msg) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={cn("max-w-[85%] px-4 py-3 rounded-[22px] shadow-sm", isMe ? "fuchsia-gradient text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border")}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50">
                    <span className="text-[9px] font-medium">{time}</span>
                    {isMe && <CheckCheck size={10} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-2 w-full" />
        </div>

        <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
          <div className="relative flex items-center gap-2 max-w-md mx-auto">
            <Input 
              value={input} 
              onChange={handleInputChange} 
              onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="Message..." 
              className="h-12 bg-muted border-border rounded-full px-5 text-sm focus:ring-primary text-foreground flex-1" 
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim()} 
              className="w-12 h-12 rounded-full fuchsia-gradient p-0 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"
            >
              <Send size={20} className="text-white ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
