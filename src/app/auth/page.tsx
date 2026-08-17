
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ChevronLeft, Loader2, Sparkles, Chrome } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useFirestore } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading, onboardingCompleted } = useAuthContext();
  const { toast } = useToast();

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const currentCountry = useMemo(() => {
    return COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  }, [countryCode]);

  useEffect(() => {
    if (!authLoading && user && !isRedirecting) {
      setIsRedirecting(true);
      if (onboardingCompleted) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, authLoading, onboardingCompleted, router, isRedirecting]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const initRecaptcha = () => {
    if (!auth) return;
    if (recaptchaVerifierRef.current) return;

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log("[AUTH] reCAPTCHA verified");
        }
      });
    } catch (error) {
      console.error("[AUTH_ERROR] reCAPTCHA init failed", error);
    }
  };

  const getFriendlyError = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-verification-code':
        return "The verification code is invalid or this verification session has expired. Please request a new code.";
      case 'auth/code-expired':
        return "This verification code has expired. Please request a new code.";
      case 'auth/too-many-requests':
        return "Too many attempts. Please try again later.";
      case 'auth/network-request-failed':
        return "Network connection problem. Please try again.";
      case 'auth/user-disabled':
        return "This account has been suspended.";
      default:
        return "Unable to verify your account. Please try again.";
    }
  };

  const handleNext = async () => {
    if (!auth || !db) return;
    if (isLoading || isRedirecting) return;
    
    setIsLoading(true);
    try {
      if (step === "details") {
        if (!email.includes("@")) throw new Error("Invalid Email Identity");
        if (phone.length !== currentCountry.maxLength) {
          throw new Error(`Invalid Phone. Expected ${currentCountry.maxLength} digits for ${currentCountry.name}.`);
        }
        if (!agreedToTerms) throw new Error("Terms required to synchronize");

        initRecaptcha();
        const fullPhone = countryCode + phone;
        
        const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifierRef.current!);
        confirmationResultRef.current = result;
        setStep("otp");
      } else {
        const otpNormalized = otp.replace(/\D/g, "").slice(0, 6);
        if (otpNormalized.length !== 6) throw new Error("Enter the 6-digit verification code");
        if (!confirmationResultRef.current) throw new Error("Verification session expired. Please go back.");

        const result = await confirmationResultRef.current.confirm(otpNormalized);
        const authedUser = result.user;

        if (authedUser) {
          const userRef = doc(db, "users", authedUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: authedUser.uid,
              email: email,
              phoneNumber: countryCode + phone,
              onboardingCompleted: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              dailyChatCount: 0,
              dailyMediaCount: 0,
              superLikeBalance: 0,
              plan: 'Free',
              incognitoMode: false,
              isSuspended: false,
              isAdmin: false,
              isOnline: true,
              lastActive: serverTimestamp()
            });
          }
        }
      }
    } catch (error: any) {
      const message = getFriendlyError(error.code) || error.message;
      toast({ variant: "destructive", title: "Authentication Error", description: message });
      if (step === "otp") setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !db) return;
    if (isLoading || isRedirecting) return;
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const authedUser = result.user;

      if (authedUser) {
        const userRef = doc(db, "users", authedUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: authedUser.uid,
            name: authedUser.displayName || "",
            email: authedUser.email || "",
            photoUrl: authedUser.photoURL || "",
            loginMethod: "google",
            onboardingCompleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            plan: 'Free',
            incognitoMode: false,
            isSuspended: false,
            isAdmin: false,
            isOnline: true,
            lastActive: serverTimestamp()
          });
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Google Access Denied", description: "Unable to synchronize with Google." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 pb-12 relative min-h-screen bg-[#050816] overflow-hidden">
      <div className="absolute inset-0 z-0 hero-radial" />
      
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
            {step === "details" ? "Synchronize your presence." : `Sent code to ${countryCode}${phone}`}
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
                  <label className="text-[10px] font-bold text-[#2563FF] uppercase tracking-[0.2em] px-1">Email Identity</label>
                  <Input 
                    type="email" 
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-white/[0.045] border-white/10 rounded-2xl px-6 text-white focus:border-[#2563FF] focus:ring-0"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="w-24">
                    <Select 
                      value={countryCode} 
                      onValueChange={(val) => {
                        setCountryCode(val);
                        setPhone(""); 
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
                    className="mt-1 border-white/20 data-[state=checked]:bg-[#2563FF]"
                  />
                  <label htmlFor="terms" className="text-xs text-white/40 leading-relaxed">
                    I acknowledge the <Link href="/terms" className="text-white hover:text-[#2563FF]">Terms</Link> and <Link href="/privacy" className="text-white hover:text-[#2563FF]">Privacy Guard</Link>.
                  </label>
                </div>

                <div className="pt-8 space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                       <div className="h-[1px] flex-1 bg-white/10" />
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Quick Access</span>
                       <div className="h-[1px] flex-1 bg-white/10" />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{ boxShadow: ["0 0 0px rgba(37,99,255,0)", "0 0 30px rgba(37,99,255,0.25)", "0 0 0px rgba(37,99,255,0)"] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      onClick={handleGoogleLogin}
                      disabled={isLoading || isRedirecting}
                      className="w-full h-[58px] rounded-full border border-[#2563FF]/30 bg-gradient-to-r from-[#111827] to-[#1E293B] flex items-center justify-between px-8 text-white group shadow-[0_0_30px_rgba(37,99,255,0.25)]"
                    >
                      <Chrome size={22} className="text-[#2563FF]" />
                      <span className="text-base font-semibold">Continue with Google</span>
                      <ArrowRight size={20} className="text-white/20 group-hover:text-white transition-colors" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#2563FF] uppercase tracking-[0.2em] px-1">Verification Code</label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-20 bg-white/[0.045] border-white/10 rounded-[28px] text-3xl tracking-[0.6em] font-bold text-center text-white"
                  />
                </div>
                <button 
                  onClick={() => {
                    setStep("details");
                    setOtp("");
                  }} 
                  className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={16} /> Recalibrate details
                </button>
              </div>
            )}

            <Button 
              onClick={handleNext}
              disabled={isLoading || isRedirecting}
              className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg shadow-2xl neon-glow transition-all active:scale-95"
            >
              {isLoading || isRedirecting ? <Loader2 className="animate-spin" /> : (
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

      <div id="recaptcha-container"></div>
    </div>
  );
}
