
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Phone, Lock, Info, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const DEMO_EMAIL = "demo@aura.com";
const DEMO_OTP = "123456";

export default function AuthPage() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
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

  const handleNext = async () => {
    if (!auth || !db) return;
    
    if (step === "details") {
      if (!agreedToTerms) {
        toast({
          variant: "destructive",
          title: "Consent Required",
          description: "Please agree to the Terms & Conditions and Privacy Policy.",
        });
        return;
      }
      if (!email.includes("@")) {
        toast({
          variant: "destructive",
          title: "Invalid Email",
          description: "Please enter a valid email address.",
        });
        return;
      }
      if (phone.length < 10) {
        toast({
          variant: "destructive",
          title: "Invalid Phone",
          description: "Please enter a valid mandatory phone number.",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      // Mocking the OTP flow for Email as standard Firebase doesn't have an "Email OTP" out of box without backend.
      // We will use standard email/password or email link flows, but for the UI request we simulate OTP.
      
      if (step === "details") {
        // Simulation: Send OTP to email
        setTimeout(() => {
          setStep("otp");
          setIsLoading(false);
          setResendTimer(60);
          toast({
            title: "Verification Sent",
            description: `A 6-digit code has been sent to ${email}`,
          });
        }, 1200);
        return;
      }

      if (step === "otp") {
        // Simulation: Verify OTP
        if (otp === DEMO_OTP || email !== DEMO_EMAIL) {
          // For prototype, we'll allow any OTP for non-demo emails or 123456 for demo
          
          // Actually perform a sign-in or create user to get UID
          // For the sake of the prototype flow:
          try {
            // Using a dummy password for this prototype "OTP" flow
            const userCredential = await createUserWithEmailAndPassword(auth, email, "aura_secure_pass_" + otp);
            const user = userCredential.user;

            // Save the phone number to session/local or temporary firestore doc to be picked up by onboarding
            // We'll store it in a temporary local storage for now or directly update a user doc
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              email: email,
              phoneNumber: phone,
              onboardingCompleted: false,
              createdAt: new Date()
            }, { merge: true });

            toast({
              title: "Verified",
              description: "Welcome to the Aura community.",
            });
            router.replace("/onboarding");
          } catch (err: any) {
            // If user exists, just sign in
            if (err.code === 'auth/email-already-in-use') {
              const userCredential = await signInWithEmailAndPassword(auth, email, "aura_secure_pass_" + otp).catch(() => {
                // If password fails (since it's a mock OTP), we just proceed for the prototype's sake
                // In a real app, this would be a secure backend flow.
                return signInWithEmailAndPassword(auth, email, "aura_secure_pass_123456"); 
              });
              
              if (userCredential) {
                const user = userCredential.user;
                // Update phone if needed
                await setDoc(doc(db, "users", user.uid), {
                  phoneNumber: phone
                }, { merge: true });
                
                router.replace("/onboarding");
              }
            } else {
              throw err;
            }
          }
        } else {
          throw new Error("Invalid verification code.");
        }
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
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

  const handleResend = () => {
    if (resendTimer > 0 || isLoading) return;
    setResendTimer(60);
    toast({
      title: "Code Resent",
      description: "A new verification code has been sent to your email.",
    });
  };

  return (
    <div className="flex-1 flex flex-col p-8 pt-24 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-foreground mb-3">
          {step === "details" ? "Secure Login" : "Verify Email"}
        </h1>
        <p className="text-muted-foreground font-light leading-relaxed">
          {step === "details" 
            ? "Enter your credentials to continue. Your privacy is our priority." 
            : `We've sent a 6-digit code to ${email}. Please enter it below.`}
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
                    className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg text-foreground"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (Mandatory)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
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
                  <span className="font-bold text-primary uppercase">Demo Mode:</span> Use <strong>demo@aura.com</strong> with OTP <strong>123456</strong> for testing.
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
                    setStep("details");
                    setOtp("");
                    setResendTimer(0);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-bold flex items-center gap-1"
                >
                  <ChevronLeft size={12} />
                  Change details
                </button>
              </div>
            </div>
          )}

          <Button 
            onClick={handleNext}
            disabled={isLoading || (step === "details" ? (!email || !phone || !agreedToTerms) : otp.length < 6)}
            className="w-full h-14 rounded-2xl fuchsia-gradient text-foreground text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin-fast" />
            ) : (
              <>
                {step === "details" ? "Send Code" : "Verify Identity"}
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
