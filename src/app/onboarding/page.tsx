
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ChevronRight, User, Hash, ShieldCheck, Upload, ShieldAlert, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { GenderSelector } from "@/components/onboarding/GenderSelector";
import { OrientationSelector } from "@/components/onboarding/OrientationSelector";
import { InterestedInSelector } from "@/components/onboarding/InterestedInSelector";

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser, loading: authLoading } = useUser();
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return doc(db, "users", authUser.uid);
  }, [db, authUser]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef as any);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    orientation: "",
    interestedIn: [] as string[],
    age: "",
    documentPhoto: null as string | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/auth");
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (profile && profile.onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a document smaller than 5MB."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, documentPhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfileToFirestore = async (uid: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    const profileData = {
      uid,
      name: formData.name,
      bio: formData.bio,
      gender: formData.gender,
      orientation: formData.orientation,
      interestedIn: formData.interestedIn,
      age: parseInt(formData.age),
      verificationStatus: 'Pending',
      photoUrl: formData.documentPhoto,
      lastActive: serverTimestamp(),
      isOnline: true,
      onboardingCompleted: true,
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userRef, profileData, { merge: true });
      router.replace("/dashboard");
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path, operation: 'write', requestResourceData: profileData
      }));
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 18) {
        toast({ variant: "destructive", title: "Age requirement", description: "You must be 18+ to join Aura." });
        return;
      }
      if (!formData.name.trim()) {
        toast({ variant: "destructive", title: "Name required", description: "Please enter your name." });
        return;
      }
    }

    if (step === 6) {
      if (!formData.documentPhoto) {
        toast({ variant: "destructive", title: "Document required", description: "Please upload a document for verification." });
        return;
      }
      setLoading(true);
      if (authUser) {
        await saveProfileToFirestore(authUser.uid);
      }
      setLoading(false);
    } else {
      setStep(s => s + 1);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
        <div className="w-24 h-24 rounded-[32px] fuchsia-gradient aura-glow flex items-center justify-center mb-8">
          <span className="text-4xl font-bold text-white">A</span>
        </div>
        <div className="flex flex-col items-center gap-6">
          <p className="text-muted-foreground font-light tracking-[0.3em] uppercase text-[10px] text-center">
            Minimalist • Private • Real
          </p>
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 pt-16 relative overflow-hidden bg-background max-w-md mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className={cn("h-1 rounded-full transition-all duration-500", step >= s ? "w-6 bg-primary" : "w-3 bg-muted")} />
          ))}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 6</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">What's your name?</h2>
                <p className="text-sm text-muted-foreground font-light">It's nice to meet you. Aura is about real identity.</p>
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Enter your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg focus:ring-primary" />
                </div>
                <div className="relative group">
                  <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="number" placeholder="Your age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg focus:ring-primary" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Your Bio</h2>
                <p className="text-sm text-muted-foreground font-light">Describe yourself to show your desires match with...</p>
              </div>
              <Textarea 
                placeholder="Write a few lines..." 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                className="min-h-[200px] bg-muted border-border rounded-2xl p-5 text-lg resize-none focus:ring-primary" 
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Identity</h2>
                <p className="text-sm text-muted-foreground font-light">How do you identify? Aura celebrates the spectrum.</p>
              </div>
              <GenderSelector 
                selected={formData.gender} 
                onSelect={(g) => setFormData({ ...formData, gender: g })}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Orientation</h2>
                <p className="text-sm text-muted-foreground font-light">Choose the orientation that best fits you.</p>
              </div>
              <OrientationSelector 
                gender={formData.gender}
                selected={formData.orientation}
                onSelect={(o) => setFormData({ ...formData, orientation: o })}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Interested In</h2>
                <p className="text-sm text-muted-foreground font-light">Who would you like to connect with? Choose up to 2.</p>
              </div>
              <InterestedInSelector 
                selected={formData.interestedIn}
                onToggle={(i) => {
                  const isSelected = formData.interestedIn.includes(i);
                  if (!isSelected && formData.interestedIn.length >= 2) {
                    toast({
                      title: "Selection Limit",
                      description: "You can select a maximum of 2 categories.",
                    });
                    return;
                  }
                  
                  setFormData(prev => {
                    const alreadySelected = prev.interestedIn.includes(i);
                    if (alreadySelected) {
                      return { ...prev, interestedIn: prev.interestedIn.filter(item => item !== i) };
                    }
                    return { ...prev, interestedIn: [...prev.interestedIn, i] };
                  });
                }}
              />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-3xl font-semibold text-foreground tracking-tight">Identity Verification</h2>
                <p className="text-sm text-muted-foreground font-light">Upload a valid document to verify your identity.</p>
              </div>
              
              <div className="flex-1 flex flex-col gap-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square rounded-[40px] overflow-hidden bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all hover:border-primary/50",
                    formData.documentPhoto && "border-solid border-primary/20"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,.pdf" 
                    className="hidden" 
                  />
                  
                  {formData.documentPhoto ? (
                    <div className="relative w-full h-full">
                      <img src={formData.documentPhoto} alt="Document Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-background/80 p-4 rounded-2xl shadow-xl flex items-center gap-2">
                          <Check className="text-primary" size={20} />
                          <span className="text-sm font-semibold">Document Selected</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                        <Upload size={28} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Tap to upload document</p>
                        <p className="text-xs text-muted-foreground">ID Card, Driver's License or Passport</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <ShieldAlert size={18} className="text-primary mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wider">Verification Requirement</p>
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        The name on your document must exactly match your profile name: <span className="text-primary font-bold">"{formData.name}"</span>
                      </p>
                    </div>
                  </div>
                </div>

                {formData.documentPhoto && (
                  <Button 
                    variant="ghost" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 text-muted-foreground hover:text-foreground text-xs font-bold"
                  >
                    Replace document
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 pb-4">
        <Button
          onClick={nextStep}
          disabled={
            loading || 
            (step === 1 && (!formData.name || !formData.age || parseInt(formData.age) < 18)) || 
            (step === 2 && !formData.bio) || 
            (step === 3 && !formData.gender) || 
            (step === 4 && !formData.orientation) || 
            (step === 5 && formData.interestedIn.length === 0) || 
            (step === 6 && !formData.documentPhoto)
          }
          className="w-full h-16 rounded-3xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin-fast" />
          ) : (
            <>
              {step === 6 ? "Complete Verification" : "Continue"}
              <ChevronRight size={20} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
