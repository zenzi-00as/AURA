"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Hash, ShieldCheck, ShieldAlert, Check, RefreshCcw, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { GenderSelector } from "@/components/onboarding/GenderSelector";
import { OrientationSelector } from "@/components/onboarding/OrientationSelector";
import { InterestedInSelector } from "@/components/onboarding/InterestedInSelector";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    orientation: "",
    interestedIn: [] as string[],
    age: "",
    documentPhoto: null as string | null
  });

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraLoading(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (stream) return; // Already running
    
    setIsCameraLoading(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 }
        } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      toast({
        variant: "destructive",
        title: "Camera Access Error",
        description: "Aura requires camera access for identity verification. Please check your browser permissions."
      });
    } finally {
      setIsCameraLoading(false);
    }
  }, [stream, toast]);

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

  const saveProfileToFirestore = async (uid: string, verificationStatus: string = 'Pending') => {
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
      verificationStatus,
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
        toast({ variant: "destructive", title: "Selfie required", description: "Please capture a live selfie to proceed." });
        return;
      }
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

        if (authUser) {
          await saveProfileToFirestore(authUser.uid, result.verificationStatus);
        }
      } catch (error) {
        console.error("Verification failed:", error);
        if (authUser) {
          await saveProfileToFirestore(authUser.uid, 'Pending');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const isNextDisabled = 
    isSubmitting || 
    (step === 1 && (!formData.name || !formData.age || parseInt(formData.age) < 18)) || 
    (step === 2 && !formData.bio) || 
    (step === 3 && !formData.gender) || 
    (step === 4 && !formData.orientation) || 
    (step === 5 && formData.interestedIn.length === 0) || 
    (step === 6 && !formData.documentPhoto);

  return (
    <div className="flex-1 flex flex-col p-8 pt-16 relative overflow-hidden bg-background max-w-md mx-auto min-h-screen">
      {authLoading || profileLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-[32px] fuchsia-gradient aura-glow flex items-center justify-center mb-8">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
          <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Synchronizing Identity</p>
        </div>
      ) : (
        <>
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
                    <h2 className="text-3xl font-semibold text-foreground tracking-tight">Selfie Guard</h2>
                    <p className="text-sm text-muted-foreground font-light">A live selfie ensures every profile is real.</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-6">
                    <div className={cn(
                      "relative aspect-square rounded-[40px] overflow-hidden bg-muted border-2 border-border aura-glow",
                      !formData.documentPhoto && "border-dashed"
                    )}>
                      {formData.documentPhoto ? (
                        <div className="relative w-full h-full">
                          <img src={formData.documentPhoto} alt="Selfie Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-background/80 p-4 rounded-2xl shadow-xl flex items-center gap-2">
                              <Check className="text-primary" size={20} />
                              <span className="text-sm font-semibold">Selfie Captured</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                           {isCameraLoading ? (
                             <div className="flex flex-col items-center gap-3">
                               <Loader2 className="w-8 h-8 text-primary animate-spin" />
                               <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Securing Access</span>
                             </div>
                           ) : (
                             <>
                               <video 
                                 ref={videoRef} 
                                 autoPlay 
                                 playsInline 
                                 muted 
                                 className="w-full h-full object-cover mirror-x" 
                               />
                               <div className="absolute inset-x-0 bottom-6 flex justify-center">
                                 <button 
                                   onClick={captureSelfie}
                                   className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                                 >
                                   <div className="w-10 h-10 rounded-full bg-white" />
                                 </button>
                               </div>
                             </>
                           )}
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <ShieldAlert size={18} className="text-primary mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wider">Liveness Check</p>
                          <p className="text-xs text-foreground font-medium leading-relaxed">
                            Gallery uploads are strictly prohibited. Our AI scans for face presence and capture liveness.
                          </p>
                        </div>
                      </div>
                    </div>

                    {formData.documentPhoto && (
                      <Button 
                        variant="ghost" 
                        onClick={() => setFormData(prev => ({ ...prev, documentPhoto: null }))}
                        className="w-full h-10 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <RefreshCcw size={14} />
                        Retake Selfie
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
              disabled={isNextDisabled}
              className="w-full h-16 rounded-3xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin-fast" />
              ) : (
                <>
                  {step === 6 ? "Complete Verification" : "Continue"}
                  <ChevronRight size={20} />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
