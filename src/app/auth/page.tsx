"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Phone, Lock, Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/checkbox";
import { useAuth } from "@/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES = [
  { name: "India", code: "+91", flag: "🇮🇳", length: 10 },
  { name: "United States", code: "+1", flag: "🇺🇸", length: 10 },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", length: 10 },
  { name: "Brazil", code: "+55", flag: "🇧🇷", length: 11 },
  { name: "Germany", code: "+49", flag: "🇩🇪", length: 11 },
  { name: "France", code: "+33", flag: "🇫🇷", length: 9 },
  { name: "Australia", code: "+61", flag: "🇦🇺", length: 9 },
];

const DEMO_PHONE = "0000000000";
const DEMO_OTP = "123456";

export default function AuthPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const handleNext = async () => {
    if (!auth) return;
    
    if (step === "phone" && !agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "Please agree to the Terms & Conditions and Privacy Policy to continue.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = selectedCountry.code + phone;

      // Handle Demo Bypass
      if (step === "phone" && phone === DEMO_PHONE) {
        setTimeout(() => {
          setStep("otp");
          setIsLoading(false);
          setResendTimer(60);
          toast({
            title: "Demo Mode",
            description: "Using demo credentials. OTP is 123456",
          });
        }, 800);
        return;
      }

      if (step === "otp" && phone === DEMO_PHONE) {
        if (otp === DEMO_OTP) {
          toast({
            title: "Verified (Demo)",
            description: "Logged in with demo account.",
          });
          router.replace("/onboarding");
          return;
        } else {
          throw new Error("Invalid demo OTP");
        }
      }

      // Real Auth Path
      if (step === "phone") {
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
              size: "invisible",
            }
          );
        }

        const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifierRef.current);
        setConfirmationResult(result);
        setStep("otp");
        setResendTimer(60);
        toast({
          title: "Code Sent",
          description: `Verification code sent to ${fullPhone}`,
        });
      } else {
        if (!confirmationResult) throw new Error("No confirmation result found");
        
        await confirmationResult.confirm(otp);
        toast({
          title: "Verified",
          description: "Phone number verified successfully.",
        });
        router.replace("/onboarding");
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      toast({
        variant: "destructive",
        title: "Auth Error",
        description: error.message || "Failed to authenticate. Please try again.",
      });
      if (step === "otp") setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth || resendTimer > 0 || isLoading) return;
    
    if (phone === DEMO_PHONE) {
      setResendTimer(60);
      toast({
        title: "Code Sent (Demo)",
        description: "Demo verification code resent.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = selectedCountry.code + phone;
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          { size: "invisible" }
        );
      }
      const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setResendTimer(60);
      toast({
        title: "Code Resent",
        description: `A new verification code has been sent to ${fullPhone}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: error.message || "Failed to resend code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= selectedCountry.length) {
      setPhone(val);
    }
  };

  const isPhoneValid = phone.length === selectedCountry.length;

  return (
    <div className="flex-1 flex flex-col p-8 pt-24 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      
      <div id="recaptcha-container"></div>

      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-foreground mb-3">
          {step === "phone" ? "Welcome back" : "Verify code"}
        </h1>
        <p className="text-muted-foreground font-light leading-relaxed">
          {step === "phone" 
            ? "Enter your number to continue. We'll send a quick verification." 
            : `Sent to ${selectedCountry.code} ${phone}. Enter the 6-digit code.`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="space-y-6"
        >
          {step === "phone" ? (
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="w-32">
                  <Select
                    defaultValue={selectedCountry.code}
                    onValueChange={(val) => {
                      const country = COUNTRIES.find((c) => c.code === val);
                      if (country) {
                        setSelectedCountry(country);
                        setPhone(""); 
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 bg-muted border-border rounded-2xl focus:ring-primary">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span>{selectedCountry.flag}</span>
                          <span className="text-sm font-medium text-foreground">{selectedCountry.code}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="focus:bg-primary/20 focus:text-foreground">
                          <span className="flex items-center gap-3">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="text-muted-foreground ml-auto">{c.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </div>
                  <Input
                    type="tel"
                    placeholder={`${selectedCountry.length} digits`}
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 px-1">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms} 
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-1 border-border bg-muted data-[state=checked]:bg-primary data-[state=checked]:text-white"
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
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-primary uppercase">Demo Mode:</span> Use <strong>0000000000</strong> with code <strong>+91</strong> and OTP <strong>123456</strong> for instant testing.
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
                  className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg text-foreground"
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
                    setStep("phone");
                    setConfirmationResult(null);
                    setResendTimer(0);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-bold"
                >
                  Change number
                </button>
              </div>
            </div>
          )}

          <Button 
            onClick={handleNext}
            disabled={isLoading || (step === "phone" ? (!isPhoneValid || !agreedToTerms) : otp.length < 6)}
            className="w-full h-14 rounded-2xl fuchsia-gradient text-foreground text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin-fast" />
            ) : (
              <>
                {step === "phone" ? "Send Code" : "Verify"}
                <ArrowRight size={20} />
              </>
            )}
          </Button>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pb-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Minimalist • Private • Real
        </p>
      </div>
    </div>
  );
}
