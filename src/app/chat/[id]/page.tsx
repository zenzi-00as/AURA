"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
  Check,
  CheckCheck, 
  BadgeCheck, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  Image as ImageIcon, 
  Lock, 
  Clock, 
  Shield, 
  Eye, 
  EyeOff, 
  X,
  Flag,
  UserX,
  AlertCircle,
  ShieldCheck,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useStorage } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  serverTimestamp, 
  addDoc, 
  updateDoc, 
  increment,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ChatRoom, UserProfile, Message, ReportType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { checkPlanLimit } from "@/lib/plan-limits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const REPORT_CATEGORIES: ReportType[] = [
  'Harassment', 'Spam', 'Fake profile', 'Scams', 'Hate behavior', 
  'Sexual exploitation', 'Threats', 'Inappropriate content', 'Other'
];

const QUICK_STARTERS = ["Hey 👋", "Hi, how are you?", "Nice to meet you!", "What's up?"];

export default function ChatRoomPage() {
  const params = useParams();
  const idParam = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user: authUser, profile } = useAuthContext();
  
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"unlimited" | "one" | "two">("unlimited");
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);
  
  // Safety States
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportType>('Other');
  const [reportDesc, setReportDesc] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roomId = useMemo(() => {
    if (!authUser || !idParam) return "";
    if (idParam.startsWith('system_') || idParam.includes('_')) return idParam;
    return [authUser.uid, idParam].sort().join("_");
  }, [authUser, idParam]);

  const roomRef = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return doc(db, "chatRooms", roomId);
  }, [db, roomId]);

  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  const otherUid = useMemo(() => {
    if (!room || !authUser) return idParam;
    return room.participants.find(uid => uid !== authUser.uid) || 'system';
  }, [room, authUser, idParam]);

  const otherUserRef = useMemoFirebase(() => {
    if (!db || !otherUid || otherUid === 'system') return null;
    return doc(db, "users", otherUid);
  }, [db, otherUid]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !roomId) return null;
    return query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc"));
  }, [db, roomId]);

  const { data: rawMessages, loading: messagesLoading } = useCollection<Message>(messagesQuery as any);

  const messages = useMemo(() => {
    const now = new Date();
    return rawMessages.filter(m => {
      if (!m.expiresAt) return true;
      const expiry = m.expiresAt.toDate ? m.expiresAt.toDate() : new Date(m.expiresAt);
      return expiry > now;
    });
  }, [rawMessages]);

  useEffect(() => {
    if (db && authUser && roomId && otherUid && !roomLoading) {
      if (!room) {
        setDoc(doc(db, "chatRooms", roomId), {
          id: roomId,
          participants: [authUser.uid, otherUid],
          lastMessage: "",
          lastTimestamp: serverTimestamp(),
          unreadCount: { [authUser.uid]: 0, [otherUid]: 0 },
          typing: { [authUser.uid]: false, [otherUid]: false },
          privacyEnabled: false
        }, { merge: true });
      } else {
        updateDoc(doc(db, "chatRooms", roomId), {
          [`unreadCount.${authUser.uid}`]: 0
        }).catch(() => {});
      }
    }
  }, [db, authUser, roomId, otherUid, room, roomLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

  const togglePrivacy = () => {
    if (!db || !roomId) return;
    const newState = !room?.privacyEnabled;
    updateDoc(doc(db, "chatRooms", roomId), {
      privacyEnabled: newState
    });
    if (newState) setShowPrivacyNotice(true);
    toast({
      title: newState ? "Incognito Chat Active" : "Incognito Disabled",
      description: newState ? "Messages expire after 24h." : "Chat history now preserved."
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max size is 10MB." });
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPendingPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowMediaOptions(true);
  };

  const handleSendMedia = async () => {
    if (!authUser || !profile || !db || !storage) {
      toast({ variant: "destructive", title: "Action Denied", description: "Please sign in to continue chatting." });
      return;
    }
    
    if (profile.dailyMediaCount >= checkPlanLimit(profile, 'dailyMediaUploads')) {
      toast({ variant: "destructive", title: "Limit Reached", description: "Upgrade to Elite for more media sharing." });
      return;
    }

    setIsUploading(true);
    setShowMediaOptions(false);

    try {
      const messageId = doc(collection(db, "temp")).id;
      const storagePath = `chat-media/${authUser.uid}/${roomId}/${messageId}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, pendingFile!);
      const mediaUrl = await getDownloadURL(storageRef);

      const expiresAt = room?.privacyEnabled ? new Date(Date.now() + 86400000) : null;

      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        id: messageId,
        senderId: authUser.uid,
        text: "[Media]",
        timestamp: serverTimestamp(),
        seen: false,
        isMedia: true,
        mediaUrl,
        storagePath,
        viewMode,
        viewCount: { [authUser.uid]: 0, [otherUid]: 0 },
        privacyMode: room?.privacyEnabled,
        expiresAt
      });

      await updateDoc(doc(db, "chatRooms", roomId), {
        lastMessage: "Shared media",
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      await updateDoc(doc(db, "users", authUser.uid), { dailyMediaCount: increment(1) });
      
      setPendingFile(null);
      setPendingPreview(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: "The Ethereal stage encountered a synchronization error." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendText = async (textOverride?: string) => {
    const msgText = textOverride || input.trim();
    if (!msgText || !db || !roomId || !authUser || !otherUid || !profile) return;
    
    const dailyMsgLimit = checkPlanLimit(profile, 'dailyMessagesPerProfile');
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const myMessagesToday = messages.filter(m => m.senderId === authUser.uid && (m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp)) > today).length;
    
    if (myMessagesToday >= dailyMsgLimit) {
      toast({ variant: "destructive", title: "Daily Limit", description: "Elite members get unlimited messages." });
      return;
    }

    if (!textOverride) setInput("");
    setTypingState(false);

    const expiresAt = room?.privacyEnabled ? new Date(Date.now() + 86400000) : null;

    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), { 
        senderId: authUser.uid, 
        text: msgText, 
        timestamp: serverTimestamp(), 
        seen: false,
        privacyMode: room?.privacyEnabled,
        expiresAt,
        status: 'sent'
      });

      await updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: msgText, 
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      if (otherUid !== 'system') {
        addDoc(collection(db, "notifications"), {
          userId: otherUid,
          title: profile.name,
          body: room?.privacyEnabled ? "New private message" : msgText,
          type: "message",
          timestamp: serverTimestamp(),
          read: false,
          roomId,
          senderId: authUser.uid
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Synchronization failed" });
    }
  };

  const handleViewMedia = async (msg: Message) => {
    if (!db || !authUser || !roomId) return;
    
    const count = msg.viewCount?.[authUser.uid] || 0;
    if (msg.viewMode === 'one' && count >= 1) return;
    if (msg.viewMode === 'two' && count >= 2) return;

    const msgRef = doc(db, "chatRooms", roomId, "messages", msg.id);
    await updateDoc(msgRef, {
      [`viewCount.${authUser.uid}`]: increment(1)
    });

    setSelectedMedia(msg);
  };

  const handleReport = async () => {
    if (!db || !authUser || !otherUid) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: authUser.uid,
        targetId: otherUid,
        reason: reportReason,
        description: reportDesc,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      toast({ title: "Report Submitted", description: "Our safety team will review this within 24 hours." });
      setShowReportDialog(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" });
    } finally {
      setIsReporting(false);
    }
  };

  const handleBlock = async () => {
    if (!db || !authUser || !otherUid) return;
    try {
      const blockId = otherUid;
      await setDoc(doc(db, "users", authUser.uid, "blockedUsers", blockId), {
        uid: otherUid,
        name: otherUser?.name || "User",
        blockedAt: serverTimestamp()
      });
      toast({ title: "Member Blocked", description: "You will no longer see each other in the Aura." });
      router.push('/chat');
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleClearHistory = async () => {
    if (!db || !roomId) return;
    const confirm = window.confirm("Are you sure you want to clear this chat history locally?");
    if (!confirm) return;
    
    try {
      toast({ title: "History Cleared" });
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';
  const isOtherOnline = !room?.isSystem && otherUser?.isOnline && !otherUser?.incognitoMode;
  const isOtherTyping = otherUid && room?.typing?.[otherUid] && !otherUser?.incognitoMode;

  if (roomLoading) {
    return (
      <div className="flex flex-col h-screen-safe items-center justify-center bg-[#070709]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="mt-4 text-white/40 text-xs font-bold uppercase tracking-widest">Opening secure chat…</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen-safe bg-[#070709] overflow-hidden selection:bg-primary/20">
        {/* Header Interaction Stage */}
        <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-30 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2 active:scale-90" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            <div className="flex flex-col" onClick={() => otherUid !== 'system' && router.push(`/dashboard`)}>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <span className="font-semibold text-sm text-white tracking-tight">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
              </div>
              <AnimatePresence mode="wait">
                {isOtherTyping ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-primary font-bold italic">typing...</motion.p>
                ) : isOtherOnline ? (
                  <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-500">Active Now</span>
                  </motion.div>
                ) : !room?.isSystem && (
                  <motion.span key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[8px] font-bold uppercase tracking-[0.1em] text-white/20">Offline</motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={togglePrivacy}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border active:scale-95",
                room?.privacyEnabled ? "bg-primary/20 border-primary/40 text-primary aura-glow-purple" : "bg-white/5 border-white/10 text-white/40"
              )}
              title="Open privacy settings"
              aria-label="Open privacy settings"
            >
              <Shield size={18} />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white active:scale-95" aria-label="More options">
                  <MoreVertical size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#070709] border-white/10 rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
                {!room?.isSystem && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 tracking-widest px-3 py-2">Member Control</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push(`/dashboard`)} className="rounded-xl px-4 py-3 text-white cursor-pointer flex items-center gap-3">
                      <ImageIcon size={16} /><span>View Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={togglePrivacy} className="rounded-xl px-4 py-3 text-white cursor-pointer flex items-center gap-3">
                      {room?.privacyEnabled ? <ShieldCheck size={16} className="text-primary" /> : <Shield size={16} />}
                      <span>{room?.privacyEnabled ? "Disable Incognito" : "Enable Incognito"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="rounded-xl px-4 py-3 text-destructive cursor-pointer flex items-center gap-3">
                      <Flag size={16} /><span>Report Member</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="rounded-xl px-4 py-3 text-destructive cursor-pointer flex items-center gap-3">
                      <UserX size={16} /><span>Block Member</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={handleClearHistory} className="rounded-xl px-4 py-3 text-white/60 cursor-pointer flex items-center gap-3">
                      <Trash2 size={16} /><span>Clear History</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Message Flow Area */}
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 scrollbar-hide flex flex-col z-10">
          {messages.length === 0 && !messagesLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                <X size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-bold text-lg tracking-tight">Start the conversation</h3>
                <p className="text-xs text-white/40 font-light max-w-[200px] mx-auto">Say hello and see where your auras take you.</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {QUICK_STARTERS.map(q => (
                  <button 
                    key={q} 
                    onClick={() => handleSendText(q)}
                    className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-medium hover:bg-primary/20 hover:border-primary/40 transition-all active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.map((msg, idx) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            
            const prevMsg = messages[idx - 1];
            const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId;

            const myViews = msg.viewCount?.[authUser?.uid || ""] || 0;
            const isMediaExpired = msg.isMedia && (
              (msg.viewMode === 'one' && myViews >= 1) || 
              (msg.viewMode === 'two' && myViews >= 2)
            );

            return (
              <motion.div 
                key={msg.id || `msg-${idx}`} 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                className={cn("flex w-full", isMe ? "justify-end" : "justify-start", isConsecutive ? "mt-1" : "mt-4")}
              >
                <div className={cn(
                  "max-w-[85%] flex flex-col",
                  isMe ? "items-end" : "items-start"
                )}>
                  <div 
                    onClick={() => msg.isMedia && !isMediaExpired && handleViewMedia(msg)}
                    className={cn(
                      "px-4 py-3 rounded-[24px] shadow-lg relative overflow-hidden transition-all duration-300", 
                      isMe 
                        ? "premium-gradient text-white rounded-br-none shadow-primary/10" 
                        : "bg-white/5 backdrop-blur-xl text-white rounded-bl-none border border-white/10",
                      msg.isMedia && !isMediaExpired && "cursor-pointer active:scale-98"
                    )}
                  >
                    {msg.isMedia ? (
                      <div className="space-y-2">
                        {isMediaExpired ? (
                          <div className="flex flex-col items-center gap-2 py-6 px-10 text-white/20">
                            <EyeOff size={32} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Media Expired</span>
                          </div>
                        ) : (
                          <div className="relative group">
                            <img 
                              src={msg.mediaUrl} 
                              alt="Media" 
                              className={cn(
                                "rounded-2xl max-w-full max-h-[300px] object-cover",
                                (msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && "blur-3xl grayscale opacity-40"
                              )} 
                            />
                            {(msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 rounded-2xl">
                                <Eye size={28} className="text-white drop-shadow-2xl" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Tap to materialize</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] opacity-40 px-1">
                          {msg.viewMode === 'one' ? <EyeOff size={10} /> : <Eye size={10} />}
                          <span>{msg.viewMode === 'unlimited' ? "Permanent Discovery" : msg.viewMode === 'one' ? "View Once" : "View Twice"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-light">{msg.text}</p>
                    )}
                  </div>
                  
                  {!isConsecutive && (
                    <div className="flex items-center gap-2 mt-1.5 px-2 opacity-30">
                      <span className="text-[9px] font-medium text-white">{time}</span>
                      {isMe && (
                        <div className="flex">
                          {msg.seen ? <CheckCheck size={10} className="text-primary" /> : <Check size={10} className="text-white" />}
                        </div>
                      )}
                      {msg.privacyMode && <Shield size={10} className="text-primary" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-4 flex-shrink-0" />
        </div>

        {/* Interaction Stage Footer */}
        <div className="flex-shrink-0 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
          <div className="flex items-center gap-3 w-full h-14">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0 active:scale-90"
              aria-label="Send image"
            >
              <Plus size={22} />
            </button>

            <div className="flex-1 h-12 relative flex items-center">
              <Input 
                value={input} 
                onChange={handleInputChange} 
                onKeyPress={(e) => e.key === 'Enter' && handleSendText()} 
                placeholder={room?.privacyEnabled ? "Incognito message..." : "Message..."} 
                className="h-full bg-white/5 border-white/10 rounded-[28px] px-6 text-sm text-white focus:ring-1 focus:ring-primary shadow-none border-none placeholder:text-white/20" 
              />
            </div>

            <button 
              onClick={() => handleSendText()} 
              disabled={!input.trim()} 
              className="w-12 h-12 rounded-full premium-gradient p-0 shadow-xl shadow-primary/20 shrink-0 border-none transition-transform active:scale-90 flex items-center justify-center disabled:opacity-20 disabled:grayscale"
              aria-label="Send message"
            >
              <Send size={20} className="text-white translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Media Privacy Selection */}
        <Dialog open={showMediaOptions} onOpenChange={setShowMediaOptions}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-5 w-[calc(100%-40px)] max-w-[280px] shadow-2xl outline-none">
            <DialogHeader className="space-y-1 mb-2">
              <DialogTitle className="text-sm font-bold text-white tracking-tight">Media Privacy</DialogTitle>
              <DialogDescription className="text-[9px] text-white/40 font-light leading-tight">Choose how the recipient can materialize this photo.</DialogDescription>
            </DialogHeader>
            
            <div className="py-2 space-y-3">
              {pendingPreview && (
                <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-[#151515]">
                  <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'unlimited', label: 'Unlimited Views', icon: Eye },
                  { id: 'one', label: 'View Once', icon: EyeOff },
                  { id: 'two', label: 'View Twice', icon: Clock }
                ].map((opt) => (
                  <button
                    key={`opt-${opt.id}`}
                    onClick={() => setViewMode(opt.id as any)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group active:scale-95",
                      viewMode === opt.id ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/5 text-white/40"
                    )}
                  >
                    <opt.icon size={16} className={cn("transition-colors", viewMode === opt.id ? "text-primary" : "group-hover:text-white")} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="ghost" 
                onClick={() => { setShowMediaOptions(false); setPendingFile(null); setPendingPreview(null); }} 
                className="flex-1 h-10 rounded-xl text-white/40 text-[10px] font-bold uppercase tracking-widest active:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendMedia} 
                className="flex-1 h-10 rounded-xl premium-gradient font-bold text-[10px] uppercase tracking-widest shadow-lg"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Media Focused Viewer */}
        <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
          <DialogContent className="p-0 border-none bg-black/98 max-w-full h-full sm:rounded-none flex flex-col items-center justify-center overflow-hidden">
            <header className="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary aura-glow-purple" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                    {selectedMedia?.viewMode === 'unlimited' ? "Permanent Discovery" : "Ephemeral View"}
                  </span>
               </div>
               <button onClick={() => setSelectedMedia(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md active:scale-90" aria-label="Close media">
                 <X size={20} />
               </button>
            </header>
            
            {selectedMedia && (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <motion.img 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={selectedMedia.mediaUrl} 
                  alt="Aura Content" 
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                />
                
                <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 text-center px-8">
                  <div className="bg-white/5 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
                    <Shield size={16} className="text-primary" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                      {selectedMedia.viewMode === 'one' ? "Single Materialization Remaining" : selectedMedia.viewMode === 'two' ? "Second View Active" : "Unlimited Access"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Safety: Report Member */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-8 max-w-[360px]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-white">Report Member</DialogTitle>
              <DialogDescription className="text-sm text-white/40">Help us maintain a safe Aura community. Your report is private.</DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
               <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                  {REPORT_CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setReportReason(cat)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border text-xs font-medium transition-all",
                        reportReason === cat ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
               <Textarea 
                placeholder="Optional description..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl text-white text-xs min-h-[80px]"
               />
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowReportDialog(false)} className="flex-1 rounded-xl text-white/40">Cancel</Button>
              <Button onClick={handleReport} disabled={isReporting} className="flex-1 rounded-xl bg-destructive text-white">
                {isReporting ? <Loader2 size={16} className="animate-spin" /> : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Privacy Notice Overlay */}
        <Dialog open={showPrivacyNotice} onOpenChange={setShowPrivacyNotice}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-8 max-w-[320px] text-center">
            <div className="w-16 h-16 rounded-[24px] bg-primary/20 mx-auto flex items-center justify-center text-primary mb-6">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Incognito Active</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              Messages will disappear after 24 hours. Media materialization is limited. Screenshots are discouraged.
            </p>
            <Button onClick={() => setShowPrivacyNotice(false)} className="w-full h-12 rounded-xl premium-gradient text-white font-bold">I Understand</Button>
          </DialogContent>
        </Dialog>

      </div>
    </AuthGuard>
  );
}
