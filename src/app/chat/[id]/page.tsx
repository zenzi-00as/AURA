"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Send, CheckCheck, BadgeCheck, Trash2, Loader2, ShieldAlert, Image, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { doc, collection, query, orderBy, serverTimestamp, addDoc, updateDoc, writeBatch, increment } from "firebase/firestore";
import { ChatRoom, UserProfile, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { checkPlanLimit } from "@/lib/plan-limits";

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

  // Mark as read
  useEffect(() => {
    if (db && authUser && roomId) {
      const markAsRead = async () => {
        const batch = writeBatch(db);
        batch.update(doc(db, "chatRooms", roomId), {
          [`unreadCount.${authUser.uid}`]: 0
        });
        await batch.commit().catch(() => {});
      };
      markAsRead();
    }
  }, [db, authUser, roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setTypingState = (isTyping: boolean) => {
    if (!db || !roomId || !authUser || room?.isSystem || profile?.incognitoMode) return;
    updateDoc(doc(db, "chatRooms", roomId), {
      [`typing.${authUser.uid}`]: isTyping
    }).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!room?.isSystem) {
      setTypingState(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingState(false), 3000);
    }
  };

  const handleSend = async (isMedia = false, mediaUrl?: string) => {
    if ((!input.trim() && !isMedia) || !db || !roomId || !authUser || !otherUid || !profile) return;
    
    // Plan Limits Check
    const dailyMsgLimit = checkPlanLimit(profile, 'dailyMessagesPerProfile');
    const myMessagesCount = messages.filter(m => m.senderId === authUser.uid).length;
    
    if (myMessagesCount >= dailyMsgLimit) {
      toast({ variant: "destructive", title: "Daily Limit Reached", description: "Elite members get unlimited messages." });
      return;
    }

    if (isMedia && profile.dailyMediaCount >= checkPlanLimit(profile, 'dailyMediaUploads')) {
      toast({ variant: "destructive", title: "Media Limit Reached", description: "Upgrade to Elite for unlimited media sharing." });
      return;
    }

    const msg = input;
    setInput("");
    setTypingState(false);

    try {
      addDoc(collection(db, "chatRooms", roomId, "messages"), { 
        senderId: authUser.uid, 
        text: isMedia ? "[Media]" : msg, 
        timestamp: serverTimestamp(), 
        seen: false,
        isMedia,
        mediaUrl
      });

      updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: isMedia ? "Shared media" : msg, 
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      if (isMedia) {
        updateDoc(doc(db, "users", authUser.uid), { dailyMediaCount: increment(1) });
      }

      if (otherUid !== 'system') {
        addDoc(collection(db, "notifications"), {
          userId: otherUid,
          title: profile.name,
          body: isMedia ? "Sent you a photo" : msg,
          type: "message",
          timestamp: serverTimestamp(),
          read: false,
          roomId,
          senderId: authUser.uid
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed" });
    }
  };

  const handleReport = async () => {
    if (!db || !authUser || !otherUid) return;
    const reason = prompt("Enter reason for reporting:");
    if (!reason) return;

    await addDoc(collection(db, "reports"), {
      reporterId: authUser.uid,
      targetId: otherUid,
      reason,
      timestamp: serverTimestamp(),
      status: 'Pending'
    });

    toast({ title: "Report Sent", description: "Our safety team will review this shortly." });
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
  const isOtherTyping = otherUid && room?.typing && room.typing[otherUid] && !otherUser?.incognitoMode;

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background h-screen-safe overflow-hidden transition-colors">
        <header className="px-6 h-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl z-20 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-muted-foreground p-2 -ml-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
              </div>
              <AnimatePresence mode="wait">
                {isOtherTyping ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-primary font-bold italic">Typing...</motion.p>
                ) : !room?.isSystem && !otherUser?.incognitoMode ? (
                  <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", otherUser?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                    <span className={cn("text-[8px] font-bold uppercase tracking-[0.1em]", otherUser?.isOnline ? "text-emerald-500" : "text-muted-foreground")}>
                      {otherUser?.isOnline ? "Active" : "Offline"}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="w-10 h-10 rounded-full glass border border-border flex items-center justify-center text-muted-foreground"><MoreVertical size={18} /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-dark border-border rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
              {!room?.isSystem && (
                <>
                  <DropdownMenuItem onClick={handleReport} className="rounded-xl px-4 py-3 text-destructive cursor-pointer flex items-center gap-3">
                    <ShieldAlert size={16} /><span>Report & Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="rounded-xl px-4 py-3 text-muted-foreground cursor-pointer flex items-center gap-3">
                    <Trash2 size={16} /><span>Delete Conversation</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {room?.autoDeleteEnabled && (
          <div className="bg-primary/10 py-2 px-4 flex items-center justify-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest border-b border-primary/20">
            <Clock size={12} />
            <span>Ephemeral Mode: Messages expire in 24h</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            
            // Ephemeral filter (client-side)
            if (room?.autoDeleteEnabled && msg.timestamp) {
              const now = new Date();
              const msgDate = msg.timestamp.toDate();
              if (now.getTime() - msgDate.getTime() > 86400000) return null;
            }

            return (
              <motion.div key={msg.id || `msg-${idx}`} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={cn(
                  "max-w-[85%] px-4 py-3 rounded-[22px] shadow-sm", 
                  isMe ? "fuchsia-gradient text-white rounded-br-none" : "bg-muted/40 backdrop-blur-md text-foreground rounded-bl-none border border-white/10"
                )}>
                  {msg.isMedia ? (
                    <img src={msg.mediaUrl} alt="" className="rounded-xl max-w-full" />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}
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

        <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Button 
              variant="ghost" 
              className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center p-0" 
              onClick={() => handleSend(true, 'https://picsum.photos/400/300')}
            >
              <Image size={24} className="text-muted-foreground" />
            </Button>
            <div className="relative flex-1 h-14">
              <Input 
                value={input} 
                onChange={handleInputChange} 
                onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Message..." 
                className="h-full bg-white/5 border-white/10 rounded-full px-6 text-sm text-white focus:ring-primary shadow-none" 
              />
            </div>
            <Button 
              onClick={() => handleSend()} 
              disabled={!input.trim()} 
              className="w-14 h-14 rounded-full fuchsia-gradient p-0 shadow-xl shadow-primary/20 shrink-0 border-none transition-transform active:scale-95 flex items-center justify-center"
            >
              <Send size={24} className="text-white translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}