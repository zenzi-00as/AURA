"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Send, CheckCircle2, Star, Sparkles } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim() || rating === 0) return;
    
    setIsLoading(true);
    // Simulate API call synchronization
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex flex-col bg-background items-center justify-center p-8 text-center space-y-10 min-h-screen-safe relative overflow-hidden">
        <div className="absolute inset-0 z-0 hero-radial opacity-40" />
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative z-10 w-24 h-24 rounded-[32px] premium-gradient flex items-center justify-center text-white shadow-2xl neon-glow"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-bold text-white tracking-tighter">Materialized!</h2>
          <p className="text-white/60 font-light leading-relaxed max-w-[280px] mx-auto italic">
            {t('feedback_success')}
          </p>
        </div>

        <div className="relative z-10 w-full max-w-xs pt-8">
          <Button 
            onClick={() => router.push('/profile')}
            className="w-full h-16 rounded-3xl premium-gradient text-white font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            Back to Profile
          </Button>
        </div>

        <div className="absolute bottom-12 left-0 right-0 text-center opacity-20">
          <p className="text-[10px] text-white uppercase tracking-[0.5em] font-black">Aura Feedback Node Synchronized</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors min-h-screen-safe">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 safe-top">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{t('feedback')}</h1>
      </header>

      <div className="p-6 space-y-10">
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-[24px] premium-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">{t('feedback')}</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
            {t('feedback_desc')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Rating Section */}
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {t('feedback_rating')}
              </label>
              <span className="text-primary font-bold text-[10px]">*</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    size={32}
                    className={cn(
                      "transition-all",
                      (hoveredRating || rating) >= star
                        ? "fill-primary text-primary drop-shadow-[0_0_8px_rgba(0,87,255,0.5)]"
                        : "text-muted border-primary/20 hover:text-primary/30"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating === 0 && (
              <p className="text-[9px] text-primary/60 font-medium uppercase tracking-tighter">Required to submit</p>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t('feedback_category')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`h-11 rounded-xl text-xs font-medium transition-all border ${category === cat.id ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"}`}
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
              className="bg-muted border-border rounded-2xl min-h-[160px] text-sm resize-none focus:ring-primary p-5"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !message.trim() || rating === 0}
            className="w-full h-16 rounded-3xl premium-gradient text-white font-medium text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
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
