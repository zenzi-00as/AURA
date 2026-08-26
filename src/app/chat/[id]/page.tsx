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
  Loader2, 
  Eye, 
  EyeOff, 
  X,
  Flag,
  UserX,
  Plus,
  Star,
  Lock,
  Info,
  ShieldCheck,
  BookOpen,
  AlertTriangle
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
import { ChatRoom, UserProfile, Message, ReportType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getPlanConfig, checkActionAllowed } from "@/lib/subscription-engine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/aura/UpgradeModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";

/**
 * @fileOverview High-Fidelity Chat Interaction Stage.
 * Hardened against recursive unread synchronization loops and null-pointer boundary risks.
 */

const REPORT_CATEGORIES: { id: ReportType; label: string }[] = [
  { id: 'Harassment', label: 'Harassment' },
  { id: 'Spam', label: 'Spam or Scam' },
  { id: 'Fake profile', label: 'Fake Profile' },
  { id: 'Inappropriate content', label: 'Inappropriate Content' },
  { id: 'Threats', label: 'Threats or Violence' },
  { id: 'Other', label: 'Other' },
];

export default function ChatRoomPage() {
  const params = useParams();
  const idParam = (params?.id as string) || "";
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"unlimited" | "one" | "two">("unlimited");
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: any, feature: string, limit?: number | null} | null>(null);
  
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportType>('Other');
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomId = useMemo(() => {
    if (!authUser || !idParam) return "";
    if (idParam.startsWith('system_') || idParam.includes('_')) return idParam;
    return [authUser.uid, idParam].sort().join("_");
  }, [authUser?.uid, idParam]);

  const roomRef = useMemoFirebase(() => (db && roomId) ? doc(db, "chatRooms", roomId) : null, [db, roomId]);
  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  const otherUid = useMemo(() => {
    if (!room || !room.participants || !authUser) return idParam;
    return room.participants.find(uid => uid !== authUser.uid) || 'system';
  }, [room, authUser?.uid, idParam]);

  const otherUserRef = useMemoFirebase(() => (db && otherUid && otherUid !== 'system') ? doc(db, "users", otherUid) : null, [db, otherUid]);
  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  const messagesQuery = useMemoFirebase(() => (db && roomId) ? query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc")) : null, [db, roomId]);
  const { data: messages } = useCollection<Message>(messagesQuery as any);

  useEffect(() => {
    if (db && authUser && roomId && otherUid && !roomLoading) {
      if (!room) {
        if (otherUid !== 'system' && !idParam.startsWith('system_')) {
          const check = checkActionAllowed(profile, 'newChat');
          if (!check.allowed) {
            setUpgradeModal({ isOpen: true, plan: effectivePlan === 'free' ? 'elite' : 'elite_plus', feature: 'New Chats', limit: check.limit });
            router.push('/chat');
            return;
          }
          const roomData = {
            id: roomId,
            participants: [authUser.uid, otherUid],
            lastMessage: "",
            lastTimestamp: serverTimestamp(),
            unreadCount: { [authUser.uid]: 0, [otherUid]: 0 },
            typing: { [authUser.uid]: false, [otherUid]: false }
          };
          
          setDoc(doc(db, "chatRooms", roomId), roomData).catch(async (e) => {
            const err = new FirestorePermissionError({ path: `chatRooms/${roomId}`, operation: 'create', requestResourceData: roomData });
            errorEmitter.emit('permission-error', err);
          });
          
          updateDoc(doc(db, "users", authUser.uid), { 'usage.newChatsUsed': increment(1) }).catch(() => {});
        }
      } else {
        // Explicit non-zero check to prevent recursive snapshot loop
        if (room.unreadCount && typeof room.unreadCount[authUser.uid] === 'number' && room.unreadCount[authUser.uid] !== 0) {
          updateDoc(doc(db, "chatRooms", roomId), { [`unreadCount.${authUser.uid}`]: 0 }).catch(() => {});
        }
      }
    }
  }, [db, authUser?.uid, roomId, otherUid, room, roomLoading, profile, router, toast, idParam, effectivePlan]);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "instant" }); 
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max size is 10MB." });
      return;
    }
    const check = checkActionAllowed(profile, 'media');
    if (!check.allowed) {
      setUpgradeModal({ isOpen: true, plan: effectivePlan === 'free' ? 'elite' : 'elite_plus', feature: 'Media Sharing', limit: check.limit });
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPendingPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowMediaOptions(true);
  };

  const handleSendMedia = async () => {
    if (!authUser || !db || !storage || !pendingFile) return;
    setIsUploading(true);
    setShowMediaOptions(false);
    try {
      const messageId = doc(collection(db, "temp")).id;
      const storagePath = `chat-media/${authUser.uid}/${roomId}/${messageId}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pendingFile);
      const mediaUrl = await getDownloadURL(storageRef);

      const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
      const msgData = {
        id: msgRef.id,
        senderId: authUser.uid, 
        text: "[Media]", 
        timestamp: serverTimestamp(), 
        seen: false, 
        isMedia: true, 
        mediaUrl, 
        storagePath, 
        viewMode, 
        viewCount: { [authUser.uid]: 0, [otherUid]: 0 }
      };

      setDoc(msgRef, msgData).catch(async (e) => {
        const err = new FirestorePermissionError({ path: msgRef.path, operation: 'create', requestResourceData: msgData });
        errorEmitter.emit('permission-error', err);
      });

      updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: "Shared media", 
        lastTimestamp: serverTimestamp(), 
        [`unreadCount.${otherUid}`]: increment(1) 
      }).catch(() => {});
      
      updateDoc(doc(db, "users", authUser.uid), { 'usage.mediaUsed': increment(1) }).catch(() => {});
      
      setPendingFile(null); 
      setPendingPreview(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendText = async () => {
    const msgText = input.trim();
    if (!msgText || !db || !roomId || !authUser || !otherUid) return;
    setInput("");
    const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
    const msgData = { 
      id: msgRef.id,
      senderId: authUser.uid, 
      text: msgText, 
      timestamp: serverTimestamp(), 
      seen: false 
    };
    
    setDoc(msgRef, msgData).catch(async (e) => {
      const err = new FirestorePermissionError({ path: msgRef.path, operation: 'create', requestResourceData: msgData });
      errorEmitter.emit('permission-error', err);
    });

    updateDoc(doc(db, "chatRooms", roomId), { 
      lastMessage: msgText, 
      lastTimestamp: serverTimestamp(), 
      [`unreadCount.${otherUid}`]: increment(1) 
    }).catch(() => {});
  };

  const handleMediaClick = (msg: Message) => {
    if (!authUser) return;
    const views = msg.viewCount?.[authUser.uid] || 0;
    
    if (msg.viewMode === 'one' && views >= 1) {
      toast({ title: "View Expired", description: "This media packet was valid for one view only." });
      return;
    }
    if (msg.viewMode === 'two' && views >= 2) {
      toast({ title: "View Expired", description: "This media packet was valid for two views only." });
      return;
    }

    setSelectedMedia(msg);
    if (db && roomId && msg.id) {
       updateDoc(doc(db, "chatRooms", roomId, "messages", msg.id), {
          [`viewCount.${authUser.uid}`]: increment(1)
       }).catch(() => {});
    }
  };

  const handleReportSubmit = async () => {
    if (!db || !authUser || !otherUid || !reportDescription.trim()) return;
    setIsReporting(true);
    const reportData = {
      reporterId: authUser.uid,
      targetId: otherUid,
      reason: reportReason,
      description: reportDescription.trim(),
      timestamp: serverTimestamp(),
      status: 'Pending'
    };
    
    addDoc(collection(db, "reports"), reportData)
      .then(() => {
        toast({ title: "Report Synchronized", description: "Our safety team has received your packet." });
        setShowReportDialog(false);
        setReportDescription("");
      })
      .catch(async (e) => {
        const err = new FirestorePermissionError({ path: 'reports', operation: 'create', requestResourceData: reportData });
        errorEmitter.emit('permission-error', err);
      })
      .finally(() => setIsReporting(false));
  };

  const handleBlockUser = async () => {
    if (!db || !authUser || !otherUid || otherUid === 'system') return;
    setIsBlocking(true);
    const blockRef = doc(db, "users", authUser.uid, "blockedUsers", otherUid);
    const blockData = {
      uid: otherUid,
      name: otherUser?.name || "Aura User",
      blockedAt: serverTimestamp()
    };
    
    setDoc(blockRef, blockData)
      .then(() => {
        toast({ title: "User Blocked", description: "The synchronization has been restricted." });
        router.replace('/chat');
      })
      .catch(async (e) => {
        const err = new FirestorePermissionError({ path: blockRef.path, operation: 'create', requestResourceData: blockData });
        errorEmitter.emit('permission-error', err);
      })
      .finally(() => setIsBlocking(false));
  };

  const isOtherSpotlight = otherUser?.spotlightExpiry && (otherUser.spotlightExpiry.toDate ? otherUser.spotlightExpiry.toDate() : new Date(otherUser.spotlightExpiry)) > new Date();

  if (roomLoading) {
    return <div className="flex h-screen-safe items-center justify-center bg-[#070709]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const isSystemChat = room?.isSystem || idParam?.startsWith('system_');

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen-safe bg-[#070709] overflow-hidden">
        <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-30 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{isSystemChat ? "Aura Team" : (otherUser?.name || "Aura User")}</span>
                {(isSystemChat || otherUser?.verificationStatus === 'Verified') && <BadgeCheck size={16} className="text-primary" />}
                {isOtherSpotlight && (
                  <span className="inline-flex items-center justify-center" style={{ filter: 'hue-rotate(180deg) brightness(1.2)' }}>🌟</span>
                )}
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                {isSystemChat ? "Official System" : (otherUser?.isOnline && !otherUser.incognitoMode ? "Active" : "Offline")}
              </span>
            </div>
          </div>
          {!isSystemChat && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild><button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><MoreVertical size={18} /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#070709] border-white/10 rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="rounded-xl px-4 py-3 text-destructive flex items-center gap-3 cursor-pointer"><Flag size={16} /><span>Report</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="rounded-xl px-4 py-3 text-white/60 flex items-center gap-3 cursor-pointer"><UserX size={16} /><span>Block</span></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 flex flex-col z-10">
          {messages?.map((msg) => {
            const isMe = msg.senderId === authUser?.uid;
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex flex-col items-center py-6 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-[24px] premium-gradient flex items-center justify-center shadow-2xl neon-glow">
                    <span className="text-white font-bold text-3xl">A</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 max-w-[320px]">
                    <p className="text-sm text-white/80 font-light leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            }

            const views = msg.viewCount?.[authUser?.uid || ''] || 0;
            const isExpired = !isMe && msg.isMedia && (
              (msg.viewMode === 'one' && views >= 1) || 
              (msg.viewMode === 'two' && views >= 2)
            );

            return (
              <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-4 py-3 rounded-[24px] shadow-lg overflow-hidden", 
                    isMe ? "premium-gradient text-white rounded-br-none" : "bg-white/5 text-white rounded-bl-none border border-white/10"
                  )}>
                    {msg.isMedia ? (
                      <div 
                        onClick={() => !isExpired && handleMediaClick(msg)}
                        className={cn("relative rounded-2xl overflow-hidden cursor-pointer", isExpired && "opacity-40 grayscale")}
                      >
                         <img src={msg.mediaUrl} alt="" className={cn("max-w-full max-h-[300px] object-cover", isExpired && "blur-2xl")} />
                         {msg.viewMode !== 'unlimited' && (
                           <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                             <Eye size={10} className="text-white" />
                             <span className="text-[8px] font-bold text-white uppercase tracking-tighter">
                               {msg.viewMode === 'one' ? '1 View' : '2 Views'}
                             </span>
                           </div>
                         )}
                         {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 gap-2">
                               <Lock size={20} className="text-white/60" />
                               <span className="text-[10px] font-bold text-white/60 uppercase">Expired</span>
                            </div>
                         )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed font-light">{msg.text}</p>
                    )}
                  </div>
                  {isMe && planConfig.readReceipts && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                      {msg.seen ? <CheckCheck size={12} className="text-primary" /> : <Check size={12} className="text-white/20" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-4 flex-shrink-0" />
        </div>

        {isSystemChat ? (
          <div className="flex-shrink-0 px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                   <Info size={16} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Aura Guide Actions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     { label: "How Aura Works", icon: Star, path: "/about" },
                     { label: "Privacy & Safety", icon: ShieldCheck, path: "/privacy-safety" },
                     { label: "Plans & Limits", icon: Lock, path: "/profile" },
                     { label: "Community", icon: BookOpen, path: "/terms" }
                   ].map((action, i) => (
                     <Button 
                      key={`system-act-${i}`} 
                      onClick={() => router.push(action.path)}
                      variant="outline" 
                      className="h-12 rounded-xl bg-white/5 border-white/10 text-[10px] font-bold uppercase justify-start gap-3 hover:bg-white/10"
                     >
                       <action.icon size={16} className="text-primary" />
                       {action.label}
                     </Button>
                   ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
            <div className="flex items-center gap-3 w-full h-14">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><Plus size={22} /></button>
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} 
                placeholder="Message..." 
                className="flex-1 h-12 bg-white/5 border-none rounded-[28px] px-6 text-sm text-white focus:ring-1 focus:ring-primary/20" 
              />
              <button onClick={handleSendText} disabled={!input.trim()} className="w-12 h-12 rounded-full premium-gradient p-0 shrink-0 flex items-center justify-center disabled:opacity-20"><Send size={20} className="text-white" /></button>
            </div>
          </div>
        )}

        <Dialog open={showMediaOptions} onOpenChange={setShowMediaOptions}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-6 w-[calc(100%-40px)] max-w-[340px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Media Guard</DialogTitle>
              <DialogDescription className="text-xs text-white/40">Select viewing availability for this packet.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              {pendingPreview && <img src={pendingPreview} className="w-full aspect-square rounded-2xl object-cover border border-white/10" alt="Preview" />}
              
              <RadioGroup value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="grid grid-cols-1 gap-2">
                {[
                  { id: 'unlimited', label: 'Unlimited View', desc: 'Syncs to chat history permanently.', icon: Eye },
                  { id: 'one', label: 'One View', desc: 'Packet expires after opening once.', icon: Lock },
                  { id: 'two', label: 'Two Views', desc: 'Allows exactly two view syncs.', icon: EyeOff }
                ].map((opt) => (
                  <div key={opt.id} className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                    viewMode === opt.id ? "bg-primary/10 border-primary" : "bg-white/5 border-transparent"
                  )} onClick={() => setViewMode(opt.id as any)}>
                    <RadioGroupItem value={opt.id} id={opt.id} className="border-white/20" />
                    <div className="flex-1 space-y-0.5">
                       <Label htmlFor={opt.id} className="text-xs font-bold flex items-center gap-2">
                         <opt.icon size={12} className="text-primary" />
                         {opt.label}
                       </Label>
                       <p className="text-[9px] text-white/40">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setPendingFile(null); setShowMediaOptions(false); }} className="flex-1 h-12 rounded-xl text-white/40 font-bold uppercase text-[10px]">Cancel</Button>
                <Button onClick={handleSendMedia} className="flex-1 h-12 rounded-xl premium-gradient font-bold uppercase text-[10px]">Send Secure Packet</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-6 w-[calc(100%-40px)] max-w-[340px]">
            <DialogHeader className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                <AlertTriangle size={22} />
              </div>
              <div className="text-center">
                <DialogTitle className="text-lg font-bold">Community Protection</DialogTitle>
                <DialogDescription className="text-[10px] text-white/40">Provide context for our safety team.</DialogDescription>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1">Select Reason</label>
                <RadioGroup value={reportReason} onValueChange={(v: any) => setReportReason(v)} className="grid grid-cols-2 gap-2">
                  {REPORT_CATEGORIES.map((cat) => (
                    <div key={cat.id} className={cn(
                      "flex items-center space-x-2 p-2 rounded-lg border transition-all cursor-pointer",
                      reportReason === cat.id ? "bg-destructive/10 border-destructive/40" : "bg-white/5 border-transparent"
                    )} onClick={() => setReportReason(cat.id)}>
                      <RadioGroupItem value={cat.id} id={`report-${cat.id}`} className="border-white/20 w-3.5 h-3.5" />
                      <Label htmlFor={`report-${cat.id}`} className="text-[9px] font-medium leading-none cursor-pointer truncate">{cat.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Details</label>
                  <span className="text-[7px] text-destructive uppercase font-bold tracking-tighter">Required</span>
                </div>
                <Textarea 
                  placeholder="Tell us what happened..." 
                  value={reportDescription} 
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl min-h-[70px] text-[10px] resize-none focus:ring-destructive/20 p-3"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button 
                onClick={handleReportSubmit} 
                disabled={isReporting || !reportDescription.trim()}
                className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs"
              >
                {isReporting ? <Loader2 className="animate-spin" /> : "Submit Security Packet"}
              </Button>
              <Button variant="ghost" onClick={() => setShowReportDialog(false)} className="w-full h-8 text-[9px] font-bold uppercase tracking-widest text-white/40">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-8 w-[calc(100%-40px)] max-w-[340px]">
            <AlertDialogHeader className="space-y-4">
              <div className="w-16 h-16 rounded-[24px] bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                <UserX size={32} />
              </div>
              <div className="text-center space-y-2">
                <AlertDialogTitle className="text-xl font-bold">Restrict Connection?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-white/40 font-light leading-relaxed">
                  Blocking this profile will definitively remove their presence from your Aura. You will no longer be able to synchronize or interact.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-col gap-3 pt-4">
              <AlertDialogAction 
                onClick={handleBlockUser} 
                disabled={isBlocking}
                className="w-full h-14 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold"
              >
                {isBlocking ? <Loader2 className="animate-spin" /> : "Confirm Block"}
              </AlertDialogAction>
              <AlertDialogCancel className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-white/60 hover:bg-white/10">
                Maybe Later
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialog>
        </AlertDialog>

        {selectedMedia && (
           <Dialog open={!!selectedMedia} onOpenChange={(o) => !o && setSelectedMedia(null)}>
              <DialogContent className="bg-black p-0 border-none w-screen h-screen max-w-none flex items-center justify-center">
                 <button onClick={() => setSelectedMedia(null)} className="absolute top-8 right-8 z-[100] w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white">
                    <X size={24} />
                 </button>
                 <img src={selectedMedia.mediaUrl} className="max-w-full max-h-full object-contain" alt="Selected media" />
                 <div className="absolute bottom-12 left-0 right-0 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">Secure Aura Packet</p>
                 </div>
              </DialogContent>
           </Dialog>
        )}

        <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan} featureName={upgradeModal?.feature || ''} limit={upgradeModal?.limit} />
      </div>
    </AuthGuard>
  );
}
