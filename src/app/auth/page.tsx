"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Phone, Lock } from "lucide-react";

export default function AuthPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleNext = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (step === "phone") setStep("otp");
      else router.push("/onboarding");
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col p-8 pt-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-white mb-3">
          {step === "phone" ? "Welcome back" : "Verify code"}
        </h1>
        <p className="text-muted-foreground font-light leading-relaxed">
          {step === "phone" 
            ? "Enter your number to continue. We'll send a quick verification." 
            : `Sent to ${phone}. Enter the 6-digit code.`}
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
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
              {step === "phone" ? <Phone size={18} /> : <Lock size={18} />}
            </div>
            <Input
              type={step === "phone" ? "tel" : "number"}
              placeholder={step === "phone" ? "+1 (555) 000-0000" : "000000"}
              value={step === "phone" ? phone : otp}
              onChange={(e) => step === "phone" ? setPhone(e.target.value) : setOtp(e.target.value)}
              className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary text-lg"
            />
          </div>

          <Button 
            onClick={handleNext}
            disabled={isLoading || (step === "phone" ? !phone : !otp)}
            className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {step === "phone" ? "Send Code" : "Verify"}
                <ArrowRight size={20} />
              </>
            )}
          </Button>

          {step === "otp" && (
            <button 
              onClick={() => setStep("phone")}
              className="w-full text-center text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Change number
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pb-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Secure • Private • Encrypted
        </p>
      </div>
    </div>
  );
}