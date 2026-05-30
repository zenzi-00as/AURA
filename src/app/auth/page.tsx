"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Lock, Info, RefreshCw, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const DEMO_EMAIL = "demo@aura.com";
const DEMO_OTP = "123456";

export default function AuthPage() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user: authUser, loading: authLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && authUser) {
      router.replace("/");
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleNext = async () => {
    if (!auth || !db) return;
    
    if (step === "details") {
      if (!email.includes("@")) {
        toast({
          variant: "destructive",
          title: "Invalid Email",
          description: "Please enter a valid email address.",
        });
        return;
      }
      if (!agreedToTerms) {
        toast({
          variant: "destructive",
          title: "Consent Required",
          description: "Please agree to the Terms & Conditions and Privacy Policy.",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (step === "details") {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStep("otp");
        setResendTimer(60);
        toast({
          title: "Verification Sent",
          description: `A 6-digit code has been sent to ${email}`,
        });
      } else if (step === "otp") {
        if (otp.length !== 6) throw new Error("Please enter a valid 6-digit code.");
        
        const password = "aura_secure_pass_" + otp;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            onboardingCompleted: false,
            createdAt: new Date()
          }, { merge: true });

          toast({ title: "Verified", description: "Identity synchronized." });
          router.replace("/onboarding");
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace("/");
          } else {
            throw err;
          }
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Auth Error",
        description: error.message || "Authentication failed. Please try again.",
      });
      if (step === "otp") setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0 || isLoading) return;
    setResendTimer(60);
    toast({
      title: "Code Resent",
      description: "A new verification code has been sent to your email.",
    });
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] aura-pulse" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse relative z-10"
        >
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 pt-24 relative overflow-hidden bg-background min-h-screen">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="mb-12 relative z-10">
        <h1 className="text-3xl font-semibold text-foreground mb-3 tracking-tight">
          {step === "details" ? "Welcome back" : "Verify Email"}
        </h1>
        <p className="text-muted-foreground font-light leading-relaxed">
          {step === "details" 
            ? "Enter your email to continue. We'll send a quick verification." 
            : `We've sent a 6-digit code to ${email}. Please enter it below.`}
        </p>
      </div>

      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            {step === "details" ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Mail size={18} />
                    </div>
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg text-foreground transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 px-1">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 border-border bg-muted data-[state=checked]:bg-primary"
                  />
                  <label 
                    htmlFor="terms" 
                    className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                  >
                    I agree to the{" "}
                    <Link href="/terms" className="text-foreground font-semibold hover:text-primary transition-colors">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-foreground font-semibold hover:text-primary transition-colors">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <Info size={16} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-medium">
                    <span className="font-bold text-primary">Demo:</span> Use <strong>demo@aura.com</strong> with <strong>123456</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <Input
                    type="number"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-2xl tracking-[0.5em] text-foreground transition-all"
                  />
                </div>

                <div className="flex justify-between items-center px-2">
                  <button
                    onClick={handleResend}
                    disabled={resendTimer > 0 || isLoading}
                    className="text-xs font-bold text-primary hover:text-primary/80 disabled:text-muted-foreground flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                  <button 
                    onClick={() => {
                      setStep("details");
                      setOtp("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors font-bold flex items-center gap-1"
                  >
                    <ChevronLeft size={12} />
                    Change email
                  </button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={isLoading || (step === "details" ? (!email || !agreedToTerms) : otp.length < 6)}
              className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {step === "details" ? "Send Code" : "Verify Identity"}
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto pb-8 text-center opacity-40">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold">
          Minimalist • Private • Real
        </p>
      </div>
    </div>
  );
}
