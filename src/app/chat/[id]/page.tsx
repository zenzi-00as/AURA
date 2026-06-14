
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

  // Clear unread notifications when entering this specific chat
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
      
      const timeout = setTimeout(clearNotifs, 800);
      return () => clearTimeout(timeout);
    }
  }, [db, authUser, roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !db || !roomId || !authUser || !otherUid) return;
    const msg = input;
    setInput("");
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

  const handleDeleteConversation = async () => {
    if (!db || !roomId) return;
    try {
      await deleteDoc(doc(db, "chatRooms", roomId));
      toast({ title: "Conversation Deleted" });
      router.push("/chat");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete conversation." });
    }
  };

  const handleReportBlock = async () => {
    if (!db || !authUser || !otherUid || !otherUser) return;
    try {
      const blockRef = doc(db, "users", authUser.uid, "blockedUsers", otherUid);
      await setDoc(blockRef, {
        uid: otherUid,
        name: otherUser.name,
        blockedAt: serverTimestamp()
      });
      
      // Delete conversation after blocking
      await deleteDoc(doc(db, "chatRooms", roomId));
      
      toast({ 
        variant: "destructive", 
        title: "User Blocked", 
        description: `${otherUser.name} has been reported and blocked.` 
      });
      router.push("/chat");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to block user." });
    }
  };

  if (roomLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background h-screen overflow-hidden transition-colors">
        <header className="px-6 h-16 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground text-sm">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
              </div>
              {!room?.isSystem && (
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", otherUser?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                  <span className={cn("text-[8px] font-bold uppercase tracking-[0.1em]", otherUser?.isOnline ? "text-emerald-500" : "text-muted-foreground")}>{otherUser?.isOnline ? "Active Now" : "Offline"}</span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"><MoreVertical size={18} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border text-foreground rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
              {!room?.isSystem && (
                <>
                  <DropdownMenuItem onClick={handleReportBlock} className="rounded-xl px-4 py-3 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-3">
                    <ShieldAlert size={16} /><span className="text-sm">Report & Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteConversation} className="rounded-xl px-4 py-3 text-muted-foreground hover:text-foreground focus:bg-muted cursor-pointer flex items-center gap-3">
                    <Trash2 size={16} /><span className="text-sm">Delete Conversation</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-4">
          <div className="text-center py-2"><span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Private Connection</span></div>
          {messages.map((msg) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={cn("max-w-[85%] px-5 py-3.5 rounded-[22px] shadow-sm", isMe ? "fuchsia-gradient text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border")}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50"><span className="text-[9px] font-medium">{time}</span>{isMe && <CheckCheck size={10} />}</div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border pb-4">
          <div className="relative flex items-center gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Message..." className="h-10 bg-muted border-border rounded-full px-5 text-xs focus:ring-primary" />
            <Button onClick={handleSend} disabled={!input.trim()} className="w-10 h-10 rounded-full fuchsia-gradient p-0 flex items-center justify-center shadow-lg shadow-primary/20"><Send size={16} className="text-white ml-0.5" /></Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
