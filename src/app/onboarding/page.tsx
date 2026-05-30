
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Hash, ShieldCheck, Check, RefreshCcw, Loader2, Camera, Sparkles, CreditCard, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp, writeBatch, collection } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
  const { user: authUser, loading: authLoading } = useUser();
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !authUser) return null;
    return doc(db, "users", authUser.uid);
  }, [db, authUser]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef as any);

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
  const cameraInitializingRef = useRef(false);

  const ageNum = parseInt(formData.age);
  const isAgeInvalid = formData.age !== "" && (isNaN(ageNum) || ageNum < 18 || ageNum > 80);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraLoading(false);
    cameraInitializingRef.current = false;
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (stream || cameraInitializingRef.current) return;
    
    cameraInitializingRef.current = true;
    setIsCameraLoading(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(s);
    } catch (err) {
      console.error("Camera access failed:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Please allow camera access for verification.",
      });
    } finally {
      setIsCameraLoading(false);
      cameraInitializingRef.current = false;
    }
  }, [stream, toast]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  useEffect(() => {
    if (step === 6 && !formData.documentPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, formData.documentPhoto, startCamera, stopCamera]);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/auth");
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (profile && (profile as any).onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, documentPhoto: dataUri }));
        stopCamera();
      }
    }
  };

  const finalizeProfile = async () => {
    if (!db || !authUser) return;
    setIsSubmitting(true);
    
    const batch = writeBatch(db);
    const uid = authUser.uid;
    const userRef = doc(db, "users", uid);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28);

    const profileData = {
      uid,
      name: formData.name.trim(),
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

    const roomId = `system_${uid}`;
    const roomRef = doc(db, "chatRooms", roomId);
    batch.set(roomRef, {
      id: roomId,
      participants: ["system", uid],
      lastMessage: "Welcome to AURA ❤️",
      lastTimestamp: serverTimestamp(),
      isSystem: true
    });

    const messageRef = doc(collection(db, "chatRooms", roomId, "messages"));
    const dateStr = new Date().toLocaleDateString();
    const welcomeText = `Hey ${formData.name} 👋\nWelcome to AURA ❤️\n\nYour profile was successfully created and verified on ${dateStr}.\n\nYou are now an AURA Premium member (28-day access).\n\nStay respectful and enjoy your experience ✨`;
    
    batch.set(messageRef, {
      id: messageRef.id,
      senderId: "system",
      text: welcomeText,
      timestamp: serverTimestamp(),
      seen: false
    });

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      id: notifRef.id,
      userId: uid,
      title: "✅ Identity Verified",
      body: `Hi ${formData.name}, you are now a verified member of the Aura community. Your profile has received a trusted badge.`,
      type: "verification",
      timestamp: serverTimestamp(),
      read: false
    });

    const msgNotifRef = doc(collection(db, "notifications"));
    batch.set(msgNotifRef, {
      id: msgNotifRef.id,
      userId: uid,
      title: "AURA Team",
      body: "Welcome to AURA ❤️",
      type: "message",
      timestamp: serverTimestamp(),
      read: false
    });

    try {
      await batch.commit();
      router.replace("/dashboard");
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path, operation: 'write', requestResourceData: profileData
      }));
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
          toast({
            variant: "destructive",
            title: "Verification Denied",
            description: result.reason
          });
          setFormData(prev => ({ ...prev, documentPhoto: null }));
          setIsSubmitting(false);
          return;
        }

        setFormData(prev => ({ ...prev, verificationStatus: result.verificationStatus }));
        setStep(7);
      } catch (error) {
        console.error("Verification failed:", error);
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

  const prevStep = useCallback(() => {
    if (step === 1) {
      router.replace("/auth");
    } else {
      if (step === 6) stopCamera();
      setStep(s => s - 1);
    }
  }, [step, stopCamera, router]);

  const isNextDisabled = 
    isSubmitting || 
    (step === 1 && (!formData.name.trim() || !formData.age || isAgeInvalid)) || 
    (step === 2 && !formData.bio.trim()) || 
    (step === 3 && !formData.gender) || 
    (step === 4 && !formData.orientation) || 
    (step === 5 && formData.interestedIn.length === 0) || 
    (step === 6 && !formData.documentPhoto);

  return (
    <div className="flex-1 flex flex-col p-8 pt-10 relative overflow-hidden bg-background max-w-md mx-auto min-h-screen">
      {authLoading || profileLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-[32px] fuchsia-gradient aura-glow flex items-center justify-center mb-8 shadow-2xl shadow-primary/20">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
          <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Synchronizing Identity</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(s => (
                <div key={s} className={cn("h-1 rounded-full transition-all duration-500", step >= s ? "w-6 bg-primary" : "w-3 bg-muted")} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 7</span>
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
              <div className="flex justify-between items-start mb-5">
                <div className="space-y-1">
                  <h2 className="text-3xl font-semibold text-foreground tracking-tight">
                    {step === 1 && "What's your name?"}
                    {step === 2 && "Your Bio"}
                    {step === 3 && "Identity"}
                    {step === 4 && "Orientation"}
                    {step === 5 && "Interested In"}
                    {step === 6 && "Selfie Guard"}
                    {step === 7 && t('premium_subscription')}
                  </h2>
                  <p className="text-sm text-muted-foreground font-light">
                    {step === 1 && "It's nice to meet you. Aura is about real identity."}
                    {step === 2 && "Describe yourself to show your desires match."}
                    {step === 3 && "How do you identify? Aura celebrates the spectrum."}
                    {step === 4 && "Choose the orientation that best fits you."}
                    {step === 5 && "Who would you like to connect with? Choose up to 2."}
                    {step === 6 && "A live selfie ensures every profile is real."}
                    {step === 7 && t('premium_desc')}
                  </p>
                </div>
                {step < 7 && (
                  <button 
                    onClick={prevStep}
                    className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border px-3 py-1.5 rounded-xl hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft size={12} />
                    Back
                  </button>
                )}
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Name (Mandatory)</label>
                      <div className="relative group">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="Enter your name" 
                          value={formData.name} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                            setFormData({ ...formData, name: val });
                          }} 
                          className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg focus:ring-primary" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Age (Mandatory)</label>
                      <div className="relative group">
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="number" min={18} max={80} placeholder="Your age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg focus:ring-primary" />
                      </div>
                      {isAgeInvalid && <p className="text-[10px] px-4 text-destructive font-medium">Must be between 18 and 80</p>}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Bio (Mandatory)</label>
                  <Textarea 
                    placeholder="Write about your desires to know the reel feel's match with..." 
                    value={formData.bio} 
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                    className="flex-1 min-h-[200px] bg-muted border-border rounded-2xl p-5 text-lg resize-none focus:ring-primary" 
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Choose Gender (Mandatory)</label>
                   <GenderSelector 
                    selected={formData.gender} 
                    onSelect={(g) => setFormData({ ...formData, gender: g })}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Choose Orientation (Mandatory)</label>
                  <OrientationSelector 
                    gender={formData.gender}
                    selected={formData.orientation}
                    onSelect={(o) => setFormData({ ...formData, orientation: o })}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Preferences (Mandatory)</label>
                  <InterestedInSelector 
                    selected={formData.interestedIn}
                    onToggle={(i) => {
                      const isSelected = formData.interestedIn.includes(i);
                      if (!isSelected && formData.interestedIn.length >= 2) return;
                      setFormData(prev => {
                        const alreadySelected = prev.interestedIn.includes(i);
                        if (alreadySelected) return { ...prev, interestedIn: prev.interestedIn.filter(item => item !== i) };
                        return { ...prev, interestedIn: [...prev.interestedIn, i] };
                      });
                    }}
                  />
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className={cn(
                    "relative aspect-square max-h-[300px] w-full mx-auto rounded-[32px] overflow-hidden bg-black border-2 border-border aura-glow transition-all mb-2",
                    !formData.documentPhoto && "border-dashed"
                  )}>
                    {formData.documentPhoto ? (
                      <div className="relative w-full h-full">
                        <img src={formData.documentPhoto} alt="Selfie Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="bg-background/80 p-3 rounded-2xl shadow-xl flex items-center gap-2">
                            <Check className="text-primary" size={18} />
                            <span className="text-xs font-semibold">Selfie Captured</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                         {isCameraLoading ? (
                           <Loader2 className="w-6 h-6 text-primary animate-spin" />
                         ) : (
                           <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-x" />
                         )}
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="flex flex-col items-center gap-3 mt-auto">
                    {!formData.documentPhoto && !isCameraLoading && (
                      <button 
                        onClick={captureSelfie}
                        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border-4 border-white flex items-center justify-center shadow-2xl active:scale-95 transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                          <Camera className="text-primary" size={20} />
                        </div>
                      </button>
                    )}

                    {formData.documentPhoto && (
                      <Button variant="ghost" onClick={() => setFormData(prev => ({ ...prev, documentPhoto: null }))} className="h-10 text-[10px] font-bold uppercase tracking-widest gap-2">
                        <RefreshCcw size={14} /> Retake Selfie
                      </Button>
                    )}
                    <div className="w-full p-3 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                      <ShieldCheck size={16} className="text-primary shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-snug">Verification is mandatory to ensure every Aura profile is a real person.</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-6 flex-1 flex flex-col items-center justify-center py-4">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-[22px] fuchsia-gradient aura-glow flex items-center justify-center mb-2">
                    <Sparkles className="text-white" size={32} />
                  </motion.div>
                  <div className="w-full space-y-4">
                    <div className="p-6 rounded-[32px] border-primary/20 bg-primary/5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Premium Plan</p>
                          <h3 className="text-xl font-bold text-foreground">₹ 1 / 28 Days</h3>
                        </div>
                        <CreditCard className="text-primary" size={24} />
                      </div>
                      <div className="space-y-2 border-t border-primary/10 pt-4">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                          <Check size={14} className="text-primary" /> <span>Unlimited Private Messages</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                          <Check size={14} className="text-primary" /> <span>Advanced Identity Verified Badge</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                          <Check size={14} className="text-primary" /> <span>Secure Global Connections</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-2xl border border-border flex items-start gap-3">
                      <Lock size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground font-light leading-snug">Auto-pay enabled. Securely processed by Aura Identity Services. Cancel anytime in settings.</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 pb-4">
            <Button
              onClick={nextStep}
              disabled={isNextDisabled}
              className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {step === 7 ? (
                    <span>Subscribe - ₹ <strong className="font-bold">1 Only</strong></span>
                  ) : step === 6 ? "Verify Selfie" : "Continue"}
                  <ChevronRight size={20} />
                </>
              )}
            </Button>
            <p className="text-center text-[9px] text-muted-foreground uppercase tracking-widest mt-4 font-bold">Safe • Minimal • Real</p>
          </div>
        </>
      )}
    </div>
  );
}
