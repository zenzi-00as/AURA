
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  MoreVertical, 
  Send, 
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
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ChatRoom, UserProfile, Message } from "@/lib/types";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

  const { data: rawMessages } = useCollection<Message>(messagesQuery as any);

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

  const togglePrivacy = () => {
    if (!db || !roomId) return;
    const newState = !room?.privacyEnabled;
    updateDoc(doc(db, "chatRooms", roomId), {
      privacyEnabled: newState
    });
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
    if (!pendingFile || !db || !storage || !roomId || !authUser || !otherUid || !profile) return;
    
    if (profile.dailyMediaCount >= checkPlanLimit(profile, 'dailyMediaUploads')) {
      toast({ variant: "destructive", title: "Limit Reached", description: "Upgrade to Elite for more media sharing." });
      return;
    }

    setIsUploading(true);
    setShowMediaOptions(false);

    try {
      const messageId = doc(collection(db, "dummy")).id;
      const storagePath = `chat-media/${roomId}/${authUser.uid}/${messageId}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, pendingFile);
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

  const handleSendText = async () => {
    if (!input.trim() || !db || !roomId || !authUser || !otherUid || !profile) return;
    
    const dailyMsgLimit = checkPlanLimit(profile, 'dailyMessagesPerProfile');
    const myMessagesToday = messages.filter(m => m.senderId === authUser.uid && m.timestamp?.toDate() > new Date(new Date().setHours(0,0,0,0))).length;
    
    if (myMessagesToday >= dailyMsgLimit) {
      toast({ variant: "destructive", title: "Daily Limit", description: "Elite members get unlimited messages." });
      return;
    }

    const msg = input.trim();
    setInput("");
    setTypingState(false);

    const expiresAt = room?.privacyEnabled ? new Date(Date.now() + 86400000) : null;

    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), { 
        senderId: authUser.uid, 
        text: msg, 
        timestamp: serverTimestamp(), 
        seen: false,
        privacyMode: room?.privacyEnabled,
        expiresAt
      });

      await updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: msg, 
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      if (otherUid !== 'system') {
        addDoc(collection(db, "notifications"), {
          userId: otherUid,
          title: profile.name,
          body: msg,
          type: "message",
          timestamp: serverTimestamp(),
          read: false,
          roomId,
          senderId: authUser.uid
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to send" });
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

  const displayName = room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User");
  const isVerified = room?.isSystem || otherUser?.verificationStatus === 'Verified';
  const isOtherOnline = !room?.isSystem && otherUser?.isOnline && !otherUser?.incognitoMode;
  const isOtherTyping = otherUid && room?.typing?.[otherUid] && !otherUser?.incognitoMode;

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-[#070709] h-screen-safe overflow-hidden transition-colors">
        <header className="px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-20 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2">
              <ArrowLeft size={22} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{displayName}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary" />}
              </div>
              <AnimatePresence mode="wait">
                {isOtherTyping ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-primary font-bold italic">Typing...</motion.p>
                ) : isOtherOnline ? (
                  <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-500">Active</span>
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
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                room?.privacyEnabled ? "bg-primary/20 border-primary/40 text-primary aura-glow-purple" : "bg-white/5 border-white/10 text-white/40"
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
              <DropdownMenuContent align="end" className="glass-dark border-white/10 rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
                {!room?.isSystem && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 tracking-widest px-3 py-2">Privacy Guard</DropdownMenuLabel>
                    <DropdownMenuItem onClick={togglePrivacy} className="rounded-xl px-4 py-3 text-white cursor-pointer flex items-center gap-3">
                      {room?.privacyEnabled ? <Shield size={16} className="text-primary" /> : <Lock size={16} />}
                      <span>{room?.privacyEnabled ? "Disable Incognito" : "Enable Incognito"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem className="rounded-xl px-4 py-3 text-destructive cursor-pointer flex items-center gap-3">
                      <ShieldAlert size={16} /><span>Report & Block</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-4 py-3 text-white/60 cursor-pointer flex items-center gap-3">
                      <Trash2 size={16} /><span>Clear History</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                <ImageIcon size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold">Start the conversation</h3>
                <p className="text-xs text-white/40 font-light">Say hello and see where it goes.</p>
              </div>
            </div>
          ) : messages.map((msg) => {
            const isMe = msg.senderId === authUser?.uid;
            const time = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            
            const myViews = msg.viewCount?.[authUser?.uid || ""] || 0;
            const isMediaExpired = msg.isMedia && (
              (msg.viewMode === 'one' && myViews >= 1) || 
              (msg.viewMode === 'two' && myViews >= 2)
            );

            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "max-w-[80%] flex flex-col",
                  isMe ? "items-end" : "items-start"
                )}>
                  <div 
                    onClick={() => msg.isMedia && !isMediaExpired && handleViewMedia(msg)}
                    className={cn(
                      "px-4 py-3 rounded-[22px] shadow-sm relative overflow-hidden transition-all", 
                      isMe 
                        ? "fuchsia-gradient text-white rounded-br-none" 
                        : "bg-white/5 backdrop-blur-xl text-white rounded-bl-none border border-white/10",
                      msg.isMedia && !isMediaExpired && "cursor-pointer active:scale-95"
                    )}
                  >
                    {msg.isMedia ? (
                      <div className="space-y-2">
                        {isMediaExpired ? (
                          <div className="flex flex-col items-center gap-2 py-4 px-8 text-white/20">
                            <EyeOff size={32} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Media Expired</span>
                          </div>
                        ) : (
                          <div className="relative group">
                            <img 
                              src={msg.mediaUrl} 
                              alt="Media" 
                              className={cn(
                                "rounded-xl max-w-full max-h-60 object-cover",
                                (msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && "blur-2xl grayscale"
                              )} 
                            />
                            {(msg.viewMode === 'one' || msg.viewMode === 'two') && !isMe && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 rounded-xl">
                                <Eye size={24} className="text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Tap to view</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest opacity-40">
                          {msg.viewMode === 'one' ? <EyeOff size={10} /> : <Eye size={10} />}
                          <span>{msg.viewMode === 'unlimited' ? "Unlimited" : msg.viewMode === 'one' ? "View Once" : "View Twice"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1.5 px-1 opacity-30">
                    <span className="text-[9px] font-medium text-white">{time}</span>
                    {isMe && (
                      <div className="flex">
                        <CheckCheck size={10} className={msg.seen ? "text-primary" : "text-white"} />
                      </div>
                    )}
                    {msg.privacyMode && <Shield size={10} className="text-primary" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-2 w-full" />
        </div>

        <div className="p-4 bg-black/60 backdrop-blur-2xl border-t border-white/5 safe-bottom">
          <div className="flex items-center gap-2 max-w-md mx-auto h-14">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0 active:scale-90"
            >
              <ImageIcon size={24} />
            </button>

            <div className="flex-1 h-14 relative">
              <Input 
                value={input} 
                onChange={handleInputChange} 
                onKeyPress={(e) => e.key === 'Enter' && handleSendText()} 
                placeholder={room?.privacyEnabled ? "Incognito message..." : "Message..."} 
                className="h-full bg-white/5 border-white/10 rounded-[28px] px-6 text-sm text-white focus:ring-1 focus:ring-primary shadow-none border-none placeholder:text-white/20" 
              />
            </div>

            <button 
              onClick={handleSendText} 
              disabled={!input.trim()} 
              className="w-14 h-14 rounded-full fuchsia-gradient p-0 shadow-xl shadow-primary/20 shrink-0 border-none transition-transform active:scale-95 flex items-center justify-center disabled:opacity-20 disabled:grayscale"
            >
              <Send size={22} className="text-white translate-x-0.5" />
            </button>
          </div>
        </div>

        <Dialog open={showMediaOptions} onOpenChange={setShowMediaOptions}>
          <DialogContent className="glass-dark border-white/10 rounded-[32px] p-6 max-w-[320px]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-bold text-white">Media View Mode</DialogTitle>
              <DialogDescription className="text-xs text-white/40">Choose how the recipient can see this photo.</DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {pendingPreview && (
                <div className="aspect-square w-full rounded-2xl overflow-hidden border border-white/10">
                  <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'unlimited', label: 'Unlimited Views', icon: Eye },
                  { id: 'one', label: 'View Once', icon: EyeOff },
                  { id: 'two', label: 'View Twice', icon: Clock }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setViewMode(opt.id as any)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                      viewMode === opt.id ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/5 text-white/60"
                    )}
                  >
                    <opt.icon size={18} className={viewMode === opt.id ? "text-primary" : ""} />
                    <span className="text-sm font-bold uppercase tracking-widest">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowMediaOptions(false)} className="flex-1 rounded-xl text-white/40">Cancel</Button>
              <Button onClick={handleSendMedia} className="flex-1 rounded-xl fuchsia-gradient font-bold">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
          <DialogContent className="p-0 border-none bg-black/95 max-w-full h-full sm:rounded-none flex flex-col items-center justify-center">
            <header className="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary aura-glow-purple" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                    {selectedMedia?.viewMode === 'unlimited' ? "Unlimited Discovery" : "Private Insight"}
                  </span>
               </div>
               <button onClick={() => setSelectedMedia(null)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                 <X size={24} />
               </button>
            </header>
            
            {selectedMedia && (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img 
                  src={selectedMedia.mediaUrl} 
                  alt="Aura Content" 
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                />
                
                <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 text-center px-8">
                  <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 flex items-center gap-3">
                    <Shield size={16} className="text-primary" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                      {selectedMedia.viewMode === 'one' ? "1 View Remaining" : selectedMedia.viewMode === 'two' ? "Final Insight" : "Unlimited Access"}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
                    Screenshot protection active where supported.<br />Contents disappear upon closing.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
