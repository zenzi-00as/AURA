
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
  Plus,
  Star,
  MessageSquare
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
import { checkPlanLimit, isSpotlightActive, isElite, isElitePlus } from "@/lib/plan-limits";
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
        // Enforce specific daily new chat limit
        const limitCount = checkPlanLimit(profile, 'dailyNewChats') as number;
        const currentCount = profile?.dailyChatCount || 0;
        
        if (limitCount < 999999 && currentCount >= limitCount) {
           const tierName = profile?.plan === 'Elite' ? 'Aura Elite' : 'Aura Free';
           const upgradeTarget = profile?.plan === 'Elite' ? 'Elite Plus' : 'Elite';
           
           toast({ 
             variant: "destructive", 
             title: "Connection Limit Reached", 
             description: `${tierName} allows ${limitCount} new chats per day. Upgrade to ${upgradeTarget} for more connections.` 
           });
           router.push('/chat');
           return;
        }

        setDoc(doc(db, "chatRooms", roomId), {
          id: roomId,
          participants: [authUser.uid, otherUid],
          lastMessage: "",
          lastTimestamp: serverTimestamp(),
          unreadCount: { [authUser.uid]: 0, [otherUid]: 0 },
          typing: { [authUser.uid]: false, [otherUid]: false },
          privacyEnabled: false
        }, { merge: true });
        
        if (!isElitePlus(profile)) {
          updateDoc(doc(db, "users", authUser.uid), { dailyChatCount: increment(1) });
        }
      } else {
        updateDoc(doc(db, "chatRooms", roomId), {
          [`unreadCount.${authUser.uid}`]: 0
        }).catch(() => {});
      }
    }
  }, [db, authUser, roomId, otherUid, room, roomLoading, profile, router, toast]);

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
    if (!authUser || !profile || !db || !storage) return;
    
    const limit = checkPlanLimit(profile, 'dailyMediaUploads') as number;
    if (limit < 999999 && profile.dailyMediaCount >= limit) {
      const upgradeTarget = profile.plan === 'Elite' ? 'Elite Plus' : 'Elite';
      toast({ 
        variant: "destructive", 
        title: "Media Limit Reached", 
        description: `Aura ${profile.plan || 'Free'} allows ${limit} media shares per day. Upgrade to ${upgradeTarget} for more sharing.` 
      });
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
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendText = async (textOverride?: string) => {
    const msgText = textOverride || input.trim();
    if (!msgText || !db || !roomId || !authUser || !otherUid || !profile) return;
    
    const maxMsgs = checkPlanLimit(profile, 'dailyMessagesPerProfile') as number;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const myMessagesToday = messages.filter(m => m.senderId === authUser.uid && (m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp)) > today).length;
    
    if (maxMsgs < 999999 && myMessagesToday >= maxMsgs) {
      toast({ 
        variant: "destructive", 
        title: "Daily Quota Reached", 
        description: `Aura ${profile.plan || 'Free'} allows ${maxMsgs} messages per chat. Upgrade to Elite Plus for unlimited messaging.` 
      });
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
      toast({ variant: "destructive", title: "Sync failed" });
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
      await setDoc(doc(db, "users", authUser.uid, "blockedUsers", otherUid), {
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

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';
  const isOtherSpotlight = isSpotlightActive(otherUser);
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
      <div className="flex flex-col h-screen-safe bg-[#070709] overflow-hidden">
        <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-30 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2">
              <ArrowLeft size={22} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
                {isOtherSpotlight && <Star size={16} className="text-primary animate-pulse" />}
              </div>
              <AnimatePresence mode="wait">
                {isOtherTyping ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-primary font-bold italic">typing...</motion.p>
                ) : isOtherOnline ? (
                  <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">Active</span>
                  </motion.div>
                ) : !room?.isSystem && (
                  <motion.span key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[8px] font-bold uppercase tracking-widest text-white/20">Offline</motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={togglePrivacy}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                room?.privacyEnabled ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(0,87,255,0.2)]" : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              <Shield size={18} />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white">
                  <MoreVertical size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#070709] border-white/10 rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
                {!room?.isSystem && (
                  <>
                    <DropdownMenuItem onClick={() => router.push(`/dashboard`)} className="rounded-xl px-4 py-3 text-white flex items-center gap-3">
                      <ImageIcon size={16} /><span>View Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={togglePrivacy} className="rounded-xl px-4 py-3 text-white flex items-center gap-3">
                      {room?.privacyEnabled ? <ShieldCheck size={16} className="text-primary" /> : <Shield size={16} />}
                      <span>{room?.privacyEnabled ? "Disable Incognito" : "Enable Incognito"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="rounded-xl px-4 py-3 text-destructive flex items-center gap-3">
                      <Flag size={16} /><span>Report</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="rounded-xl px-4 py-3 text-destructive flex items-center gap-3">
                      <UserX size={16} /><span>Block</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 scrollbar-hide flex flex-col z-10">
          {messages.length === 0 && !messagesLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-white font-bold text-lg tracking-tight">Start the conversation</h3>
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {QUICK_STARTERS.map(q => (
                  <button key={q} onClick={() => handleSendText(q)} className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs hover:bg-primary/20 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.map((msg, idx) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            const isConsecutive = messages[idx - 1]?.senderId === msg.senderId;

            const myViews = msg.viewCount?.[authUser?.uid || ""] || 0;
            const isMediaExpired = msg.isMedia && (
              (msg.viewMode === 'one' && myViews >= 1) || 
              (msg.viewMode === 'two' && myViews >= 2)
            );

            return (
              <motion.div key={msg.id || `msg-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", isMe ? "justify-end" : "justify-start", isConsecutive ? "mt-1" : "mt-4")}>
                <div className={cn("max-w-[85%] flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div onClick={() => msg.isMedia && !isMediaExpired && handleViewMedia(msg)} className={cn("px-4 py-3 rounded-[24px] shadow-lg relative overflow-hidden transition-all", isMe ? "premium-gradient text-white rounded-br-none" : "bg-white/5 backdrop-blur-xl text-white rounded-bl-none border border-white/10", msg.isMedia && !isMediaExpired && "cursor-pointer")}>
                    {msg.isMedia ? (
                      <div className="space-y-2">
                        {isMediaExpired ? (
                          <div className="flex flex-col items-center gap-2 py-6 px-10 text-white/20">
                            <EyeOff size={32} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Expired</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <img src={msg.mediaUrl} alt="" className={cn("rounded-2xl max-w-full max-h-[300px] object-cover", (msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && "blur-3xl opacity-40")} />
                            {(msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 rounded-2xl">
                                <Eye size={28} className="text-white" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Tap to view</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest opacity-40">
                          {msg.viewMode === 'one' ? "View Once" : msg.viewMode === 'two' ? "View Twice" : "Permanent"}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed font-light">{msg.text}</p>
                    )}
                  </div>
                  {!isConsecutive && (
                    <div className="flex items-center gap-2 mt-1.5 px-2 opacity-30 text-[9px] font-medium text-white">
                      <span>{time}</span>
                      {isMe && (msg.seen ? <CheckCheck size={10} className="text-primary" /> : <Check size={10} />)}
                      {msg.privacyMode && <Shield size={10} className="text-primary" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-4 flex-shrink-0" />
        </div>

        <div className="flex-shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
          <div className="flex items-center gap-3 w-full h-14">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0">
              <Plus size={22} />
            </button>
            <div className="flex-1 h-12 relative flex items-center">
              <Input value={input} onChange={handleInputChange} onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} placeholder={room?.privacyEnabled ? "Incognito message..." : "Message..."} className="h-full bg-white/5 border-white/10 rounded-[28px] px-6 text-sm text-white focus:ring-1 focus:ring-primary shadow-none border-none placeholder:text-white/20" />
            </div>
            <button onClick={() => handleSendText()} disabled={!input.trim()} className="w-12 h-12 rounded-full premium-gradient p-0 shrink-0 border-none flex items-center justify-center disabled:opacity-20">
              <Send size={20} className="text-white" />
            </button>
          </div>
        </div>

        <Dialog open={showMediaOptions} onOpenChange={setShowMediaOptions}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-5 w-[calc(100%-40px)] max-w-[280px]">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-sm font-bold text-white">Media View Mode</DialogTitle>
              <DialogDescription className="text-[9px] text-white/40">Control how the recipient views this photo.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              {pendingPreview && <img src={pendingPreview} className="w-full aspect-[4/3] rounded-2xl object-cover border border-white/10" />}
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'unlimited', label: 'Unlimited', icon: Eye },
                  { id: 'one', label: 'View Once', icon: EyeOff },
                  { id: 'two', label: 'View Twice', icon: Clock }
                ].map((opt) => (
                  <button key={opt.id} onClick={() => setViewMode(opt.id as any)} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all text-left", viewMode === opt.id ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/5 text-white/40")}>
                    <opt.icon size={16} className={viewMode === opt.id ? "text-primary" : ""} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowMediaOptions(false)} className="flex-1 h-10 rounded-xl text-white/40 text-[10px] font-bold">Cancel</Button>
              <Button onClick={handleSendMedia} className="flex-1 h-10 rounded-xl premium-gradient font-bold text-[10px]">Send</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
          <DialogContent className="p-0 border-none bg-black/98 max-w-full h-full sm:rounded-none flex flex-col items-center justify-center overflow-hidden">
            <header className="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
               <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                 {selectedMedia?.viewMode === 'unlimited' ? "Permanent Discovery" : "Ephemeral View"}
               </span>
               <button onClick={() => setSelectedMedia(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                 <X size={20} />
               </button>
            </header>
            {selectedMedia && <img src={selectedMedia.mediaUrl} className="max-w-full max-h-[80vh] object-contain rounded-2xl" />}
          </DialogContent>
        </Dialog>

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-8 max-w-[360px]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-white">Report Member</DialogTitle>
              <DialogDescription className="text-sm text-white/40">Help us maintain a safe community.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                {REPORT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setReportReason(cat)} className={cn("w-full text-left p-3 rounded-xl border text-xs transition-all", reportReason === cat ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/5 text-white/40")}>
                    {cat}
                  </button>
                ))}
              </div>
              <Textarea placeholder="Optional description..." value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} className="bg-white/5 border-white/10 rounded-xl text-white text-xs min-h-[80px]" />
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowReportDialog(false)} className="flex-1 rounded-xl text-white/40">Cancel</Button>
              <Button onClick={handleReport} disabled={isReporting} className="flex-1 rounded-xl bg-destructive text-white">{isReporting ? <Loader2 size={16} className="animate-spin" /> : "Submit"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
