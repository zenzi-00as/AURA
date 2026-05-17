
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Send, CheckCheck, BadgeCheck, Trash2, Flag, ShieldAlert } from "lucide-react";
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

type Message = {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
};

const REPORT_REASONS = [
  "Harassment or Hate Speech",
  "Fake Profile or Bot",
  "Inappropriate Content",
  "Spam or Scamming",
  "Underage User",
  "Other"
];

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "them", text: "Hey! Your profile bio is really cool. Design for living?", time: "2:41 PM" },
    { id: "2", sender: "me", text: "Thanks! Yeah, I'm an architect. Just moved nearby.", time: "2:43 PM" },
    { id: "3", sender: "them", text: "That's awesome. I'm into UI/UX myself. Maybe we can grab a coffee sometime?", time: "2:44 PM" },
  ]);
  const [input, setInput] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate real-time status changes occasionally
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.95) {
        setIsOnline(prev => !prev);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "me",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setInput("");
  };

  const handleDeleteConversation = () => {
    toast({
      title: "Conversation Deleted",
      description: "The chat history has been removed.",
    });
    router.push("/chat");
  };

  const handleSubmitReport = () => {
    if (!reportReason) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please select a reason for reporting.",
      });
      return;
    }
    
    setIsReporting(true);
    // Simulate API call
    setTimeout(() => {
      setIsReporting(false);
      setIsReportDialogOpen(false);
      setReportReason("");
      setReportDescription("");
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep Aura safe. Our team will review this shortly.",
      });
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] h-screen overflow-hidden">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Aarav</span>
              <BadgeCheck size={16} className="text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-[0.1em] ${isOnline ? "text-emerald-500" : "text-rose-500"}`}>
                {isOnline ? "Active Now" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors focus:outline-none">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1A181C] border-white/10 text-white rounded-2xl p-2 w-52 shadow-2xl backdrop-blur-xl">
              <DropdownMenuItem 
                onClick={() => setIsReportDialogOpen(true)}
                className="rounded-xl px-4 py-3 focus:bg-white/5 cursor-pointer flex items-center gap-3"
              >
                <Flag size={16} className="text-muted-foreground" />
                <span className="text-sm">Report User</span>
              </DropdownMenuItem>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-4">
        <div className="text-center py-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Encrypted Connection</span>
        </div>
        
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] px-5 py-3.5 rounded-[22px] ${msg.sender === "me" ? "fuchsia-gradient text-white rounded-br-none" : "bg-white/5 text-muted-foreground rounded-bl-none border border-white/5"}`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50">
                <span className="text-[9px] font-medium">{msg.time}</span>
                {msg.sender === "me" && <CheckCheck size={10} />}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0C0B0D]/80 backdrop-blur-xl border-t border-white/5 pb-8">
        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Send a private message..."
              className="h-12 bg-white/5 border-white/10 rounded-full px-6 text-sm placeholder:text-muted-foreground focus:ring-primary pr-12"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Secure
            </div>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-full fuchsia-gradient p-0 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Send size={18} className="text-white ml-0.5" />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="bg-[#1A181C] border-white/10 text-white rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-7">
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
                    className={`h-10 px-4 rounded-xl text-xs font-medium text-left transition-all border ${reportReason === reason ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"}`}
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
                className="bg-white/5 border-white/10 rounded-xl min-h-[80px] text-xs resize-none focus:ring-primary p-3"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-1">
            <Button 
              onClick={handleSubmitReport}
              disabled={isReporting || !reportReason}
              className="w-full h-12 rounded-2xl fuchsia-gradient text-white font-medium text-base shadow-lg shadow-primary/20"
            >
              {isReporting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Submit Report"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsReportDialogOpen(false)}
              className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
