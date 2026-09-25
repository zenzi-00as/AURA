"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Sparkles, Mail, Lock, Eye, EyeOff, Chrome } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useFirestore } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { CURRENT_TERMS_VERSION } from "@/lib/constants";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();

  useEffect(() => {
    // If user is already authenticated and verified, redirect to dashboard
    if (!authLoading && user && user.emailVerified && !isRedirecting) {
      setIsRedirecting(true);
      router.replace("/dashboard");
    }
  }, [user, authLoading, router, isRedirecting]);

  const handleAuth = async () => {
    if (!auth || !db) return;
    if (isLoading || isRedirecting) return;
    
    if (!email.includes("@")) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }

    if (password.length < 8) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 8 characters." });
      return;
    }

    if (mode === "signup" && !agreedToTerms) {
      toast({ 
        title: "Aura Terms Required", 
        description: "Please acknowledge the Terms and Privacy Guard to synchronize your identity.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const correlationId = logger.generateCorrelationId();

    try {
      if (mode === "signup") {
        logger.info('Initiating Email Sign Up', { correlationId });
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const authedUser = result.user;

        if (authedUser) {
          // Send verification link immediately
          await sendEmailVerification(authedUser);
          
          logger.info('Email Sign Up Success', { correlationId, uid: authedUser.uid });
          const userRef = doc(db, "users", authedUser.uid);
          
          // Initial Profile Node Creation
          await setDoc(userRef, {
            uid: authedUser.uid,
            email: email,
            onboardingCompleted: false,
            termsAccepted: agreedToTerms,
            termsAcceptedAt: serverTimestamp(),
            termsVersion: CURRENT_TERMS_VERSION,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            usage: {
              newChatsUsed: 0,
              likesUsed: 0,
              mediaUsed: 0,
              lastResetDate: new Date().toISOString().split('T')[0]
            },
            superLikeBalance: 0,
            plan: 'free',
            incognitoMode: false,
            isSuspended: false,
            isAdmin: false,
            isOnline: true,
            lastActive: serverTimestamp()
          });

          toast({ title: "Account Created", description: "Verification link sent. Please check your inbox." });
          router.push("/auth/verify-email");
        }
      } else {
        logger.info('Initiating Email Sign In', { correlationId });
        await signInWithEmailAndPassword(auth, email, password);
        logger.info('Email Sign In Success', { correlationId });
        // AuthGuard will handle verification check and redirect
      }
    } catch (error: any) {
      logger.error('Authentication Sync Fault', { 
        category: 'AUTH_ERROR', 
        correlationId, 
        errorCode: error.code,
        errorMessage: error.message 
      });
      
      let message = "Authentication failed. Please check your credentials.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already in use.";
      if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";
      if (error.code === 'auth/too-many-requests') message = "Too many attempts. Try again later.";
      
      toast({ variant: "destructive", title: "Authentication Error", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !db) return;
    setIsGoogleLoading(true);
    const correlationId = logger.generateCorrelationId();

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const authedUser = result.user;

      if (authedUser) {
        logger.info('Google Sign In Success', { correlationId, uid: authedUser.uid });
        const userRef = doc(db, "users", authedUser.uid);
        
        // Use setDoc with merge to preserve existing profile if returning user
        await setDoc(userRef, {
          uid: authedUser.uid,
          email: authedUser.email,
          updatedAt: serverTimestamp(),
          // Default fields if new user
          lastActive: serverTimestamp(),
          isOnline: true,
        }, { merge: true });

        // Google users are verified by default
        router.replace("/dashboard");
      }
    } catch (error: any) {
      logger.error('Google Auth Fault', { 
        category: 'AUTH_ERROR', 
        correlationId, 
        errorMessage: error.message 
      });

      if (error.code === 'auth/unauthorized-domain') {
        toast({ 
          variant: "destructive", 
          title: "Domain Restricted", 
          description: "Google Sign-In is not available from this development domain. Please add this hostname to Firebase Console → Authorized domains." 
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: "destructive", title: "Google Sign-In Error", description: "Could not synchronize with Google." });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) {
      toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address first." });
      return;
    }
    if (!auth) return;

    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Link Sent", description: "Please check your email to reset your password." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not send reset link. Please try again." });
    }
  };

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 pb-12 relative min-h-screen bg-[#050816] overflow-y-auto">
      <div className="absolute inset-0 z-0 hero-radial" />
      
      <header className="mb-10 relative z-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl blue-gradient border border-white/10 flex items-center justify-center shadow-2xl neon-glow mb-8">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        <div className="flex flex-col gap-3">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white tracking-tighter leading-tight"
          >
            {mode === "signin" ? "Welcome back" : "Join Aura"}
          </motion.h1>
          <p className="text-white/60 font-light text-lg">
            {mode === "signin" ? "Sign in to your presence." : "Create your digital identity."}
          </p>
        </div>
      </header>
      
      <div className="flex-1 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#2563FF] uppercase tracking-[0.2em] px-1">Email Identity</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <Input 
                  type="email" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-white/[0.045] border-white/10 rounded-2xl pl-12 pr-6 text-white focus:border-[#2563FF] focus:ring-0 shadow-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-[#2563FF] uppercase tracking-[0.2em]">Password</label>
                {mode === "signin" && (
                  <button onClick={handleForgotPassword} className="text-[9px] font-bold text-white/40 uppercase hover:text-white transition-colors">Forgot Password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-white/[0.045] border-white/10 rounded-2xl pl-12 pr-12 text-white focus:border-[#2563FF] focus:ring-0 shadow-none"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="flex items-start space-x-3 px-1 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms} 
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="h-5 w-5 mt-1 border-white/20 data-[state=checked]:bg-[#2563FF]"
                />
                <label htmlFor="terms" className="text-xs text-white/40 leading-relaxed">
                  I acknowledge the <Link href="/terms" className="text-white hover:text-[#2563FF]">Terms</Link> and <Link href="/privacy" className="text-white hover:text-[#2563FF]">Privacy Guard</Link>.
                </label>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-4">
            <Button 
              onClick={handleAuth}
              disabled={isLoading || isRedirecting || isGoogleLoading}
              className="w-full h-[58px] rounded-full blue-gradient text-white font-bold text-base shadow-2xl neon-glow transition-all active:scale-95 flex items-center justify-between px-8 border-none"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={22} className="text-white" />}
              <span>{isLoading ? "Synchronizing..." : (mode === "signin" ? "Sign In" : "Create Account")}</span>
              <ArrowRight size={20} className="text-white" />
            </Button>

            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isRedirecting || isGoogleLoading}
              className="w-full h-[58px] rounded-full bg-white/5 border-white/10 text-white font-bold text-base flex items-center justify-center gap-3 hover:bg-white/10"
            >
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : <Chrome size={22} />}
              <span>Continue with Google</span>
            </Button>

            <div className="text-center pt-2">
              <button 
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                {mode === "signin" ? "New to Aura? Create an account" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-auto py-8 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-bold">Premium • Private • Real</p>
      </div>
    </div>
  );
}
