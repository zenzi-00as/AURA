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

  const handleNext = async () => {
    if (!auth) return;
    
    setIsLoading(true);
    try {
      if (step === "details") {
        if (!email.includes("@")) throw new Error("Invalid Email");
        if (phone.length !== currentCountry.maxLength) {
          throw new Error(`Invalid Phone. Expected ${currentCountry.maxLength} digits for ${currentCountry.name}.`);
        }
        if (!agreedToTerms) throw new Error("Terms required");

        await new Promise(resolve => setTimeout(resolve, 1500));
        setStep("otp");
        setResendTimer(60);
      } else {
        if (otp.length !== 6) throw new Error("Invalid 6-digit code");
        const password = "aura_secure_" + otp;
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            await signInWithEmailAndPassword(auth, email, password);
          } else throw err;
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Auth Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 pb-12 relative min-h-screen hero-radial overflow-hidden">
      <header className="h-16 mb-8 relative z-10 flex items-center">
        <div className="w-10 h-10 rounded-2xl blue-gradient border border-white/10 flex items-center justify-center shadow-2xl neon-glow">
          <span className="text-white font-bold text-lg">A</span>
        </div>
      </header>
      
      <div className="mb-10 relative z-10">
        <div className="flex flex-col gap-3">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-bold text-white tracking-tighter leading-tight"
          >
            {step === "details" ? "Welcome back" : "Verify Identity"}
          </motion.h1>
          <p className="text-white/60 font-light text-lg">
            {step === "details" ? "Synchronize your presence." : `Sent code to ${email}`}
          </p>
        </div>
      </div>

      <div className="flex-1 relative z-10 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {step === "details" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#0057FF] uppercase tracking-[0.2em] px-1">Email Identity</label>
                  <Input 
                    type="email" 
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-white/[0.045] border-white/10 rounded-2xl px-6 text-white focus:border-[#1264FF] focus:ring-0"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="w-24">
                    <Select 
                      value={countryCode} 
                      onValueChange={(val) => {
                        setCountryCode(val);
                        setPhone(""); // Clear phone on country change to prevent invalid states
                      }}
                    >
                      <SelectTrigger className="h-14 bg-white/[0.045] border-white/10 rounded-2xl text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#11141C] border-white/10 text-white rounded-2xl">
                        {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input 
                    type="tel" 
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= currentCountry.maxLength) {
                        setPhone(val);
                      }
                    }}
                    className="h-14 bg-white/[0.045] border-white/10 rounded-2xl px-6 text-white flex-1"
                  />
                </div>

                <div className="flex items-start space-x-3 px-1 pt-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-1 border-white/20 data-[state=checked]:bg-[#0057FF]"
                  />
                  <label htmlFor="terms" className="text-xs text-white/40 leading-relaxed">
                    I acknowledge the <Link href="/terms" className="text-white hover:text-[#0057FF]">Terms</Link> and <Link href="/privacy" className="text-white hover:text-[#0057FF]">Privacy Guard</Link>.
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#0057FF] uppercase tracking-[0.2em] px-1">Verification Code</label>
                  <Input 
                    type="number" 
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    className="h-20 bg-white/[0.045] border-white/10 rounded-[28px] text-3xl tracking-[0.6em] font-bold text-center text-white"
                  />
                </div>
                <button onClick={() => setStep("details")} className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-2">
                  <ChevronLeft size={16} /> Recalibrate details
                </button>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={isLoading}
              className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg shadow-2xl neon-glow transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  {step === "details" ? "Generate Access" : "Verify & Synchronize"}
                  <ArrowRight size={20} className="ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto py-8 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-bold">Premium • Private • Real</p>
      </div>
    </div>
  );
}
