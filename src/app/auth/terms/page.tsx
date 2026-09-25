"use client";

import { useState, useEffect } from "react";
import { useRouter } from "navigation";
import { motion } from "framer-motion";
import { Shield, Check, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { CURRENT_TERMS_VERSION } from "@/lib/constants";
import Link from "next/link";

/**
 * @fileOverview Aura Mandatory Terms Synchronization Stage.
 * Ensures every member acknowledges the safety and privacy standards.
 */

export default function TermsAcceptancePage() {
  const router = useRouter();
  const { user, profile, loading, needsTermsAcceptance } = useAuthContext();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    } else if (!loading && !needsTermsAcceptance) {
      router.replace("/dashboard");
    }
  }, [user, loading, needsTermsAcceptance, router]);

  const handleAccept = async () => {
    if (!user || !db || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", user.uid);
      
      // Atomic Terms Persistance
      await setDoc(userRef, {
        uid: user.uid,
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
        termsVersion: CURRENT_TERMS_VERSION,
        updatedAt: serverTimestamp(),
        // Initialize base structure if NEW
        ...(profile ? {} : {
          onboardingCompleted: false,
          superLikeBalance: 0,
          plan: 'free',
          usage: {
            newChatsUsed: 0,
            likesUsed: 0,
            mediaUsed: 0,
            lastResetDate: new Date().toISOString().split('T')[0]
          }
        })
      }, { merge: true });

      toast({ title: "Identity Synchronized", description: "Your acknowledgement has been recorded." });
      
      // Post-persistence redirect
      router.replace(profile?.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Fault", description: "Unable to persist acceptance. Please check your connection." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#050816] min-h-screen relative overflow-hidden p-8 justify-center">
      <div className="absolute inset-0 z-0 hero-radial" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md mx-auto space-y-10"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-[32px] premium-gradient mx-auto flex items-center justify-center shadow-2xl neon-glow">
            <Shield size={40} className="text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tighter">Safety Synchronization</h2>
            <p className="text-white/60 font-light leading-relaxed">
              Welcome to Aura. To maintain an authentic and secure community, please acknowledge our safety standards.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[32px] border-white/10 bg-white/5 space-y-6 shadow-2xl">
          <div className="space-y-4">
            {[
              "Respect all community members.",
              "Maintain biometric authenticity.",
              "Protect your digital autonomy.",
              "Adhere to privacy guidelines."
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4 text-xs text-white/80">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/5">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="sync-terms" 
                checked={agreed} 
                onCheckedChange={(c) => setAgreed(c === true)}
                className="h-5 w-5 mt-0.5 border-white/20 data-[state=checked]:bg-[#2563FF]"
              />
              <label htmlFor="sync-terms" className="text-[11px] text-white/40 leading-relaxed pt-1">
                I agree to the <Link href="/terms" className="text-white hover:text-[#2563FF] font-bold">Terms of Service</Link> and acknowledge the <Link href="/privacy" className="text-white hover:text-[#2563FF] font-bold">Privacy Policy</Link>.
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleAccept}
            disabled={!agreed || isSubmitting}
            className="w-full h-16 rounded-[28px] premium-gradient text-white font-bold text-lg shadow-xl shadow-primary/20 neon-glow transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Confirm & Synchronize
                <ArrowRight size={20} />
              </>
            )}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-[9px] text-white/20 uppercase tracking-[0.3em] font-black">
            <Lock size={10} />
            <span>Secure Aura Protocol v{CURRENT_TERMS_VERSION}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}