"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, LogOut, Loader2, CheckCircle2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/firebase/auth-context";
import { useAuth } from "@/firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, isEmailVerified } = useAuthContext();
  const auth = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    } else if (!loading && isEmailVerified) {
      router.replace("/dashboard");
    }
  }, [user, loading, isEmailVerified, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRefresh = async () => {
    if (!auth?.currentUser) return;
    setIsRefreshing(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        toast({ title: "Email Verified", description: "Your identity node is now synchronized." });
        // The Guard will handle the redirect on next render
      } else {
        toast({ title: "Not Verified", description: "Verification link not yet acknowledged. Please check your inbox." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Refresh Failed", description: "Could not synchronize verification status." });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResend = async () => {
    if (!auth?.currentUser || cooldown > 0) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({ title: "Email Sent", description: "Check your inbox for a new verification link." });
      setCooldown(60);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Send Failed", description: "Too many attempts. Try again later." });
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = () => {
    if (auth) auth.signOut().then(() => router.replace("/auth"));
  };

  if (loading || !user) return null;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen relative overflow-hidden p-8 justify-center">
      <div className="absolute inset-0 z-0 hero-radial" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md mx-auto space-y-10"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-[32px] premium-gradient mx-auto flex items-center justify-center shadow-2xl neon-glow">
            <Mail size={40} className="text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground tracking-tighter">Verify Identity</h2>
            <p className="text-muted-foreground font-light leading-relaxed">
              A verification link has been dispatched to <span className="text-foreground font-medium">{user.email}</span>. Please acknowledge it to continue.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[32px] border-border bg-card space-y-6 shadow-2xl">
          <div className="space-y-4">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full h-16 rounded-2xl blue-gradient text-white font-bold text-lg shadow-xl neon-glow transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isRefreshing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
              I've Verified My Email
            </Button>
            
            <Button 
              variant="ghost"
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className="w-full h-12 text-muted-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest"
            >
              {isSending ? <Loader2 className="animate-spin h-4 w-4" /> : (cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Email")}
            </Button>
          </div>

          <div className="pt-6 border-t border-border">
            <button 
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full text-muted-foreground/20 hover:text-rose-500 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <LogOut size={14} />
              Sign Out & Restart
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/20 uppercase tracking-[0.3em] font-black">Secure Aura Identity</p>
        </div>
      </motion.div>
    </div>
  );
}