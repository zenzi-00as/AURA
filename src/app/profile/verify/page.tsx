"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Shield, RefreshCcw, Trash2, Upload, ShieldCheck, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, initializeFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { cn } from "@/lib/utils";

export default function VerifyProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { storage, auth } = initializeFirebase();
  const { user, profile, loading: authLoading } = useAuthContext();
  
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setImageFile(file);
      setPreviewPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!db || !imageFile || !auth.currentUser) {
      if (!auth.currentUser && !authLoading) {
        toast({ 
          variant: "destructive", 
          title: "Authentication Required", 
          description: "Please sign in again to submit your verification." 
        });
        router.replace('/auth');
      }
      return;
    }

    const currentUser = auth.currentUser;
    setIsUploading(true);

    try {
      const fileName = `verification_${Date.now()}_${imageFile.name}`;
      const storageRef = ref(storage, `verifications/${currentUser.uid}/${fileName}`);
      await uploadBytes(storageRef, imageFile);

      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        verificationStatus: 'Pending',
        verification: {
          status: 'pending',
          imagePath: storageRef.fullPath,
          submittedAt: serverTimestamp(),
          reviewedAt: null,
          rejectionReason: null
        }
      });

      await addDoc(collection(db, "notifications"), {
        userId: currentUser.uid,
        title: "Verification Under Review",
        body: "Your identity verification request has been submitted for review.",
        type: "verification",
        timestamp: serverTimestamp(),
        read: false
      });

      toast({ title: "Submission Successful", description: "Your profile is now under review." });
      router.replace('/profile');
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast({ 
        variant: "destructive", 
        title: "Upload Failed", 
        description: error.message || "Failed to upload image. Please check your connection and try again." 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background min-h-screen pb-12 transition-colors">
        <header className="px-6 h-20 flex items-center gap-4 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Verify Your Profile</h1>
        </header>

        <div className="p-8 space-y-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-[24px] premium-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
              <Shield size={32} className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Identity Guard</h2>
              <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
                Upload a clear photo so we can verify that your profile belongs to you.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[40px] border border-white/10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="relative aspect-[3/4] w-full max-w-[240px] mx-auto rounded-3xl overflow-hidden glass border-2 border-white/10 shadow-2xl">
              {previewUrl ? (
                <div className="relative w-full h-full group">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
                    >
                      <RefreshCcw size={20} />
                    </button>
                    <button 
                      onClick={() => { setImageFile(null); setPreviewPreviewUrl(null); }} 
                      className="w-12 h-12 rounded-full bg-rose-500/20 backdrop-blur-md flex items-center justify-center text-rose-500"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Upload size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em]">Select Document</p>
                    <p className="text-[9px] text-white/20 font-light italic">Supports JPG, PNG, WEBP</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              {!previewUrl ? (
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl premium-gradient text-white font-bold text-sm tracking-widest uppercase shadow-xl shadow-primary/20"
                >
                  <Upload size={18} className="mr-3" />
                  {authLoading ? "Checking account..." : "Select Verification Photo"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[#00FF88] bg-[#00FF88]/5 py-3 rounded-xl border border-[#00FF88]/10">
                    <ShieldCheck size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Image Ready for Submission</span>
                  </div>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isUploading || authLoading}
                    className="w-full h-16 rounded-3xl premium-gradient text-white font-bold text-lg neon-glow flex items-center justify-center gap-3"
                  >
                    {authLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Verifying Account...</span>
                      </div>
                    ) : isUploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Uploading Documents...</span>
                      </div>
                    ) : (
                      <>
                        Submit Verification
                        <Shield size={20} />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted/30 p-6 rounded-[32px] border border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-white/60">
              <Info size={18} />
              <h4 className="text-[10px] font-bold uppercase tracking-widest">Privacy Guarantee</h4>
            </div>
            <p className="text-xs text-white/40 font-light leading-relaxed">
              Your verification image is encrypted and stored in a private vault. It will never be shown on your profile or shared with other members. Our safety team only uses it to confirm your identity.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}