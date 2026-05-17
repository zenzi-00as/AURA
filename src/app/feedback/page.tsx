"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { id: "bug", label: "category_bug" },
  { id: "suggestion", label: "category_suggestion" },
  { id: "question", label: "category_question" },
  { id: "other", label: "category_other" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [category, setCategory] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast({
        title: t('feedback'),
        description: t('feedback_success'),
      });
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex flex-col bg-[#0C0B0D] items-center justify-center p-8 text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-[28px] bg-primary/10 flex items-center justify-center text-primary"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Thank you!</h2>
          <p className="text-muted-foreground font-light leading-relaxed">
            {t('feedback_success')}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/profile')}
          className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20"
        >
          Back to Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">{t('feedback')}</h1>
      </header>

      <div className="p-6 space-y-10">
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-[24px] fuchsia-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">{t('feedback')}</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
            {t('feedback_desc')}
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t('feedback_category')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`h-11 rounded-xl text-xs font-medium transition-all border ${category === cat.id ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"}`}
                >
                  {t(cat.label as any)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t('feedback_message')}
            </label>
            <Textarea
              placeholder="What's on your mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/5 border-white/10 rounded-2xl min-h-[160px] text-sm resize-none focus:ring-primary p-5"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !message.trim()}
            className="w-full h-16 rounded-3xl fuchsia-gradient text-white font-medium text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {t('feedback_submit')}
                <Send size={18} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}