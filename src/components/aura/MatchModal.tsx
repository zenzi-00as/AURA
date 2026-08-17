"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserProfile } from "@/lib/types";
import { Sparkles, MessageSquare, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentUser: UserProfile | null;
  matchType?: 'like' | 'super_like';
}

export function MatchModal({ isOpen, onClose, user, currentUser, matchType = 'like' }: MatchModalProps) {
  const router = useRouter();

  if (!user || !currentUser) return null;

  const isSuperMatch = matchType === 'super_like';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full max-w-sm glass-dark border-white/10 rounded-[40px] p-8 text-center space-y-8 shadow-2xl overflow-hidden",
              isSuperMatch && "border-primary/40 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            )}
          >
            {isSuperMatch && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1),transparent_70%)] pointer-events-none" />
            )}

            <div className="space-y-2 relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={cn(
                  "w-16 h-16 rounded-[24px] mx-auto flex items-center justify-center shadow-lg",
                  isSuperMatch ? "premium-gradient neon-glow" : "bg-rose-500/20 text-rose-500"
                )}
              >
                {isSuperMatch ? <Sparkles size={32} className="text-white fill-white" /> : <Heart size={32} className="text-rose-500" />}
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tighter text-white">
                {isSuperMatch ? "Super Synchronized! ✦" : "It's a Match ✦"}
              </h2>
              <p className="text-white/60 font-light">
                {isSuperMatch 
                  ? `Your Super Like connected with ${user.name}'s Aura.` 
                  : `You and ${user.name} have synchronized.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 relative z-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/40 overflow-hidden shadow-xl">
                  <img src={currentUser.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-lg"
              >
                {isSuperMatch ? <Sparkles size={20} /> : <Heart size={20} />}
              </motion.div>
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-secondary/40 overflow-hidden shadow-xl">
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 relative z-10">
              <Button 
                onClick={() => {
                  onClose();
                  router.push(`/chat/${user.uid}`);
                }}
                className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-bold shadow-xl flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Start Conversation
              </Button>
              <button 
                onClick={onClose}
                className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2"
              >
                Keep Discovering
              </button>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 z-20"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
