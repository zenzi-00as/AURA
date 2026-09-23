
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
  updateDoc, 
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ChatRoom, UserProfile, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getPlanConfig } from "@/lib/subscription-engine";
import { handleSecureChat } from "@/actions/interactions";
import { handleMediaViewCleanup } from "@/actions/cleanup";

export default function ChatRoomPage() {
  const params = useParams();
  const idParam = String(params?.id || "");
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user: authUser, profile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);

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

  const messagesQuery = useMemoFirebase(() => (db && roomId && roomId !== "") ? query(collection(db, "chatRooms", roomId, "messages"), orderBy("timestamp", "asc")) : null, [db, roomId]);
  const { data: messages } = useCollection<Message>(messagesQuery as any);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "instant" }); 
  }, [messages?.length]);

  const handleSendText = async () => {
    const msgText = input.trim();
    if (!msgText || !roomId || !authUser || isSending) return;
    
    setIsSending(true);
    const result = await handleSecureChat(authUser.uid, roomId, msgText);
    
    if (result.success) {
      setInput("");
    } else {
      toast({ variant: "destructive", title: "Limit Reached", description: result.error });
    }
    setIsSending(false);
  };

  const handleMediaClick = async (msg: Message) => {
    if (!authUser || !roomId || !msg.id) return;
    const views = msg.viewCount?.[authUser.uid] || 0;
    
    if ((msg.viewMode === 'one' && views >= 1) || (msg.viewMode === 'two' && views >= 2)) {
      toast({ title: "View Expired", description: "This media packet has already reached its lifecycle limit." });
      return;
    }

    // Securely increment view and check for cleanup on server
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
                {isSystemChat ? "Official System" : (otherUser?.isOnline && !otherUser.incognitoMode ? "Active" : "Offline")}
              </span>
            </div>
          </div>
          {!isSystemChat && (
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><MoreVertical size={18} /></button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6 space-y-4 flex flex-col z-10">
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
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e: any) => e.key === 'Enter' && handleSendText()} placeholder="Message..." className="flex-1 h-12 bg-white/5 border-none rounded-[28px] px-6 text-sm text-white" />
              <button onClick={handleSendText} disabled={!input.trim() || isSending} className="w-12 h-12 rounded-full premium-gradient shrink-0 flex items-center justify-center disabled:opacity-20">
                {isSending ? <Loader2 size={20} className="text-white animate-spin" /> : <Send size={20} className="text-white" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
