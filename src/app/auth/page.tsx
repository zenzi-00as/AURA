
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
  { code: "+81", flag: "🇯🇵", name: "Japan", maxLength: 10 },
  { code: "+86", flag: "🇨🇳", name: "China", maxLength: 11 },
  { code: "+971", flag: "🇦🇪", name: "UAE", maxLength: 9 },
  { code: "+7", flag: "🇷🇺", name: "Russia", maxLength: 10 },
  { code: "+27", flag: "🇿🇦", name: "South Africa", maxLength: 9 },
  { code: "+82", flag: "🇰🇷", name: "South Korea", maxLength: 10 },
  { code: "+39", flag: "🇮🇹", name: "Italy", maxLength: 10 },
  { code: "+1", flag: "🇨🇦", name: "Canada", maxLength: 10 },
  { code: "+65", flag: "🇸🇬", name: "Singapore", maxLength: 8 },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", maxLength: 10 },
  { code: "+62", flag: "🇮🇩", name: "Indonesia", maxLength: 12 },
  { code: "+66", flag: "🇹🇭", name: "Thailand", maxLength: 9 },
  { code: "+84", flag: "🇻🇳", name: "Vietnam", maxLength: 10 },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", maxLength: 9 },
  { code: "+41", flag: "🇨🇭", name: "Switzerland", maxLength: 9 },
  { code: "+46", flag: "🇸🇪", name: "Sweden", maxLength: 9 },
  { code: "+47", flag: "🇳🇴", name: "Norway", maxLength: 8 },
  { code: "+45", flag: "🇩🇰", name: "Denmark", maxLength: 8 },
  { code: "+351", flag: "🇵🇹", name: "Portugal", maxLength: 9 },
  { code: "+30", flag: "🇬🇷", name: "Greece", maxLength: 10 },
  { code: "+90", flag: "🇹🇷", name: "Turkey", maxLength: 10 },
  { code: "+972", flag: "🇮🇱", name: "Israel", maxLength: 9 },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", maxLength: 9 },
  { code: "+20", flag: "🇪🇬", name: "Egypt", maxLength: 10 },
  { code: "+234", flag: "🇳🇬", name: "Nigeria", maxLength: 10 },
  { code: "+254", flag: "🇰🇪", name: "Kenya", maxLength: 9 },
  { code: "+52", flag: "🇲🇽", name: "Mexico", maxLength: 10 },
  { code: "+54", flag: "🇦🇷", name: "Argentina", maxLength: 10 },
  { code: "+56", flag: "🇨🇱", name: "Chile", maxLength: 9 },
  { code: "+57", flag: "🇨🇴", name: "Colombia", maxLength: 10 },
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] aura-pulse" />
        <div className="w-24 h-24 rounded-[32px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse relative z-10 shadow-2xl shadow-primary/20">
          <span className="text-4xl font-bold text-white tracking-tighter">A</span>
        </div>
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
            ? "Enter your details to continue. We'll verify your email." 
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
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <Lock size={16} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-bold text-primary uppercase">Demo Access:</span> Use email <strong>9861898@gmail.com</strong> with OTP <strong>123456</strong> for testing.
                  </p>
                </div>

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

                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={(val) => {
                      setCountryCode(val);
                      setPhone(""); 
                    }}>
                      <SelectTrigger className="w-[110px] h-14 bg-muted border-border rounded-2xl text-base font-medium text-foreground focus:ring-primary">
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
                        className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg text-foreground transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 px-1">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 border-border bg-muted data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                    I agree to the{" "}
                    <Link href="/terms" className="text-foreground font-semibold hover:text-primary transition-colors">Terms & Conditions</Link>
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
                    className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-2xl tracking-[0.5em] text-foreground transition-all"
                  />
                </div>

                <div className="flex justify-between items-center px-2">
                  <button onClick={handleResend} disabled={resendTimer > 0 || isLoading} className="text-xs font-bold text-primary hover:text-primary/80 disabled:text-muted-foreground flex items-center gap-2 transition-colors">
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                  <button onClick={() => { setStep("details"); setOtp(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-bold flex items-center gap-1">
                    <ChevronLeft size={12} />
                    Change details
                  </button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={isLoading || (step === "details" ? (!email || phone.length < 5 || !agreedToTerms) : otp.length < 6)}
              className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>
                {step === "details" ? "Send Code" : "Verify Identity"}
                <ArrowRight size={20} />
              </>}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto pb-8 text-center opacity-40">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold">Minimalist • Private • Real</p>
      </div>
    </div>
  );
}
