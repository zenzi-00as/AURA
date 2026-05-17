"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, ChevronRight, User, Hash, Sparkles, ShieldCheck } from "lucide-react";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";
import { useToast } from "@/hooks/use-toast";

const GENDER_OPTIONS = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman", 
  "Genderfluid", "Agender", "Queer", "Prefer not to say"
];

const ORIENTATION_OPTIONS = [
  "Gay", "Lesbian", "Bisexual", "Pansexual", "Queer", 
  "Asexual", "Straight", "Prefer not to say"
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    orientation: "",
    age: "",
    photo: null as string | null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Camera access denied", description: "Aura needs camera access for selfie verification." });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUri = canvasRef.current.toDataURL("image/jpeg");
      setFormData({ ...formData, photo: dataUri });
      setCameraActive(false);
      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 18) {
        toast({ variant: "destructive", title: "Age requirement", description: "You must be 18 years or older to join Aura." });
        return;
      }
    }

    if (step === 4 && formData.photo) {
      setLoading(true);
      try {
        const result = await selfieVerification({
          photoDataUri: formData.photo,
          userName: formData.name,
          userDescription: formData.bio
        });
        
        if (result.verificationStatus === 'Rejected') {
          toast({ variant: "destructive", title: "Verification Failed", description: result.reason });
          setFormData({ ...formData, photo: null });
          setStep(4);
        } else {
          router.push("/dashboard");
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Verification service currently unavailable." });
        router.push("/dashboard"); // Fallback for demo
      } finally {
        setLoading(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const isAgeValid = formData.age !== "" && parseInt(formData.age) >= 18;

  return (
    <div className="flex-1 flex flex-col p-8 pt-16 relative overflow-hidden bg-[#0C0B0D]">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "w-8 bg-primary" : "w-4 bg-white/10"}`} />
          ))}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 4</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-white">What's your name?</h2>
                <p className="text-muted-foreground">It's nice to meet you. Aura is about real identity.</p>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <Input
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-lg"
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Hash size={18} />
                </div>
                <Input
                  type="number"
                  placeholder="Your age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-lg"
                />
              </div>
              {formData.age !== "" && parseInt(formData.age) < 18 && (
                <p className="text-destructive text-xs font-medium px-1">Age must be 18+</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-white">A bit about you</h2>
                <p className="text-muted-foreground">Share your vibe. Keep it simple and real.</p>
              </div>
              <Textarea
                placeholder="Describe your desires to know more about you"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[160px] bg-white/5 border-white/10 rounded-2xl p-4 text-lg resize-none"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-white">Your Spectrum</h2>
                <p className="text-muted-foreground">Aura celebrates every identity.</p>
              </div>
              
              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFormData({ ...formData, gender: opt })}
                      className={`h-11 rounded-xl text-sm font-medium transition-all ${formData.gender === opt ? "fuchsia-gradient text-white shadow-lg shadow-primary/20" : "bg-white/5 border border-white/5 text-muted-foreground hover:border-white/20"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  {ORIENTATION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFormData({ ...formData, orientation: opt })}
                      className={`h-11 rounded-xl text-sm font-medium transition-all ${formData.orientation === opt ? "fuchsia-gradient text-white shadow-lg shadow-primary/20" : "bg-white/5 border border-white/5 text-muted-foreground hover:border-white/20"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-white">Selfie Guard</h2>
                <p className="text-muted-foreground">Verify your profile to keep the community safe and bot-free.</p>
              </div>
              
              <div className="relative aspect-square rounded-[40px] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                {formData.photo ? (
                  <img src={formData.photo} alt="Selfie" className="w-full h-full object-cover" />
                ) : cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                      <ShieldCheck size={40} />
                    </div>
                    <p className="text-sm text-muted-foreground">Verification is instant and private.</p>
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {!formData.photo ? (
                cameraActive ? (
                  <Button onClick={capturePhoto} className="w-full h-16 rounded-3xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20">
                    Capture Verification
                  </Button>
                ) : (
                  <Button onClick={startCamera} className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors">
                    <Camera className="mr-2" size={20} />
                    Open Camera
                  </Button>
                )
              ) : (
                <button onClick={() => setFormData({ ...formData, photo: null })} className="w-full text-center text-sm text-primary font-medium hover:underline">
                  Retake photo
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 pb-4">
        <Button
          onClick={nextStep}
          disabled={loading || (step === 1 && (!formData.name || !isAgeValid)) || (step === 2 && !formData.bio) || (step === 3 && (!formData.gender || !formData.orientation)) || (step === 4 && !formData.photo)}
          className="w-full h-16 rounded-3xl fuchsia-gradient text-white text-lg font-medium shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {step === 4 ? "Complete Verification" : "Continue"}
              <ChevronRight size={20} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
