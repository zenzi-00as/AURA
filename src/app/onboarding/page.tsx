
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Hash, Loader2, Camera, ArrowLeft, RefreshCcw, Check, Home, MapPin, Image as ImageIcon, Trash2, ShieldCheck, Upload, Play, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, initializeFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { useCurrency } from "@/context/CurrencyContext";
import { doc, serverTimestamp, writeBatch, collection, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { GenderSelector } from "@/components/onboarding/GenderSelector";
import { OrientationSelector } from "@/components/onboarding/OrientationSelector";
import { InterestedInSelector } from "@/components/onboarding/InterestedInSelector";
import { useTranslation } from "@/context/LanguageContext";
import { triggerAiVerification } from "@/actions/verification";
import { CURRENT_TERMS_VERSION } from "@/lib/constants";

const POSITION_OPTIONS = ["Top", "Bottom", "Versatile", "Not specified"];
const ROOM_OPTIONS = ["Yes", "No"];

const ONBOARDING_WALLPAPERS = [
  "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)]",
  "bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_60%)]", 
  "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]", 
  "bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.15),transparent_60%)]", 
  "bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.1),transparent_70%)]", 
  "bg-[radial-gradient(circle_at_right,rgba(139,92,246,0.1),transparent_70%)]", 
  "bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1),transparent_80%)]", 
  "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_50%)]", 
  "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_70%)]", 
];

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const db = useFirestore();
  const { storage, auth } = initializeFirebase();
  const { user, loading: authLoading, profile, needsTermsAcceptance, isEmailVerified } = useAuthContext();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    orientation: "",
    interestedIn: [] as string[],
    position: "" as any,
    room: "" as any,
    age: "",
    profilePhoneNumber: "",
    location: null as { lat: number, lng: number } | null,
    verificationImage: null as File | null,
    verificationPreview: null as string | null,
    verificationStatus: 'not_submitted' as 'not_submitted' | 'pending' | 'approved' | 'rejected'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace('/auth');
      return;
    } 
    
    if (!isEmailVerified) {
      router.replace('/auth/verify-email');
      return;
    }

    if (needsTermsAcceptance) {
      router.replace('/auth/terms');
      return;
    }

    if (profile?.onboardingCompleted) {
      router.replace('/dashboard');
    }

    if (profile?.location && step === 1) {
      setStep(2);
    }
  }, [user, profile, authLoading, needsTermsAcceptance, isEmailVerified, router, step]);

  const handleLocationEnable = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Location Unavailable", description: "Your browser does not support geolocation." });
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setFormData(prev => ({ ...prev, location: loc }));
        
        if (db && user) {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              location: loc,
              updatedAt: serverTimestamp()
            });
            toast({ title: "Location Synchronized", description: "Proximity parameters calibrated." });
            setStep(2);
          } catch (e) {
            console.error("Location save error", e);
          }
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        setIsDetectingLocation(false);
        toast({ variant: "destructive", title: "Location Denied", description: "Enable location to discover people nearby." });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select a valid image." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Oversized File", description: "Image must be smaller than 10 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ 
        ...prev, 
        verificationImage: file, 
        verificationPreview: reader.result as string 
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleBack = () => {
    if (step === 1 || step === 2) {
      if (auth) auth.signOut().then(() => router.replace('/auth'));
    } else {
      setStep(s => s - 1);
    }
  };

  const finalizeProfile = async () => {
    if (!db || !auth?.currentUser) {
      if (!auth?.currentUser && !authLoading) {
        toast({ variant: "destructive", title: "Session Expired", description: "Please sign in again." });
        router.replace('/auth');
      }
      return;
    }
    
    const currentUser = auth.currentUser;

    const existingSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (existingSnap.exists() && existingSnap.data()?.onboardingCompleted) {
       router.replace("/dashboard");
       return;
    }

    setIsSubmitting(true);
    try {
      let verificationPath = "";
      if (formData.verificationImage && storage) {
        setIsUploading(true);
        const fileName = `verification_${Date.now()}_${formData.verificationImage.name}`;
        const storageRef = ref(storage, `verifications/${currentUser.uid}/${fileName}`);
        await uploadBytes(storageRef, formData.verificationImage);
        verificationPath = storageRef.fullPath;
        setIsUploading(false);
      }

      const batch = writeBatch(db);
      const userRef = doc(db, "users", currentUser.uid);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 28);

      const profileData = {
        uid: currentUser.uid,
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        gender: formData.gender,
        orientation: formData.orientation,
        interestedIn: formData.interestedIn,
        position: formData.position,
        room: formData.room,
        age: parseInt(formData.age),
        profilePhoneNumber: formData.profilePhoneNumber.trim(),
        verificationStatus: formData.verificationImage ? 'Pending' : 'not_submitted',
        verification: {
          status: formData.verificationImage ? 'pending' : 'not_submitted',
          imagePath: verificationPath,
          submittedAt: formData.verificationImage ? serverTimestamp() : null,
          reviewedAt: null,
          rejectionReason: null
        },
        subscriptionStatus: 'Active',
        subscriptionPrice: 1,
        subscriptionEndDate: endDate,
        photoUrl: profile?.photoUrl || `https://picsum.photos/seed/${currentUser.uid}/400/400`,
        lastActive: serverTimestamp(),
        isOnline: true,
        onboardingCompleted: true,
        welcomeSent: true,
        updatedAt: serverTimestamp(),
        termsAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
        termsAcceptedAt: profile?.termsAcceptedAt || serverTimestamp()
      };

      batch.set(userRef, profileData, { merge: true });
      
      const systemRoomId = `system_${currentUser.uid}`;
      batch.set(doc(db, "chatRooms", systemRoomId), {
        id: systemRoomId,
        participants: ["system", currentUser.uid],
        lastMessage: "Welcome to Aura ✨",
        lastTimestamp: serverTimestamp(),
        isSystem: true,
        unreadCount: {
          [currentUser.uid]: 1
        }
      });

      const msgRef = doc(collection(db, "chatRooms", systemRoomId, "messages"));
      batch.set(msgRef, {
        id: msgRef.id,
        senderId: "system",
        text: "Welcome to Aura ✨\n\nYour journey starts here. Meet authentically, stay private.",
        timestamp: serverTimestamp(),
        seen: false
      });

      await batch.commit();
      if (verificationPath) await triggerAiVerification(currentUser.uid);
      router.replace("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Synchronization Error", description: error.message });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const nextStep = async () => {
    if (step === 10) await finalizeProfile();
    else setStep(s => s + 1);
  };

  const ageVal = parseInt(formData.age);
  const isAgeValid = formData.age !== "" && ageVal >= 18 && ageVal <= 80;
  const isNameValid = formData.name.trim().length > 0;

  const isNextDisabled = authLoading || isSubmitting || isUploading ||
    (step === 1 && !formData.location) ||
    (step === 2 && (!isNameValid || !isAgeValid)) || 
    (step === 3 && !formData.bio.trim()) || 
    (step === 4 && !formData.gender) || 
    (step === 5 && !formData.orientation) || 
    (step === 6 && formData.interestedIn.length === 0) || 
    (step === 7 && (!formData.position || !formData.room)) ||
    (step === 8 && !formData.profilePhoneNumber.trim());

  if (authLoading || !user || profile?.onboardingCompleted || !isEmailVerified || needsTermsAcceptance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-background">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="w-24 h-24 rounded-[32px] premium-gradient flex items-center justify-center neon-glow shadow-2xl mb-8">
          <span className="text-4xl font-bold text-white tracking-tighter">A</span>
        </motion.div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Synchronizing Identity</p>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round((step / 10) * 100);

  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden safe-top safe-bottom">
      <div className={cn("absolute inset-0 z-0 transition-all duration-1000", ONBOARDING_WALLPAPERS[step - 1])} />

      <header className="h-14 relative z-10 flex items-center px-8">
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-1.5 flex-1 max-w-[180px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
              <div key={`onboard-step-${s}`} className={cn("h-1 rounded-full transition-all duration-700 flex-1", step >= s ? "bg-primary neon-glow" : "bg-white/10")} />
            ))}
          </div>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.1em] ml-4 shrink-0">{progressPercentage}%</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-2 scrollbar-hide relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`onboard-stage-${step}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-full"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {step === 1 ? "Enable Location" : 
                   step === 2 ? "Identity" : 
                   step === 3 ? "Aura Bio" : 
                   step === 4 ? "Gender" : 
                   step === 5 ? "Orientation" : 
                   step === 6 ? "Preferences" :
                   step === 7 ? "Dynamics" : 
                   step === 8 ? "Contact" :
                   step === 9 ? "Identity Guard" : 
                   "Aura Elite"}
                </h2>
                <p className="text-[10px] text-white/40 font-light uppercase tracking-widest">Step {step} of 10</p>
              </div>
              {step > 1 && (
                <button onClick={handleBack} className="mt-1 w-8 h-8 rounded-full glass flex items-center justify-center text-white/60"><ArrowLeft size={16} /></button>
              )}
            </div>

            {step === 1 && (
              <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-[32px] bg-primary/20 flex items-center justify-center text-primary mb-6 animate-pulse"><MapPin size={48} /></div>
                <h3 className="text-2xl font-bold text-white">Enable your location</h3>
                <p className="text-sm text-white/40 max-w-[260px]">Find people nearby and discover connections around you.</p>
                <div className="w-full pt-8 space-y-3">
                   <Button onClick={handleLocationEnable} disabled={isDetectingLocation} className="w-full h-16 rounded-[24px] blue-gradient text-white font-bold shadow-xl">
                     {isDetectingLocation ? <Loader2 className="animate-spin" /> : "Enable Location →"}
                   </Button>
                   <button onClick={() => setStep(2)} className="text-[10px] font-bold text-white/20 uppercase tracking-widest py-2 w-full">Skip for now</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Display Name</label>
                  <div className="relative glass rounded-xl p-0.5"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" /><Input placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-12 h-12 bg-transparent border-none text-base text-white focus:ring-0 shadow-none" /></div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Age</label>
                  <div className="relative glass rounded-xl p-0.5"><Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" /><Input type="number" placeholder="Your age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="pl-12 h-12 bg-transparent border-none text-base text-white focus:ring-0 shadow-none" /></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 flex-1 flex flex-col">
                <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Describe your presence</label>
                <div className="flex-1 glass rounded-2xl p-0.5"><Textarea placeholder="Share your desires and interests..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="h-full bg-transparent border-none p-4 text-base text-white focus:ring-0 resize-none shadow-none" /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Select Identity</label>
                <GenderSelector selected={formData.gender} onSelect={(g) => setFormData({ ...formData, gender: g })} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Define Orientation</label>
                <OrientationSelector gender={formData.gender} selected={formData.orientation} onSelect={(o) => setFormData({ ...formData, orientation: o })} />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Attraction</label>
                <InterestedInSelector selected={formData.interestedIn} onToggle={(i) => {
                  setFormData(prev => {
                    const exists = prev.interestedIn.includes(i);
                    if (exists) return { ...prev, interestedIn: prev.interestedIn.filter(x => x !== i) };
                    if (prev.interestedIn.length >= 2) return prev;
                    return { ...prev, interestedIn: [...prev.interestedIn, i] };
                  });
                }} />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Dynamic Position</label>
                  <div className="grid grid-cols-1 gap-2">
                    {POSITION_OPTIONS.map((opt) => (
                      <button key={`pos-${opt}`} onClick={() => setFormData({ ...formData, position: opt })} className={cn("h-12 px-5 rounded-xl text-sm transition-all flex items-center justify-between border", formData.position === opt ? "premium-gradient text-white border-transparent" : "glass border-white/10 text-white/80")}>
                        {opt}{formData.position === opt && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">hosting preference</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROOM_OPTIONS.map((opt) => (
                      <button key={`room-${opt}`} onClick={() => setFormData({ ...formData, room: opt })} className={cn("h-12 px-5 rounded-xl text-sm transition-all flex items-center justify-center border gap-2", formData.room === opt ? "premium-gradient text-white border-transparent" : "glass border-white/10 text-white/80")}>
                        {opt === "Yes" ? <Home size={16} /> : <MapPin size={16} />}{opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] px-1">Phone Number</label>
                  <p className="text-[10px] text-white/40 mb-2">Used for profile contact only. Not for authentication.</p>
                  <div className="relative glass rounded-xl p-0.5">
                    <Input placeholder="+1 000 000 0000" value={formData.profilePhoneNumber} onChange={(e) => setFormData({ ...formData, profilePhoneNumber: e.target.value })} className="h-12 bg-transparent border-none text-base text-white focus:ring-0 shadow-none" />
                  </div>
                </div>
              </div>
            )}
            
            {step === 9 && (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="glass-card p-6 rounded-[32px] border border-white/10 space-y-6 text-center">
                  <h3 className="text-lg font-bold text-white">Identity Guard</h3>
                  <div className="relative aspect-[4/5] w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden glass border-2 border-white/10 shadow-2xl">
                    {formData.verificationPreview ? (
                      <img src={formData.verificationPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4"><div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Upload size={24} /></div><p className="text-[10px] text-white/30 uppercase tracking-[0.1em]">No image</p></div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} className="h-12 rounded-xl glass border-white/10 text-white/80"><ImageIcon size={18} className="mr-2" />Select Photo</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 10 && (
              <div className="space-y-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-[28px] premium-gradient neon-glow flex items-center justify-center mb-2 shadow-2xl"><Sparkles className="text-white" size={32} /></div>
                <div className="w-full p-8 rounded-[32px] glass border-white/10 space-y-6">
                  <h3 className="text-3xl font-bold text-white tracking-tighter">{formatPrice(1)} <span className="text-xs font-normal text-white/40">/ 28 Days</span></h3>
                  <p className="text-[9px] font-bold text-primary uppercase tracking-[0.3em]">AURA ELITE ACCESS</p>
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    {["Identity Verified Badge", "Unlimited Messages", "Priority Discovery Stage"].map((feature, i) => (
                      <div key={`elite-feat-${i}`} className="flex items-center gap-3 text-xs text-white/60 text-left"><div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0"><Check size={10} strokeWidth={3} /></div><span>{feature}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-8 pt-2 relative z-10 flex flex-col gap-4">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextStep}
          disabled={isNextDisabled}
          className={cn("w-full h-14 rounded-2xl premium-gradient text-white text-lg font-bold neon-glow transition-all flex items-center justify-center gap-3", isNextDisabled && "opacity-40 grayscale")}
        >
          {isSubmitting || isUploading ? <Loader2 className="animate-spin" /> : <><span>{step === 10 ? "Join Elite" : "Proceed"}</span><ChevronRight size={20} /></>}
        </motion.button>
      </div>
    </div>
  );
}
