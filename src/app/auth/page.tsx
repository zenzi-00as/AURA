"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Phone, Lock, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { name: "India", code: "+91", flag: "🇮🇳", length: 10 },
  { name: "United States", code: "+1", flag: "🇺🇸", length: 10 },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", length: 10 },
  { name: "Brazil", code: "+55", flag: "🇧🇷", length: 11 },
  { name: "Germany", code: "+49", flag: "🇩🇪", length: 11 },
  { name: "France", code: "+33", flag: "🇫🇷", length: 9 },
  { name: "Australia", code: "+61", flag: "🇦🇺", length: 9 },
];

export default function AuthPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const router = useRouter();

  const handleNext = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (step === "phone") setStep("otp");
      else router.push("/onboarding");
    }, 1200);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= selectedCountry.length) {
      setPhone(val);
    }
  };

  const isPhoneValid = phone.length === selectedCountry.length;

  return (
    <div className="flex-1 flex flex-col p-8 pt-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      
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
            <div className="flex gap-2">
              <div className="w-32">
                <Select
                  defaultValue={selectedCountry.code}
                  onValueChange={(val) => {
                    const country = COUNTRIES.find((c) => c.code === val);
                    if (country) {
                      setSelectedCountry(country);
                      setPhone(""); // Reset phone when country changes to avoid length mismatches
                    }
                  }}
                >
                  <SelectTrigger className="h-14 bg-muted border-border rounded-2xl focus:ring-primary">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span>{selectedCountry.flag}</span>
                        <span className="text-sm font-medium">{selectedCountry.code}</span>
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
                  className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg"
                />
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </div>
              <Input
                type="number"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                className="pl-12 h-14 bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary text-lg"
              />
            </div>
          )}

          <Button 
            onClick={handleNext}
            disabled={isLoading || (step === "phone" ? !isPhoneValid : otp.length < 6)}
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
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change number
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pb-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Secure • Private • Guarded
        </p>
      </div>
    </div>
  );
}
