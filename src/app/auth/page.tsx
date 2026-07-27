
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Lock, RefreshCw, ChevronLeft, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "+91", flag: "🇮🇳", name: "India", maxLength: 10 },
  { code: "+1", flag: "🇺🇸", name: "USA", maxLength: 10 },
  { code: "+44", flag: "🇬🇧", name: "UK", maxLength: 10 },
  { code: "+55", flag: "🇧🇷", name: "Brazil", maxLength: 11 },
  { code: "+33", flag: "🇫🇷", name: "France", maxLength: 10 },
  { code: "+49", flag: "🇩🇪", name: "Germany", maxLength: 10 },
  { code: "+34", flag: "🇪🇸", name: "Spain", maxLength: 9 },
  { code: "+61", flag: "🇦🇺", name: "Australia", maxLength: 9 },
];

export default function AuthPage() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const router = useRouter();
  const auth = useAuth();
  const { user, loading: authLoading, onboardingCompleted } = useAuthContext();
  const { toast } = useToast();

  const currentCountry = useMemo(() => {
    return COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  }, [countryCode]);

  useEffect(() => {
    if (!authLoading && user) {
      if (onboardingCompleted) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, authLoading, onboardingCompleted, router]);

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
    if (!auth) return;
    
    if (step === "details") {
      if (!email.includes("@")) {
        toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
        return;
      }
      if (phone.length < 5) {
        toast({ variant: "destructive", title: "Invalid Phone", description: "Please enter a valid phone number." });
        return;
      }
      if (!agreedToTerms) {
        toast({ variant: "destructive", title: "Consent Required", description: "Please agree to the Terms & Conditions." });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (step === "details") {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStep("otp");
        setResendTimer(60);
        toast({ title: "Verification Sent", description: `A verification code has been sent to ${email}` });
      } else if (step === "otp") {
        if (otp.length !== 6) throw new Error("Please enter a valid 6-digit code.");
        
        const password = "aura_secure_pass_" + otp;
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          toast({ title: "Verified", description: "Email identity synchronized." });
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            await signInWithEmailAndPassword(auth, email, password);
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
    toast({ title: "Code Resent", description: "A new verification code has been sent to your email." });
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen-safe relative overflow-hidden aura-doodle">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] aura-pulse" />
        <div className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse relative z-10 shadow-2xl shadow-primary/20">
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 pb-12 relative bg-background min-h-screen-safe safe-top safe-bottom aura-doodle">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Blank Header Structure */}
      <header className="h-16 mb-8 relative z-10" />
      
      <div className="mb-12 relative z-10">
        <div className="flex flex-col gap-2">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground tracking-tight"
          >
            {step === "details" ? "Welcome back" : "Verify Email"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground font-light leading-relaxed text-sm"
          >
            {step === "details" 
              ? "Enter your details to continue. We'll verify your email." 
              : `We've sent a 6-digit code to ${email}. Please enter it below.`}
          </motion.p>
        </div>
      </div>

      <div className="flex-1 relative z-10 overflow-y-auto scrollbar-hide py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-6 p-1"
          >
            {step === "details" ? (
              <div className="space-y-5">
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
                      className="pl-12 h-14 bg-[#151515] border-white/12 rounded-2xl focus:ring-primary focus:border-primary text-sm text-white transition-all shadow-none placeholder:text-[#8A8A8A]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Select value={countryCode} onValueChange={(val) => {
                      setCountryCode(val);
                      setPhone(""); 
                    }}>
                      <SelectTrigger className="w-[100px] h-14 bg-[#151515] border-white/12 rounded-2xl text-sm font-medium text-white focus:ring-primary">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border rounded-2xl max-h-[300px]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={`${c.code}-${c.name}`} value={c.code} className="rounded-xl">
                            <span className="mr-2">{c.flag}</span>
                            <span>{c.code}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="relative group flex-1">
                      <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                        <Phone size={18} />
                      </div>
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        maxLength={currentCountry.maxLength}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="pl-12 h-14 bg-[#151515] border-white/12 rounded-2xl focus:ring-primary focus:border-primary text-sm text-white transition-all shadow-none placeholder:text-[#8A8A8A]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 px-1 pt-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 w-4 h-4 border-border bg-muted data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                    I agree to the{" "}
                    <Link href="/terms" className="text-foreground font-semibold hover:text-primary transition-colors">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-foreground font-semibold hover:text-primary transition-colors">Privacy Policy</Link>.
                  </label>
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
                    className="pl-12 h-14 bg-[#151515] border-white/12 rounded-2xl focus:ring-primary focus:border-primary text-xl tracking-[0.5em] text-white transition-all shadow-none placeholder:text-[#8A8A8A]"
                  />
                </div>

                <div className="flex flex-col justify-between items-center gap-4 px-2">
                  <button onClick={handleResend} disabled={resendTimer > 0 || isLoading} className="text-xs font-bold text-primary hover:text-primary/80 disabled:text-muted-foreground flex items-center gap-2 transition-colors">
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                  <button onClick={() => { setStep("details"); setOtp(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-bold flex items-center gap-1">
                    <ChevronLeft size={14} />
                    Change details
                  </button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={isLoading || (step === "details" ? (!email || phone.length < 5 || !agreedToTerms) : otp.length < 6)}
              className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-base font-bold shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                {step === "details" ? "Send Code" : "Verify Identity"}
                <ArrowRight size={18} />
              </>}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto py-6 text-center opacity-40">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold">Minimalist • Private • Real</p>
      </div>
    </div>
  );
}
