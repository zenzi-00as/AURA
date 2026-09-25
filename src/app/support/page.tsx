"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  MessageSquare, 
  Mail, 
  HelpCircle, 
  Shield, 
  Send, 
  Loader2, 
  Headphones,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  Sparkles
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supportChat } from "@/ai/flows/support-chat-flow";

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function SupportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // High-fidelity entry node: Default to FAQ
  const [activeTab, setActiveTab] = useState<'agent' | 'faq'>('faq');
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Welcome to Aura Support. I am your AI Assistant. How can I synchronize with your needs today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const result = await supportChat({ message: text });
      setMessages([...newMessages, { role: 'bot', content: result.response }]);
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Fault", description: "AI Assistant is temporarily offline." });
    } finally {
      setIsTyping(false);
    }
  };

  const faqs = [
    { q: "How do I verify my identity?", a: "Go to Profile > Identity Guard. Upload a clear selfie. Our AI Guard will assess liveness and profile alignment within 24 hours." },
    { q: "What is Elite Plus?", a: "Elite Plus is our top luxury tier. It grants unlimited chats, incognito mode, visible profile photos, and priority discovery reach." },
    { q: "How is my privacy protected?", a: "Aura uses a stateless architecture. Private media is definitively deleted from our servers after the view limit is reached." },
    { q: "Can I cancel my subscription?", a: "Yes, you can manage and cancel subscriptions through the Membership Hub in your Profile." },
    { q: "How do I report a member?", a: "Open the chat room with the member, tap the 'More' (three dots) menu in the header, and select 'Report User'." }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors min-h-screen-safe overflow-hidden">
      <header className="px-6 h-20 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-30 safe-top">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Support Hub</h1>
        </div>
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('faq')}
             className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'faq' ? "bg-primary text-white shadow-lg" : "text-white/40")}
           >
             FAQ
           </button>
           <button 
             onClick={() => setActiveTab('agent')}
             className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'agent' ? "bg-primary text-white shadow-lg" : "text-white/40")}
           >
             AI Agent
           </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeTab === 'agent' ? (
            <motion.div 
              key="support-agent"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col h-[calc(100vh-140px)]"
            >
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-hide">
                 {messages.map((msg, i) => (
                   <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] p-4 rounded-3xl text-sm font-light leading-relaxed shadow-lg",
                        msg.role === 'user' ? "premium-gradient text-white rounded-br-none" : "bg-white/5 border border-white/10 text-white/80 rounded-bl-none"
                      )}>
                        {msg.content}
                      </div>
                   </div>
                 ))}
                 {isTyping && (
                   <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-bl-none flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      </div>
                   </div>
                 )}
                 <div ref={scrollRef} />
              </div>

              <div className="p-4 bg-background border-t border-white/5 safe-bottom">
                 <div className="relative flex items-center gap-3">
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask Aura Support..."
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-6 pr-14 text-sm"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="absolute right-2 w-10 h-10 rounded-xl premium-gradient flex items-center justify-center text-white disabled:opacity-40"
                    >
                      {isTyping ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </button>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="support-faq"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide"
            >
              <section className="space-y-4">
                 <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Q&A Repository</h2>
                 <div className="space-y-3">
                    <Accordion type="single" collapsible className="w-full space-y-3">
                      {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`faq-${i}`} className="border-none">
                          <div className="glass-card rounded-[24px] overflow-hidden border border-white/5">
                            <AccordionTrigger className="px-6 py-5 text-sm font-medium hover:no-underline text-left">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-0 text-xs text-white/40 leading-relaxed italic">
                              {faq.a}
                            </AccordionContent>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                 </div>
              </section>

              <section className="space-y-4">
                 <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Escalation Nodes</h2>
                 <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => window.location.href = "mailto:support@aura.community"}
                      className="p-6 rounded-[28px] bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Mail size={22} /></div>
                          <div className="text-left space-y-0.5">
                             <h4 className="font-bold text-sm">Email Support</h4>
                             <p className="text-[10px] text-white/40">Expected response: 24-48 hours</p>
                          </div>
                       </div>
                       <ExternalLink size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                    </button>

                    <button 
                      onClick={() => router.push('/privacy-safety')}
                      className="p-6 rounded-[28px] bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88]"><Shield size={22} /></div>
                          <div className="text-left space-y-0.5">
                             <h4 className="font-bold text-sm">Safety Center</h4>
                             <p className="text-[10px] text-white/40">Community guidelines & safety tips</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-white/20 group-hover:text-[#00FF88] transition-colors" />
                    </button>
                 </div>
              </section>

              <div className="p-8 rounded-[32px] glass-card border-white/5 space-y-4 bg-gradient-to-br from-primary/10 to-transparent">
                 <div className="flex items-center gap-3 text-primary">
                    <Sparkles size={24} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Aura Priority</h3>
                 </div>
                 <p className="text-[11px] text-white/60 leading-relaxed font-light">
                   Elite members receive prioritized synchronization with our manual review team for verification and report analysis.
                 </p>
                 <Button 
                   onClick={() => router.push('/profile?tab=elite')}
                   className="w-full h-10 rounded-xl premium-gradient text-[10px] font-bold uppercase tracking-widest shadow-lg"
                 >
                   Upgrade Membership
                 </Button>
              </div>

              <div className="text-center py-4">
                 <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold">Aura Support node v2.1.0</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
