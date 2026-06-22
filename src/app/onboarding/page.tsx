
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Hash, Loader2, Camera, Sparkles, ArrowLeft, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, initializeFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { doc, setDoc, serverTimestamp, writeBatch, collection } from "firebase/firestore";
import { GenderSelector } from "@/components/onboarding/GenderSelector";
import { OrientationSelector } from "@/components/onboarding/OrientationSelector";
import { InterestedInSelector } from "@/components/onboarding/InterestedInSelector";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";
import { useTranslation } from "@/context/LanguageContext";

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user, loading: authLoading, profile } = useAuthContext();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    orientation: "",
    interestedIn: [] as string[],
    age: "",
    documentPhoto: null as string | null,
    verificationStatus: 'Pending' as 'Verified' | 'Pending' | 'Rejected'
  });

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace('/auth');
    } else if (profile?.onboardingCompleted) {
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraLoading(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (stream) return;
    setIsCameraLoading(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Please allow camera access." });
    } finally {
      setIsCameraLoading(false);
    }
  }, [stream, toast]);

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (step === 6 && !formData.documentPhoto) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [step, formData.documentPhoto, startCamera, stopCamera]);

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFormData(prev => ({ ...prev, documentPhoto: canvas.toDataURL('image/jpeg', 0.8) }));
        stopCamera();
      }
    }
  };

  const handleBack = () => {
    if (step === 1) {
      const { auth } = initializeFirebase();
      auth.signOut().then(() => router.replace('/auth'));
    } else {
      setStep(s => s - 1);
    }
  };

  const finalizeProfile = async () => {
    if (!db || !user) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 28);

      const profileData = {
        uid: user.uid,
        name: formData.name.trim(),
        phoneNumber: "", 
        bio: formData.bio.trim(),
        gender: formData.gender,
        orientation: formData.orientation,
        interestedIn: formData.interestedIn,
        age: parseInt(formData.age),
        verificationStatus: formData.verificationStatus,
        subscriptionStatus: 'Active',
        subscriptionPrice: 1,
        subscriptionEndDate: endDate,
        photoUrl: formData.documentPhoto,
        lastActive: serverTimestamp(),
        isOnline: true,
        onboardingCompleted: true,
        welcomeSent: true,
        updatedAt: serverTimestamp()
      };

      batch.set(userRef, profileData, { merge: true });
      
      const roomId = `system_${user.uid}`;
      batch.set(doc(db, "chatRooms", roomId), {
        id: roomId,
        participants: ["system", user.uid],
        lastMessage: "Welcome to AURA ❤️",
        lastTimestamp: serverTimestamp(),
        isSystem: true
      });

      batch.set(doc(collection(db, "chatRooms", roomId, "messages")), {
        senderId: "system",
        text: `Hey ${formData.name} 👋\nWelcome to AURA ❤️\n\nYour profile was successfully verified. You are now a Premium member.`,
        timestamp: serverTimestamp(),
        seen: false
      });

      batch.set(doc(collection(db, "notifications")), {
        userId: user.uid,
        title: "✅ Identity Verified",
        body: `Hi ${formData.name}, your profile is live and secure.`,
        type: "verification",
        timestamp: serverTimestamp(),
        read: false
      });

      await batch.commit();
      router.replace("/dashboard");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save profile." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (step === 6) {
      if (!formData.documentPhoto) return;
      setIsSubmitting(true);
      try {
        const result = await selfieVerification({
          photoDataUri: formData.documentPhoto,
          userName: formData.name,
          userDescription: formData.bio
        });
        
        if (result.verificationStatus === 'Rejected') {
          toast({ variant: "destructive", title: "Verification Denied", description: result.reason });
          setFormData(prev => ({ ...prev, documentPhoto: null }));
        } else {
          setFormData(prev => ({ ...prev, verificationStatus: result.verificationStatus }));
          setStep(7);
        }
      } catch (error) {
        setFormData(prev => ({ ...prev, verificationStatus: 'Pending' }));
        setStep(7);
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 7) {
      await finalizeProfile();
    } else {
      setStep(s => s + 1);
    }
  };

  const ageVal = parseInt(formData.age);
  const isAgeValid = formData.age !== "" && ageVal >= 18 && ageVal <= 80;
  const isNameValid = formData.name.trim().length > 0;

  const isNextDisabled = isSubmitting || 
    (step === 1 && (!isNameValid || !isAgeValid)) || 
    (step === 2 && !formData.bio.trim()) || 
    (step === 3 && !formData.gender) || 
    (step === 4 && !formData.orientation) || 
    (step === 5 && formData.interestedIn.length === 0) || 
    (step === 6 && !formData.documentPhoto);

  if (authLoading || !user || profile?.onboardingCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen-safe">
        <div className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse shadow-xl shadow-primary/20 mb-6">
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const progressPercentage = Math.round((step / 7) * 100);

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen-safe relative overflow-hidden safe-top safe-bottom">
      <div className="px-8 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-1 flex-1">
            {[1, 2, 3, 4, 5, 6, 7].map(s => (
              <div key={s} className={cn("h-1 rounded-full transition-all duration-500 flex-1", step >= s ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4 shrink-0">
            Step {step} of 7 ({progressPercentage}% Complete)
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-full"
          >
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {step === 1 ? "Basic Identity" : 
                 step === 2 ? "Your Bio" : 
                 step === 3 ? "Identity" : 
                 step === 4 ? "Orientation" : 
                 step === 5 ? "Preferences" : 
                 step === 6 ? "Selfie Guard" : 
                 "Aura Premium"}
              </h2>
              {step < 7 && (
                <button 
                  onClick={handleBack} 
                  className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-muted transition-colors shrink-0"
                >
                  <ArrowLeft size={12} />
                  Back
                </button>
              )}
            </div>

            {step === 1 && (
              <div className="space-y-6 sm:space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">Name</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#B84DFF] transition-colors" />
                    <Input 
                      placeholder="Your name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^A-Za-z\s]/g, '') })} 
                      className="pl-12 h-14 bg-[#151515] border-white/12 rounded-2xl text-lg text-white placeholder:text-[#8A8A8A] focus:ring-[#B84DFF] focus:border-[#B84DFF] transition-all shadow-none focus:shadow-[0_0_20px_-5px_rgba(184,77,255,0.4)]" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">Age</label>
                  <div className="relative group">
                    <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#B84DFF] transition-colors" />
                    <Input 
                      type="number" 
                      placeholder="Your age" 
                      value={formData.age} 
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })} 
                      className={cn(
                        "pl-12 h-14 bg-[#151515] border-white/12 rounded-2xl text-lg text-white placeholder:text-[#8A8A8A] focus:ring-[#B84DFF] focus:border-[#B84DFF] transition-all focus:shadow-[0_0_20px_-5px_rgba(184,77,255,0.4)] shadow-none",
                        formData.age !== "" && (ageVal < 18 || ageVal > 80) && "border-destructive ring-destructive focus:shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]"
                      )} 
                    />
                  </div>
                  {formData.age !== "" && (ageVal < 18 || ageVal > 80) && (
                    <p className="text-destructive text-[10px] font-bold uppercase tracking-widest px-1">
                      Age must be 18 - 80
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">Bio</label>
                <Textarea 
                  placeholder="Share your desires and interests for the best match..." 
                  value={formData.bio} 
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                  className="flex-1 min-h-[160px] sm:min-h-[200px] bg-[#151515] border-white/12 rounded-2xl p-5 text-lg text-white placeholder:text-[#8A8A8A] focus:ring-[#B84DFF] focus:border-[#B84DFF] transition-all focus:shadow-[0_0_20px_-5px_rgba(184,77,255,0.4)] resize-none" 
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">Choose your identity</label>
                <GenderSelector 
                  selected={formData.gender} 
                  onSelect={(g) => setFormData({ ...formData, gender: g })} 
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">What is your orientation?</label>
                <OrientationSelector 
                  gender={formData.gender}
                  selected={formData.orientation} 
                  onSelect={(o) => setFormData({ ...formData, orientation: o })} 
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1">Who do you want to meet?</label>
                <InterestedInSelector 
                  selected={formData.interestedIn} 
                  onToggle={(i) => {
                    setFormData(prev => {
                      const exists = prev.interestedIn.includes(i);
                      if (exists) return { ...prev, interestedIn: prev.interestedIn.filter(x => x !== i) };
                      if (prev.interestedIn.length >= 2) return prev;
                      return { ...prev, interestedIn: [...prev.interestedIn, i] };
                    });
                  }} 
                />
              </div>
            )}
            
            {step === 6 && (
              <div className="space-y-6 flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-[#B84DFF] uppercase tracking-widest px-1 block text-center">Live Identity Verification</label>
                <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-[32px] overflow-hidden bg-black border-2 border-white/10 aura-glow shadow-[0_0_40px_-10px_rgba(184,77,255,0.2)]">
                  {formData.documentPhoto ? (
                    <img src={formData.documentPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isCameraLoading ? (
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-x" />
                      )}
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex flex-col items-center gap-4 mt-auto py-4">
                  {!formData.documentPhoto && !isCameraLoading && (
                    <button 
                      onClick={captureSelfie}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-xl border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <Camera className="text-[#B84DFF]" size={24} />
                      </div>
                    </button>
                  )}
                  
                  {formData.documentPhoto && (
                    <Button variant="ghost" onClick={() => setFormData(prev => ({ ...prev, documentPhoto: null }))} className="text-[10px] font-bold uppercase tracking-widest text-[#B84DFF] hover:bg-[#B84DFF]/10">
                      <RefreshCcw size={14} className="inline mr-2" />
                      Retake Identity Photo
                    </Button>
                  )}
                  
                  <p className="text-[10px] text-muted-foreground text-center font-medium leading-relaxed max-w-[200px]">
                    Your live photo is analyzed securely and is never shared with other users.
                  </p>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center py-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] fuchsia-gradient aura-glow flex items-center justify-center mb-2 shadow-2xl shadow-[#B84DFF]/30 shrink-0">
                  <Sparkles className="text-white" size={32} />
                </div>
                <div className="w-full p-6 sm:p-8 rounded-[40px] border-white/12 bg-[#151515] space-y-6 shadow-xl">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">₹ 1 <span className="text-sm font-normal text-muted-foreground">/ 28 Days</span></h3>
                    <p className="text-[10px] text-[#B84DFF] font-bold uppercase tracking-widest">Premium Membership</p>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground text-left">
                      <Check size={14} className="text-[#B84DFF] shrink-0" />
                      <span>Identity Verified Badge</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground text-left">
                      <Check size={14} className="text-[#B84DFF] shrink-0" />
                      <span>Unlimited Messages</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground text-left">
                      <Check size={14} className="text-[#B84DFF] shrink-0" />
                      <span>Stateless Secure Access</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-8 pt-2">
        <Button 
          onClick={nextStep}
          disabled={isNextDisabled}
          className="w-full h-14 sm:h-16 rounded-[24px] fuchsia-gradient text-white text-lg font-bold shadow-xl shadow-[#B84DFF]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>
            {step === 7 ? (
              <span>Join Aura - ₹ 1 Only</span>
            ) : step === 6 ? (
              "Verify Identity"
            ) : (
              "Continue"
            )}
            <ChevronRight size={20} />
          </>}
        </Button>
      </div>
    </div>
  );
}
