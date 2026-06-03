"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Hash, ShieldCheck, Check, RefreshCcw, Loader2, Camera, Sparkles, CreditCard, Lock, ArrowLeft, Phone } from "lucide-react";
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
    phoneNumber: "",
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
        phoneNumber: formData.phoneNumber.trim(),
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
      batch.set(doc(db, "chatRooms", roomId), { id: roomId, participants: ["system", user.uid], lastMessage: "Welcome to AURA ❤️", lastTimestamp: serverTimestamp(), isSystem: true });
      batch.set(doc(collection(db, "chatRooms", roomId, "messages")), { senderId: "system", text: `Hey ${formData.name} 👋\nWelcome to AURA ❤️\n\nYour profile was successfully verified. You are now a Premium member.`, timestamp: serverTimestamp(), seen: false });
      batch.set(doc(collection(db, "notifications")), { userId: user.uid, title: "✅ Identity Verified", body: `Hi ${formData.name}, your profile is live and secure.`, type: "verification", timestamp: serverTimestamp(), read: false });

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
        const result = await selfieVerification({ photoDataUri: formData.documentPhoto, userName: formData.name, userDescription: formData.bio });
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
    } else if (step === 7) await finalizeProfile();
    else setStep(s => s + 1);
  };

  const isNextDisabled = isSubmitting || (step === 1 && (!formData.name.trim() || !formData.age || !formData.phoneNumber.trim())) || (step === 2 && !formData.bio.trim()) || (step === 3 && !formData.gender) || (step === 4 && !formData.orientation) || (step === 5 && formData.interestedIn.length === 0) || (step === 6 && !formData.documentPhoto);

  if (authLoading) return <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="flex-1 flex flex-col p-8 pt-10 bg-background min-h-screen max-w-md mx-auto relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1">{[1, 2, 3, 4, 5, 6, 7].map(s => <div key={s} className={cn("h-1 rounded-full transition-all duration-500", step >= s ? "w-6 bg-primary" : "w-3 bg-muted")} />)}</div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 7</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-5">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              {step === 1 ? "Basic Identity" : step === 2 ? "Your Bio" : step === 3 ? "Identity" : step === 4 ? "Orientation" : step === 5 ? "Preferences" : step === 6 ? "Selfie Guard" : "Aura Premium"}
            </h2>
            {step < 7 && (
              <button 
                onClick={handleBack} 
                className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-muted transition-colors"
              >
                <ArrowLeft size={12} />
                Back
              </button>
            )}
          </div>

          {step === 1 && <div className="space-y-4">
            <div className="space-y-2"><label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Name</label><div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg" /></div></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Phone</label><div className="relative"><Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Contact number" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg" /></div></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Age</label><div className="relative"><Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="number" min={18} max={80} placeholder="Your age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="pl-12 h-14 bg-muted border-border rounded-2xl text-lg" /></div></div>
          </div>}

          {step === 2 && <Textarea placeholder="Write about yourself..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="flex-1 min-h-[200px] bg-muted border-border rounded-2xl p-5 text-lg resize-none" />}
          {step === 3 && <GenderSelector selected={formData.gender} onSelect={(g) => setFormData({ ...formData, gender: g })} />}
          {step === 4 && <OrientationSelector gender={formData.gender} selected={formData.orientation} onSelect={(o) => setFormData({ ...formData, orientation: o })} />}
          {step === 5 && <InterestedInSelector selected={formData.interestedIn} onToggle={(i) => {
            setFormData(prev => {
              const exists = prev.interestedIn.includes(i);
              if (exists) return { ...prev, interestedIn: prev.interestedIn.filter(x => x !== i) };
              if (prev.interestedIn.length >= 2) return prev;
              return { ...prev, interestedIn: [...prev.interestedIn, i] };
            });
          }} />}
          
          {step === 6 && <div className="space-y-4">
            <div className="relative aspect-square max-h-[300px] w-full mx-auto rounded-[32px] overflow-hidden bg-black border-2 border-border aura-glow">
              {formData.documentPhoto ? <img src={formData.documentPhoto} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                {isCameraLoading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-x" />}
              </div>}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {!formData.documentPhoto && !isCameraLoading && <button onClick={captureSelfie} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border-4 border-white flex items-center justify-center mx-auto"><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center"><Camera className="text-primary" size={20} /></div></button>}
            {formData.documentPhoto && <Button variant="ghost" onClick={() => setFormData(prev => ({ ...prev, documentPhoto: null }))} className="mx-auto block text-[10px] font-bold uppercase tracking-widest"><RefreshCcw size={14} className="inline mr-2" />Retake</Button>}
          </div>}

          {step === 7 && <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-[22px] fuchsia-gradient aura-glow flex items-center justify-center mb-2"><Sparkles className="text-white" size={32} /></div>
            <div className="w-full p-6 rounded-[32px] border-primary/20 bg-primary/5 space-y-4">
              <h3 className="text-xl font-bold">₹ 1 / 28 Days</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Identity Verified Badge • Unlimited Messages • Secure Access</p>
            </div>
          </div>}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 pb-4">
        <Button onClick={nextStep} disabled={isNextDisabled} className="w-full h-14 rounded-2xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>
            {step === 7 ? <span>Subscribe - ₹ <strong>1 Only</strong></span> : step === 6 ? "Verify Selfie" : "Continue"}
            <ChevronRight size={20} />
          </>}
        </Button>
      </div>
    </div>
  );
}
