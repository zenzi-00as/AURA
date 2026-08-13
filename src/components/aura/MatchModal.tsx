
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserProfile } from "@/lib/types";
import { Sparkles, MessageSquare, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentUser: UserProfile | null;
}

export function MatchModal({ isOpen, onClose, user, currentUser }: MatchModalProps) {
  const router = useRouter();

  if (!user || !currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm glass-dark border-white/10 rounded-[40px] p-8 text-center space-y-8 shadow-2xl"
          >
            <div className="space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-16 h-16 rounded-[24px] premium-gradient mx-auto flex items-center justify-center neon-glow"
              >
                <Heart size={32} className="text-white fill-white" />
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tighter text-white">It's a Match ✦</h2>
              <p className="text-white/60 font-light">You and {user.name} have synchronized.</p>
            </div>

            <div className="flex items-center justify-center gap-4 relative">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/40 overflow-hidden shadow-xl">
                  <img src={currentUser.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-lg"
              >
                <Sparkles size={20} />
              </motion.div>
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-secondary/40 overflow-hidden shadow-xl">
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
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
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
