
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
  Shield, 
  Eye, 
  EyeOff, 
  X,
  Flag,
  UserX,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { getPlanConfig, checkActionAllowed } from "@/lib/subscription-engine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/aura/UpgradeModal";

const REPORT_CATEGORIES: ReportType[] = ['Harassment', 'Spam', 'Fake profile', 'Scams', 'Other'];

export default function ChatRoomPage() {
  const params = useParams();
  const idParam = params?.id as string;
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
  const [isReporting, setIsReporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomId = useMemo(() => {
    if (!authUser || !idParam) return "";
    if (idParam.startsWith('system_') || idParam.includes('_')) return idParam;
    return [authUser.uid, idParam].sort().join("_");
  }, [authUser, idParam]);

  const roomRef = useMemoFirebase(() => (db && roomId) ? doc(db, "chatRooms", roomId) : null, [db, roomId]);
  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  const otherUid = useMemo(() => {
    if (!room || !authUser) return idParam;
    return room.participants.find(uid => uid !== authUser.uid) || 'system';
  }, [room, authUser, idParam]);

  const otherUserRef = useMemoFirebase(() => (db && otherUid && otherUid !== 'system') ? doc(db, "users", otherUid) : null, [db, otherUid]);
  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  const messagesQuery = useMemoFirebase(() => (db && roomId) ? query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc")) : null, [db, roomId]);
  const { data: messages } = useCollection<Message>(messagesQuery as any);

  useEffect(() => {
    if (db && authUser && roomId && otherUid && !roomLoading) {
      if (!room) {
        const check = checkActionAllowed(profile, 'newChat');
        if (!check.allowed) {
          toast({ variant: "destructive", title: "Daily Limit Reached", description: `Free/Elite members can start ${check.limit} new chats/day.` });
          router.push('/chat');
          return;
        }
        setDoc(doc(db, "chatRooms", roomId), {
          id: roomId,
          participants: [authUser.uid, otherUid],
          lastMessage: "",
          lastTimestamp: serverTimestamp(),
          unreadCount: { [authUser.uid]: 0, [otherUid]: 0 },
          typing: { [authUser.uid]: false, [otherUid]: false }
        });
        updateDoc(doc(db, "users", authUser.uid), { 'usage.newChatsUsed': increment(1) });
      } else {
        updateDoc(doc(db, "chatRooms", roomId), { [`unreadCount.${authUser.uid}`]: 0 }).catch(() => {});
      }
    }
  }, [db, authUser, roomId, otherUid, room, roomLoading, profile, router, toast]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: authUser.uid, text: "[Media]", timestamp: serverTimestamp(), seen: false, isMedia: true, mediaUrl, storagePath, viewMode, viewCount: { [authUser.uid]: 0, [otherUid]: 0 }
      });
      await updateDoc(doc(db, "chatRooms", roomId), { lastMessage: "Shared media", lastTimestamp: serverTimestamp(), [`unreadCount.${otherUid}`]: increment(1) });
      await updateDoc(doc(db, "users", authUser.uid), { 'usage.mediaUsed': increment(1) });
      setPendingFile(null); setPendingPreview(null);
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
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), { 
        senderId: authUser.uid, text: msgText, timestamp: serverTimestamp(), seen: false 
      });
      await updateDoc(doc(db, "chatRooms", roomId), { 
        lastMessage: msgText, lastTimestamp: serverTimestamp(), [`unreadCount.${otherUid}`]: increment(1) 
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Sync failed" });
    }
  };

  const isOtherSpotlight = otherUser?.spotlightExpiry && (otherUser.spotlightExpiry.toDate ? otherUser.spotlightExpiry.toDate() : new Date(otherUser.spotlightExpiry)) > new Date();

  if (roomLoading) {
    return <div className="flex h-screen-safe items-center justify-center bg-[#070709]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen-safe bg-[#070709] overflow-hidden">
        <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-30 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{room?.isSystem ? "AURA Team" : (otherUser?.name || "Aura User")}</span>
                {(room?.isSystem || otherUser?.verificationStatus === 'Verified') && <BadgeCheck size={16} className="text-primary" />}
                {isOtherSpotlight && <Star size={16} className="text-primary" />}
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">{otherUser?.isOnline ? "Active" : "Offline"}</span>
            </div>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><MoreVertical size={18} /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#070709] border-white/10 rounded-2xl p-2 w-56 shadow-2xl backdrop-blur-xl">
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="rounded-xl px-4 py-3 text-destructive flex items-center gap-3"><Flag size={16} /><span>Report</span></DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 flex flex-col z-10">
          {messages?.map((msg, idx) => {
            const isMe = msg.senderId === authUser?.uid;
            return (
              <motion.div key={msg.id || `msg-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className={cn("px-4 py-3 rounded-[24px] shadow-lg overflow-hidden", isMe ? "premium-gradient text-white rounded-br-none" : "bg-white/5 text-white rounded-bl-none border border-white/10")}>
                    {msg.isMedia ? (
                      <img src={msg.mediaUrl} alt="" className="rounded-2xl max-w-full max-h-[300px] object-cover" onClick={() => setSelectedMedia(msg)} />
                    ) : (
                      <p className="text-sm leading-relaxed font-light">{msg.text}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-4 flex-shrink-0" />
        </div>

        <div className="flex-shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
          <div className="flex items-center gap-3 w-full h-14">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><Plus size={22} /></button>
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} placeholder="Message..." className="flex-1 h-12 bg-white/5 border-none rounded-[28px] px-6 text-sm text-white" />
            <button onClick={handleSendText} disabled={!input.trim()} className="w-12 h-12 rounded-full premium-gradient p-0 shrink-0 flex items-center justify-center disabled:opacity-20"><Send size={20} className="text-white" /></button>
          </div>
        </div>

        <Dialog open={showMediaOptions} onOpenChange={setShowMediaOptions}>
          <DialogContent className="bg-[#070709] border-white/10 rounded-[32px] p-5 w-[calc(100%-40px)] max-w-[280px]">
            <DialogHeader><DialogTitle className="text-sm font-bold">Media Options</DialogTitle></DialogHeader>
            <div className="py-2 space-y-3">
              {pendingPreview && <img src={pendingPreview} className="w-full aspect-[4/3] rounded-2xl object-cover" />}
              <Button onClick={handleSendMedia} className="w-full premium-gradient font-bold">Send Photo</Button>
            </div>
          </DialogContent>
        </Dialog>

        <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan} featureName={upgradeModal?.feature || ''} limit={upgradeModal?.limit} />
      </div>
    </AuthGuard>
  );
}
