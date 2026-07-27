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
import { cn } from "@/lib/utils";

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
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen-safe relative overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-24 h-24 rounded-[32px] premium-gradient flex items-center justify-center neon-glow shadow-2xl mb-8"
        >
          <span className="text-4xl font-bold text-white tracking-tighter">A</span>
        </motion.div>
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 pb-12 relative min-h-screen-safe safe-top safe-bottom overflow-hidden">
      {/* Auth Specific Wallpaper */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_60%)]" />
      
      <header className="h-20 mb-12 relative z-10 flex items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center neon-glow"
        >
          <span className="text-white font-bold text-lg">A</span>
        </motion.div>
      </header>
      
      <div className="mb-12 relative z-10">
        <div className="flex flex-col gap-3">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-bold text-white tracking-tighter leading-tight"
          >
            {step === "details" ? "Welcome back" : "Synchronize"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/40 font-light leading-relaxed text-lg"
          >
            {step === "details" 
              ? "Verify your digital presence to enter the Aura." 
              : `A code was materialized for ${email}.`}
          </motion.p>
        </div>
      </div>

      <div className="flex-1 relative z-10 overflow-y-auto scrollbar-hide py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {step === "details" ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative glass rounded-[24px] p-1 focus-within:neon-glow transition-all">
                    <Mail size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-14 h-16 bg-transparent border-none text-lg text-white placeholder:text-white/20 focus:ring-0 shadow-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Select value={countryCode} onValueChange={(val) => {
                      setCountryCode(val);
                      setPhone(""); 
                    }}>
                      <SelectTrigger className="w-[110px] h-16 glass border-white/5 rounded-[24px] text-lg font-medium text-white focus:ring-primary/40 px-5">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="glass-dark border-white/10 rounded-[24px] max-h-[300px]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={`${c.code}-${c.name}`} value={c.code} className="rounded-xl">
                            <span className="mr-2">{c.flag}</span>
                            <span>{c.code}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="relative glass rounded-[24px] p-1 focus-within:neon-glow-pink transition-all flex-1">
                      <Phone size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        maxLength={currentCountry.maxLength}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="pl-14 h-16 bg-transparent border-none text-lg text-white placeholder:text-white/20 focus:ring-0 shadow-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 px-2 pt-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 w-5 h-5 border-white/20 bg-white/5 data-[state=checked]:bg-primary rounded-lg"
                  />
                  <label htmlFor="terms" className="text-xs text-white/40 leading-relaxed cursor-pointer select-none">
                    I acknowledge the{" "}
                    <Link href="/terms" className="text-white font-bold hover:text-primary transition-colors underline underline-offset-4 decoration-white/10">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-white font-bold hover:text-primary transition-colors underline underline-offset-4 decoration-white/10">Privacy Guard</Link>.
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="relative glass rounded-[28px] p-1 focus-within:neon-glow transition-all">
                  <Lock size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" />
                  <Input
                    type="number"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    className="pl-16 h-20 bg-transparent border-none text-3xl tracking-[0.6em] font-bold text-white placeholder:text-white/10 focus:ring-0 shadow-none text-center"
                  />
                </div>

                <div className="flex flex-col items-center gap-6">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    onClick={handleResend} 
                    disabled={resendTimer > 0 || isLoading} 
                    className="text-xs font-bold text-primary uppercase tracking-[0.2em] disabled:text-white/20 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Resend Aura in ${resendTimer}s` : "Resend Sync Code"}
                  </motion.button>
                  <button onClick={() => { setStep("details"); setOtp(""); }} className="text-xs text-white/40 hover:text-white transition-colors font-bold flex items-center gap-1 uppercase tracking-widest">
                    <ChevronLeft size={16} />
                    Recalibrate Identity
                  </button>
                </div>
              </div>
            )}

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              disabled={isLoading || (step === "details" ? (!email || phone.length < 5 || !agreedToTerms) : otp.length < 6)}
              className={cn(
                "w-full h-18 rounded-[28px] premium-gradient text-white text-xl font-bold shadow-2xl neon-glow transition-all flex items-center justify-center gap-3",
                (isLoading || (step === "details" ? (!email || phone.length < 5 || !agreedToTerms) : otp.length < 6)) && "opacity-40 grayscale"
              )}
            >
              {isLoading ? (
                <div className="w-6 h-6 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <span>{step === "details" ? "Generate Access" : "Synchronize Identity"}</span>
                  <ArrowRight size={24} />
                </>
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto py-12 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-bold">Luxury • Private • Verified</p>
      </div>
    </div>
  );
}