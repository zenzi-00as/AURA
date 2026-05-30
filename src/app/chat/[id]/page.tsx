
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Send, CheckCheck, BadgeCheck, Trash2, Flag, ShieldAlert, Phone, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, where, getDocs } from "firebase/firestore";
import { ChatRoom, UserProfile, Message, Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  "Harassment or Hate Speech",
  "Fake Profile or Bot",
  "Inappropriate Content",
  "Spam or Scamming",
  "Underage User",
  "Other"
];

export default function ChatRoomPage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  
  const [input, setInput] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Room Data
  const roomRef = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return doc(db, "chatRooms", roomId as string);
  }, [db, roomId]);

  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  // 2. Identify Other Participant
  const otherUid = useMemo(() => {
    if (!room || !authUser) return null;
    return room.participants.find(uid => uid !== authUser.uid);
  }, [room, authUser]);

  // 3. Fetch Other User Profile
  const otherUserRef = useMemoFirebase(() => {
    if (!db || !otherUid || otherUid === 'system') return null;
    return doc(db, "users", otherUid);
  }, [db, otherUid]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  // 4. Fetch Messages Stream
  const messagesQuery = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return query(
      collection(db, "chatRooms", roomId as string, "messages"),
      orderBy("timestamp", "asc")
    );
  }, [db, roomId]);

  const { data: messages } = useCollection<Message>(messagesQuery as any);

  // 5. Clear Unread Notifications for this room
  useEffect(() => {
    if (db && authUser && roomId && messages.length > 0) {
      const clearNotifs = async () => {
        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "==", authUser.uid),
          where("type", "==", "message"),
          where("read", "==", false)
        );
        const snapshot = await getDocs(notifQuery);
        snapshot.docs.forEach(notifDoc => {
          const data = notifDoc.data() as Notification;
          // Heuristic: If it's a system room or contains recent msg text
          const isRelevant = room?.isSystem 
            ? data.title === "AURA Team"
            : messages.some(m => data.body.includes(m.text.slice(0, 10)));
          
          if (isRelevant) {
            updateDoc(notifDoc.ref, { read: true });
          }
        });
      };
      clearNotifs();
    }
  }, [db, authUser, roomId, messages, room]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !db || !roomId || !authUser) return;
    
    const messageData = {
      senderId: authUser.uid,
      text: input,
      timestamp: serverTimestamp(),
      seen: false
    };

    try {
      addDoc(collection(db, "chatRooms", roomId as string, "messages"), messageData);
      updateDoc(doc(db, "chatRooms", roomId as string), {
        lastMessage: input,
        lastTimestamp: serverTimestamp()
      });
      setInput("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Message failed",
        description: "Your message could not be sent. Please try again."
      });
    }
  };

  const handleCall = () => {
    if (otherUser?.uid === 'system') {
      toast({ title: "System Room", description: "Voice calls are not available with AURA Team." });
      return;
    }
    toast({
      title: "Calling...",
      description: `Dialing ${otherUser?.name || 'User'} via secure link.`,
    });
    window.location.href = `tel:+910000000000`;
  };

  const handleDeleteConversation = async () => {
    if (!db || !roomId) return;
    try {
      await deleteDoc(doc(db, "chatRooms", roomId as string));
      toast({ title: "Conversation Deleted" });
      router.push("/chat");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete conversation." });
    }
  };

  const handleSubmitReport = () => {
    if (!reportReason) return;
    setIsReporting(true);
    setTimeout(() => {
      setIsReporting(false);
      setIsReportDialogOpen(false);
      toast({ title: "Report Submitted", description: "Thank you for helping keep Aura safe." });
    }, 1500);
  };

  if (roomLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Connecting Securely</p>
      </div>
    );
  }

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';

  return (
    <div className="flex-1 flex flex-col bg-background h-screen overflow-hidden transition-colors">
      <header className="px-6 h-16 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{displayName}</span>
              {isVerified && <BadgeCheck size={16} className="text-primary" />}
            </div>
            {!room?.isSystem && (
               <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", otherUser?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                <span className={cn("text-[9px] font-bold uppercase tracking-[0.1em]", otherUser?.isOnline ? "text-emerald-500" : "text-muted-foreground")}>
                  {otherUser?.isOnline ? "Active Now" : "Offline"}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!room?.isSystem && (
            <button 
              onClick={handleCall}
              className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone size={18} />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border text-foreground rounded-2xl p-2 w-52 shadow-2xl backdrop-blur-xl">
              {!room?.isSystem && (
                <DropdownMenuItem 
                  onClick={() => setIsReportDialogOpen(true)}
                  className="rounded-xl px-4 py-3 focus:bg-muted cursor-pointer flex items-center gap-3"
                >
                  <Flag size={16} className="text-muted-foreground" />
                  <span className="text-sm">Report User</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDeleteConversation}
                className="rounded-xl px-4 py-3 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-3"
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete Conversation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-4">
        <div className="text-center py-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Private Connection</span>
        </div>
        
        {messages.map((msg) => {
          const isMe = msg.senderId === authUser?.uid;
          const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
          
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={cn(
                "max-w-[85%] px-5 py-3.5 rounded-[22px] shadow-sm",
                isMe ? "fuchsia-gradient text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border"
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50">
                  <span className="text-[9px] font-medium">{time}</span>
                  {isMe && <CheckCheck size={10} />}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-border pb-4">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={room?.isSystem ? "AURA Support..." : "Message..."}
              className="h-10 bg-muted border-border rounded-full px-5 text-xs placeholder:text-muted-foreground focus:ring-primary pr-12"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground uppercase tracking-widest font-bold">
              Secure
            </div>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full fuchsia-gradient p-0 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Send size={16} className="text-white ml-0.5" />
          </Button>
        </div>
      </div>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="bg-popover border-border text-foreground rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-7">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-1">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1 text-center">
              <DialogTitle className="text-xl font-semibold">Report User</DialogTitle>
              <DialogDescription className="text-muted-foreground text-[13px] font-light leading-snug">
                Help us keep Aura safe. Your report is private.
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Reason</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={cn(
                      "h-10 px-4 rounded-xl text-xs font-medium text-left transition-all border",
                      reportReason === reason ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Details (Optional)</label>
              <Textarea 
                placeholder="Briefly describe what happened..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="bg-muted border-border rounded-xl min-h-[80px] text-xs resize-none focus:ring-primary p-3"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-1">
            <Button 
              onClick={handleSubmitReport}
              disabled={isReporting || !reportReason}
              className="w-full h-12 rounded-2xl fuchsia-gradient text-white font-medium text-base shadow-lg shadow-primary/20"
            >
              {isReporting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Report"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsReportDialogOpen(false)}
              className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
