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
  X,
  Shield,
  Clock
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
import { PrivacyObscure } from "@/components/aura/PrivacyObscure";
import { PrivacyWatermark } from "@/components/aura/PrivacyWatermark";

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

  const activeMessages = useMemo(() => {
    if (!messages) return [];
    const now = new Date();
    return messages.filter(m => {
      if (!m.expiresAt) {
        const ts = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
        return (now.getTime() - ts.getTime()) < 24 * 60 * 60 * 1000;
      }
      const expiry = m.expiresAt.toDate ? m.expiresAt.toDate() : new Date(m.expiresAt);
      return expiry > now;
    });
  }, [messages]);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "instant" }); 
  }, [activeMessages?.length]);

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
    return <div className="flex h-screen-safe items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const isSystemChat = room?.isSystem || idParam?.startsWith('system_');
  const isBlocked = isBlockedByMe || isBlockingMe;

  return (
    <AuthGuard>
      <PrivacyObscure active={!isSystemChat}>
        <div 
          className="flex flex-col h-screen-safe bg-background overflow-hidden transition-colors"
          onContextMenu={(e) => !isSystemChat && e.preventDefault()}
        >
          <header className="flex-shrink-0 px-6 h-20 flex items-center justify-between border-b border-border bg-background/40 backdrop-blur-2xl z-30 safe-top">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground p-2 -ml-2 transition-colors"><ArrowLeft size={22} /></button>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-foreground">{isSystemChat ? "Aura Team" : (otherUser?.name || "Aura User")}</span>
                  {(isSystemChat || otherUser?.verificationStatus === 'Verified') && <BadgeCheck size={16} className="text-primary" />}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  {isSystemChat ? "Official System" : (otherUser?.isOnline && !otherUser.incognitoMode && !isBlocked ? "Active" : "Offline")}
                </span>
              </div>
            </div>
            {!isSystemChat && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><MoreVertical size={18} /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border text-foreground rounded-2xl shadow-xl">
                  {!isBlockedByMe && (
                    <DropdownMenuItem onClick={() => setIsBlockAlertOpen(true)} className="gap-2 text-destructive focus:text-destructive">
                      <UserX size={16} /> Block User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)} className="gap-2 text-foreground">
                    <Flag size={16} /> Report User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 flex flex-col z-10 select-none">
            <div className="mx-auto bg-muted/40 border border-border px-4 py-1.5 rounded-full flex items-center gap-2 mb-2">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                24h disappearing chat
              </span>
            </div>

            {isBlocked && (
              <div className="mx-auto bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-full flex items-center gap-2">
                <ShieldAlert size={14} className="text-destructive" />
                <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">
                  {isBlockedByMe ? "You have blocked this user" : "Interaction restricted"}
                </span>
              </div>
            )}
            {activeMessages?.map((msg) => {
              const isMe = msg.senderId === authUser?.uid;
              const views = msg.viewCount?.[authUser?.uid || ''] || 0;
              const isExpired = !isMe && msg.isMedia && ((msg.viewMode === 'one' && views >= 1) || (msg.viewMode === 'two' && views >= 2));

              return (
                <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className={cn("px-4 py-3 rounded-[24px] shadow-lg overflow-hidden relative transition-all", isMe ? "premium-gradient text-white rounded-br-none" : "bg-muted text-foreground rounded-bl-none border border-border")}>
                      {msg.isMedia ? (
                        <div 
                          onClick={() => !isExpired && handleMediaClick(msg)} 
                          onDragStart={(e) => e.preventDefault()}
                          className={cn("relative rounded-2xl overflow-hidden cursor-pointer", (isExpired || !msg.mediaUrl) && "opacity-40 grayscale")}
                        >
                          {msg.isMedia && msg.viewMode !== 'unlimited' && <PrivacyWatermark />}
                          {msg.mediaUrl ? (
                            <img 
                              src={msg.mediaUrl} 
                              alt="" 
                              className={cn("max-w-full max-h-[300px] object-cover pointer-events-none", isExpired && "blur-2xl")} 
                              style={{ WebkitTouchCallout: 'none' }}
                            />
                          ) : (
                            <div className="w-[200px] h-[150px] bg-background/40 flex flex-col items-center justify-center gap-2">
                              <Lock size={24} className="text-muted-foreground/20" />
                              <span className="text-[10px] text-muted-foreground/20 font-bold uppercase">Expired Packet</span>
                            </div>
                          )}
                          {isExpired && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Lock size={20} className="text-white/60" /></div>}
                        </div>
                      ) : <p className="text-sm leading-relaxed font-light">{msg.text}</p>}
                    </div>
                    {isMe && planConfig.readReceipts && <div className="flex items-center gap-1 mt-1 px-1">{msg.seen ? <CheckCheck size={12} className="text-primary" /> : <Check size={12} className="text-muted-foreground/40" />}</div>}
                  </div>
                </motion.div>
              );
            })}
            <div ref={scrollRef} className="h-4 flex-shrink-0" />
          </div>

          {!isSystemChat && (
            <div className="flex-shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-background/60 backdrop-blur-3xl border-t border-border z-20">
              <div className="flex items-center gap-3 w-full h-14">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} 
                  placeholder={isBlocked ? "Interaction restricted" : "Message..."} 
                  disabled={isBlocked}
                  className="flex-1 h-12 bg-muted border-none rounded-[28px] px-6 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-20 shadow-none focus:ring-0 focus-visible:ring-0" 
                />
                <button 
                  onClick={handleSendText} 
                  disabled={!input.trim() || isSending || isBlocked} 
                  className="w-12 h-12 rounded-full premium-gradient shrink-0 flex items-center justify-center disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                >
                  {isSending ? <Loader2 size={20} className="text-white animate-spin" /> : <Send size={20} className="text-white" />}
                </button>
              </div>
            </div>
          )}

          <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
            <AlertDialogContent className="bg-popover border-border text-foreground rounded-[32px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Block this user?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  They will no longer be able to message you. Existing messages remain private but no new interactions can occur.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-muted-foreground hover:text-foreground">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onBlock} className="bg-destructive hover:bg-destructive/90 text-white border-none">Block</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogContent className="bg-popover border-border text-foreground rounded-[32px] p-8">
              <DialogHeader>
                <DialogTitle className="text-foreground">Report User</DialogTitle>
                <DialogDescription className="text-muted-foreground">Help us keep Aura safe. Our team will review this conversation.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={reportCategory} onValueChange={setReportCategory}>
                  <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-12 focus:ring-primary focus:ring-1">
                    <SelectValue placeholder="Select Reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground rounded-xl">
                    {REPORT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea 
                  placeholder="Tell us more (optional)" 
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="bg-muted border-border rounded-xl min-h-[100px] resize-none text-foreground focus:ring-primary focus:ring-1"
                />
              </div>
              <DialogFooter>
                <Button onClick={onReport} disabled={!reportCategory || isReporting} className="w-full h-12 premium-gradient font-bold rounded-xl text-white">
                  {isReporting ? <Loader2 className="animate-spin" /> : "Submit Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PrivacyObscure>
    </AuthGuard>
  );
}