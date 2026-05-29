
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ChevronRight, User, Hash, ShieldCheck, RefreshCcw, ShieldAlert } from "lucide-react";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";
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
    photo: null as string | null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

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

  // Smart Pre-selection Logic for Interests
  useEffect(() => {
    if (!formData.gender || !formData.orientation) return;

    const isMan = ["Man", "Trans Man"].includes(formData.gender);
    const isWoman = ["Woman", "Trans Woman"].includes(formData.gender);
    const o = formData.orientation;
    
    let suggested: string[] = [];

    if (isMan) {
      if (o === "Gay") suggested = ["Man", "Trans Man"];
      else if (o === "Straight") suggested = ["Woman", "Trans Woman"];
    } else if (isWoman) {
      if (o === "Lesbian") suggested = ["Woman", "Trans Woman"];
      else if (o === "Straight") suggested = ["Man", "Trans Man"];
    }

    if (suggested.length > 0) {
      setFormData(prev => ({ ...prev, interestedIn: suggested }));
    }
  }, [formData.gender, formData.orientation]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices) return;
    
    try {
      if (streamRef.current) stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", 
          width: { ideal: 512 }, 
          height: { ideal: 512 } 
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      toast({ 
        variant: "destructive", 
        title: "Camera access denied", 
        description: "Aura needs camera access for identity verification. Please enable it in your browser settings." 
      });
    }
  }, [stopCamera, toast]);

  useEffect(() => {
    if (step === 6 && !formData.photo && !cameraActive && !loading) {
      startCamera();
    }
    return () => stopCamera();
  }, [step, formData.photo, cameraActive, startCamera, stopCamera, loading]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      const video = videoRef.current;
      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      
      canvasRef.current.width = 512;
      canvasRef.current.height = 512;
      
      if (context) {
        context.translate(512, 0);
        context.scale(-1, 1);
        context.drawImage(video, startX, startY, size, size, 0, 0, 512, 512);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
        setFormData(prev => ({ ...prev, photo: dataUrl }));
        stopCamera();
      }
    }
  };

  const saveProfileToFirestore = async (uid: string, verificationStatus: string) => {
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
      photoUrl: formData.photo,
      lastActive: serverTimestamp(),
      isOnline: true,
      onboardingCompleted: true,
      updatedAt: serverTimestamp()
    };

    setDoc(userRef, profileData, { merge: true })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path, operation: 'write', requestResourceData: profileData
        }));
      });
  };

  const nextStep = async () => {
    if (step === 1) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 18) {
        toast({ variant: "destructive", title: "Age requirement", description: "You must be 18+ to join Aura." });
        return;
      }
    }

    if (step === 6) {
      if (!formData.photo) {
        toast({ variant: "destructive", title: "Photo required", description: "Please capture a selfie for verification." });
        return;
      }
      setLoading(true);
      try {
        const result = await selfieVerification({
          photoDataUri: formData.photo,
          userName: formData.name,
          userDescription: formData.bio
        });
        
        if (result.verificationStatus === 'Rejected') {
          toast({ variant: "destructive", title: "Verification Failed", description: result.reason });
          setFormData(prev => ({ ...prev, photo: null }));
          startCamera();
          setLoading(false);
        } else {
          if (authUser) {
            await saveProfileToFirestore(authUser.uid, result.verificationStatus);
            router.replace("/dashboard");
          }
        }
      } catch (e) {
        console.error("Verification error:", e);
        if (authUser) {
          await saveProfileToFirestore(authUser.uid, 'Pending');
          router.replace("/dashboard");
        }
      }
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
                  // Check limit BEFORE updating state to avoid render-phase side effects
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
              <div className="relative aspect-square rounded-[40px] overflow-hidden bg-muted border border-border aura-glow shadow-2xl">
                {formData.photo ? (
                  <motion.img initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={formData.photo} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover scale-x-[-1]", !cameraActive && "hidden")} />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Waking Secure Camera</p>
                      </div>
                    )}
                  </>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin-fast" />
                    <p className="text-sm font-bold text-foreground">AI Identity Check...</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 mt-6">
                {!formData.photo ? (
                  <Button onClick={capturePhoto} disabled={!cameraActive || loading} className="w-full h-16 rounded-3xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20">
                    <Camera className="mr-2" size={20} /> Capture Selfie
                  </Button>
                ) : (
                  <button onClick={() => { setFormData({ ...formData, photo: null }); startCamera(); }} disabled={loading} className="w-full h-12 flex items-center justify-center gap-2 text-sm text-foreground font-bold hover:underline">
                    <RefreshCcw size={16} /> Retake photo
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <ShieldAlert size={18} className="text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Gallery uploads are strictly prohibited. Our AI scans for face presence and capture liveness.</p>
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
            (step === 6 && !formData.photo)
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
