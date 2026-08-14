
"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/aura/BottomNav";
import { Heart, Sparkles, Lock, Star, ChevronRight, Compass } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, where, limit, Query, orderBy } from "firebase/firestore";
import { LikeRecord, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuraCard } from "@/components/aura/AuraCard";
import { Button } from "@/components/ui/button";
import { isElite } from "@/lib/plan-limits";

export default function WhoLikesYouPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser, profile: currentUserProfile } = useAuthContext();
  
  const elite = isElite(currentUserProfile);

  const likesQuery = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return query(
      collection(db, "likes"),
      where("toUserId", "==", authUser.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    ) as Query<LikeRecord>;
  }, [db, authUser]);

  const { data: rawLikes, loading: likesLoading } = useCollection<LikeRecord>(likesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), limit(100)) as Query<UserProfile>;
  }, [db]);

  const { data: profiles } = useCollection<UserProfile>(usersQuery);

  const admirers = useMemo(() => {
    if (!rawLikes || !profiles) return [];
    return rawLikes.map(like => {
      const user = profiles.find(p => p.uid === like.fromUserId);
      return user ? { ...user, interactionType: like.type } : null;
    }).filter(Boolean) as (UserProfile & { interactionType: string })[];
  }, [rawLikes, profiles]);

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors aura-doodle min-h-screen">
        <header className="px-8 h-20 flex flex-col justify-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-[#2A2A2A] safe-top">
          <div className="flex justify-between items-center">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-[#C93CFF]/20">
                <Heart size={20} className="text-white fill-white" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Interested</h1>
            </motion.div>
          </div>
        </header>

        <div className="px-4 mt-6">
          {!elite ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-10 rounded-[40px] text-center space-y-8 border-primary/20 bg-primary/5"
            >
              <div className="w-20 h-20 rounded-[32px] premium-gradient mx-auto flex items-center justify-center neon-glow">
                <Lock size={32} className="text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Reveal Your Admirers</h2>
                <p className="text-sm text-white/60 font-light leading-relaxed">
                  {admirers.length} people have connected with your Aura. Upgrade to Elite to see who they are and like them back.
                </p>
              </div>
              <Button 
                onClick={() => router.push('/profile?tab=elite')}
                className="w-full h-16 rounded-[24px] premium-gradient text-white font-bold text-lg shadow-xl"
              >
                Join Aura Elite+
                <ChevronRight size={20} className="ml-2" />
              </Button>
            </motion.div>
          ) : admirers.length === 0 ? (
            <div className="py-20 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/5 mx-auto flex items-center justify-center text-white/20">
                <Compass size={40} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No synchronicity yet</h3>
                <p className="text-xs text-white/40 font-light max-w-[200px] mx-auto">Continue discovering to attract new connections into your Aura.</p>
              </div>
              <Button onClick={() => router.push('/dashboard')} variant="ghost" className="text-primary text-xs font-bold uppercase tracking-widest">
                Go to Discovery
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {admirers.map((user, idx) => (
                <div key={`admirer-${user.uid}-${idx}`} className="relative">
                  <AuraCard user={user} onClick={() => router.push(`/chat/${user.uid}`)} />
                  {user.interactionType === 'super_like' && (
                    <div className="absolute top-2 right-2 bg-primary/40 backdrop-blur-md px-2 py-1 rounded-full border border-primary/40 flex items-center gap-1">
                      <Star size={10} className="text-white fill-white" />
                      <span className="text-[8px] font-bold text-white uppercase">Super Liked You</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
