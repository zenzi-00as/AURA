
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
  Lock,
  UserX,
  Flag,
  ShieldAlert,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot
} from "firebase/firestore";
import { ChatRoom, UserProfile, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getPlanConfig } from "@/lib/subscription-engine";
import { handleSecureChat } from "@/actions/interactions";
import { handleMediaViewCleanup } from "@/actions/cleanup";
import { handleBlockUser, handleReportUser } from "@/actions/moderation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REPORT_CATEGORIES = [
  "Harassment or bullying",
  "Spam or scam",
  "Inappropriate content",
  "Sexual or exploitative content",
  "Threats or violence",
  "Hate or abusive behavior",
  "Other"
];

export default function ChatRoomPage() {
  const params = useParams();
  const idParam = String(params?.id || "");
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);

  // Moderation state
  const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockingMe, setIsBlockingMe] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const roomId = useMemo(() => {
    if (!authUser?.uid || !idParam) return "";
    if (idParam.startsWith('system_') || idParam.includes('_')) return idParam;
    return [authUser.uid, idParam].sort().join("_");
  }, [authUser?.uid, idParam]);

  const roomRef = useMemoFirebase(() => (db && roomId && roomId !== "") ? doc(db, "chatRooms", roomId) : null, [db, roomId]);
  const { data: room, loading: roomLoading } = useDoc<ChatRoom>(roomRef as any);

  const otherUid = useMemo(() => {
    if (idParam.startsWith('system_')) return 'system';
    if (!room || !Array.isArray(room.participants) || !authUser) return idParam;
    return room.participants.find(uid => uid !== authUser.uid) || 'system';
  }, [room, authUser?.uid, idParam]);

  const otherUserRef = useMemoFirebase(() => (db && otherUid && otherUid !== 'system') ? doc(db, "users", otherUid) : null, [db, otherUid]);
  const { data: otherUser } = useDoc<UserProfile>(otherUserRef as any);

  // Real-time block check
  useEffect(() => {
    if (!db || !authUser || !otherUid || otherUid === 'system') return;
    
    const unsubMe = onSnapshot(doc(db, "users", authUser.uid, "blockedUsers", otherUid), (snap) => {
      setIsBlockedByMe(snap.exists());
    });

    const unsubOther = onSnapshot(doc(db, "users", otherUid, "blockedUsers", authUser.uid), (snap) => {
      setIsBlockingMe(snap.exists());
    });

    return () => { unsubMe(); unsubOther(); };
  }, [db, authUser?.uid, otherUid]);

  const messagesQuery = useMemoFirebase(() => (db && roomId && roomId !== "") ? query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc")) : null, [db, roomId]);
  const { data: messages } = useCollection<Message>(messagesQuery as any);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "instant" }); 
  }, [messages?.length]);

  const handleSendText = async () => {
    const msgText = input.trim();
    if (!msgText || !roomId || !authUser || isSending || isBlockedByMe || isBlockingMe) return;
    
    setIsSending(true);
    const result = await handleSecureChat(authUser.uid, roomId, msgText);
    
    if (result.success) {
      setInput("");
    } else {
      toast({ variant: "destructive", title: "Action restricted", description: result.error });
    }
    setIsSending(false);
  };

  const onBlock = async () => {
    if (!authUser || !otherUser) return;
    const res = await handleBlockUser(authUser.uid, otherUser.uid, otherUser.name);
    if (res.success) {
      toast({ title: "User Blocked" });
    } else {
      toast({ variant: "destructive", title: "Safety sync fault", description: res.error });
    }
  };

  const onReport = async () => {
    if (!authUser || !otherUid || !reportCategory) return;
    setIsReporting(true);
    const res = await handleReportUser({
      reporterId: authUser.uid,
      targetId: otherUid,
      reason: reportCategory,
      description: reportDescription,
      conversationId: roomId
    });
    if (res.success) {
      toast({ title: "Report Submitted", description: "Our team will review this conversation." });
      setIsReportDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Report sync fault", description: res.error });
    }
    setIsReporting(false);
  };

  const handleMediaClick = async (msg: Message) => {
    if (!authUser || !roomId || !msg.id) return;
    const views = msg.viewCount?.[authUser.uid] || 0;
    
    if ((msg.viewMode === 'one' && views >= 1) || (msg.viewMode === 'two' && views >= 2)) {
      toast({ title: "View Expired" });
      return;
    }

    const result = await handleMediaViewCleanup(authUser.uid, roomId, msg.id);
    if (result.success) {
       setSelectedMedia(msg);
    } else {
       toast({ variant: "destructive", title: "Sync Fault", description: result.error });
    }
  };

  if (roomLoading) {
    return <div className="flex h-screen-safe items-center justify-center bg-[#070709]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const isSystemChat = room?.isSystem || idParam?.startsWith('system_');
  const isBlocked = isBlockedByMe || isBlockingMe;

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen-safe bg-[#070709] overflow-hidden">
        <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl z-30 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white p-2 -ml-2"><ArrowLeft size={22} /></button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white">{isSystemChat ? "Aura Team" : (otherUser?.name || "Aura User")}</span>
                {(isSystemChat || otherUser?.verificationStatus === 'Verified') && <BadgeCheck size={16} className="text-primary" />}
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                {isSystemChat ? "Official System" : (otherUser?.isOnline && !otherUser.incognitoMode && !isBlocked ? "Active" : "Offline")}
              </span>
            </div>
          </div>
          {!isSystemChat && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><MoreVertical size={18} /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#11141C] border-white/10 text-white rounded-2xl">
                {!isBlockedByMe && (
                  <DropdownMenuItem onClick={() => setIsBlockAlertOpen(true)} className="gap-2 text-rose-500 focus:text-rose-500">
                    <UserX size={16} /> Block User
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)} className="gap-2">
                  <Flag size={16} /> Report User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 flex flex-col z-10">
          {isBlocked && (
            <div className="mx-auto bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full flex items-center gap-2">
               <ShieldAlert size={14} className="text-rose-500" />
               <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                 {isBlockedByMe ? "You have blocked this user" : "Interaction restricted"}
               </span>
            </div>
          )}
          {messages?.map((msg) => {
            const isMe = msg.senderId === authUser?.uid;
            const views = msg.viewCount?.[authUser?.uid || ''] || 0;
            const isExpired = !isMe && msg.isMedia && ((msg.viewMode === 'one' && views >= 1) || (msg.viewMode === 'two' && views >= 2));

            return (
              <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className={cn("px-4 py-3 rounded-[24px] shadow-lg overflow-hidden", isMe ? "premium-gradient text-white rounded-br-none" : "bg-white/5 text-white rounded-bl-none border border-white/10")}>
                    {msg.isMedia ? (
                      <div onClick={() => !isExpired && handleMediaClick(msg)} className={cn("relative rounded-2xl overflow-hidden cursor-pointer", (isExpired || !msg.mediaUrl) && "opacity-40 grayscale")}>
                         {msg.mediaUrl ? (
                           <img src={msg.mediaUrl} alt="" className={cn("max-w-full max-h-[300px] object-cover", isExpired && "blur-2xl")} />
                         ) : (
                           <div className="w-[200px] h-[150px] bg-black/40 flex flex-col items-center justify-center gap-2">
                             <Lock size={24} className="text-white/20" />
                             <span className="text-[10px] text-white/20 font-bold uppercase">Expired Packet</span>
                           </div>
                         )}
                         {isExpired && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Lock size={20} className="text-white/60" /></div>}
                      </div>
                    ) : <p className="text-sm leading-relaxed font-light">{msg.text}</p>}
                  </div>
                  {isMe && planConfig.readReceipts && <div className="flex items-center gap-1 mt-1 px-1">{msg.seen ? <CheckCheck size={12} className="text-primary" /> : <Check size={12} className="text-white/20" />}</div>}
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} className="h-4 flex-shrink-0" />
        </div>

        {!isSystemChat && (
          <div className="flex-shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-3xl border-t border-white/5 z-20">
            <div className="flex items-center gap-3 w-full h-14">
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} 
                placeholder={isBlocked ? "Interaction restricted" : "Message..."} 
                disabled={isBlocked}
                className="flex-1 h-12 bg-white/5 border-none rounded-[28px] px-6 text-sm text-white disabled:opacity-20" 
              />
              <button 
                onClick={handleSendText} 
                disabled={!input.trim() || isSending || isBlocked} 
                className="w-12 h-12 rounded-full premium-gradient shrink-0 flex items-center justify-center disabled:opacity-20"
              >
                {isSending ? <Loader2 size={20} className="text-white animate-spin" /> : <Send size={20} className="text-white" />}
              </button>
            </div>
          </div>
        )}

        {/* Moderation Dialogs */}
        <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
          <AlertDialogContent className="bg-[#11141C] border-white/10 text-white rounded-[32px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Block this user?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                They will no longer be able to message you. Existing messages remain private but no new interactions can occur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onBlock} className="bg-rose-500 hover:bg-rose-600 text-white">Block</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="bg-[#11141C] border-white/10 text-white rounded-[32px] p-8">
            <DialogHeader>
              <DialogTitle>Report User</DialogTitle>
              <DialogDescription className="text-white/60">Help us keep Aura safe. Our team will review the reports.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-12">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent className="bg-[#11141C] border-white/10 text-white rounded-xl">
                  {REPORT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea 
                placeholder="Tell us more (optional)" 
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl min-h-[100px] resize-none"
              />
            </div>
            <DialogFooter>
              <Button onClick={onReport} disabled={!reportCategory || isReporting} className="w-full h-12 premium-gradient font-bold rounded-xl">
                {isReporting ? <Loader2 className="animate-spin" /> : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
