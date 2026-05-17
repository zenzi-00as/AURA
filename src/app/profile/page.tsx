"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Settings, LogOut, Shield, Heart, Pencil, Sparkles, Check, Info, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "Alex",
    age: 25,
    bio: "Designing spaces and digital experiences. Looking for genuine connections in the city.",
    gender: "Non-binary",
    orientation: "Queer"
  });

  const [tempProfile, setTempProfile] = useState({ ...profile });

  const handleSave = () => {
    setProfile(tempProfile);
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-4 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <h1 className="text-xl font-semibold tracking-tight text-white">{t('profile')}</h1>
        <button 
          onClick={() => router.push('/settings')}
          className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
        >
          <Settings size={18} />
        </button>
      </header>

      <div className="px-8 space-y-12">
        <div className="flex flex-col items-center text-center space-y-6 pt-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-[40px] bg-white/5 border-2 border-primary/20 flex items-center justify-center aura-glow">
              <span className="text-4xl font-bold text-white/20">ME</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center border-4 border-[#0C0B0D] shadow-lg">
              <BadgeCheck size={20} className="text-white" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-3xl font-semibold text-white">{profile.name}, {profile.age}</h2>
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
              <Shield size={12} />
              {t('identity_verified')}
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[40px] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
          
          <div className="space-y-4 relative">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('about_me')}</h3>
              
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <button 
                    onClick={() => setTempProfile({ ...profile })}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#1A181C] border-white/10 text-white rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-semibold">{t('edit_profile')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm font-light">
                      Update your bio and identity details.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bio</Label>
                      <Textarea 
                        value={tempProfile.bio}
                        onChange={(e) => setTempProfile({ ...tempProfile, bio: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] text-sm resize-none focus:ring-primary p-4"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('gender')}</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl h-11 flex items-center px-4 text-sm text-muted-foreground/60 cursor-not-allowed">
                          {profile.gender}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orientation')}</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl h-11 flex items-center px-4 text-sm text-muted-foreground/60 cursor-not-allowed">
                          {profile.orientation}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex flex-col gap-3 sm:flex-col pt-2">
                    <Button 
                      onClick={handleSave}
                      className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      {t('save_changes')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditing(false)}
                      className="w-full h-12 rounded-xl text-muted-foreground hover:text-white transition-colors"
                    >
                      {t('cancel')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-lg leading-relaxed text-white font-light">
              {profile.bio}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('gender')}</label>
              <div className="flex items-center gap-2 text-white">
                <Heart size={14} className="text-primary" />
                <span className="font-medium">{profile.gender}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('orientation')}</label>
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={14} className="text-primary" />
                <span className="font-medium">{profile.orientation}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => router.push('/about')}
            className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Info size={18} />
              </div>
              <span className="font-medium text-white">{t('about')}</span>
            </div>
            <div className="text-muted-foreground">→</div>
          </button>

          <button 
            onClick={() => router.push('/feedback')}
            className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare size={18} />
              </div>
              <span className="font-medium text-white">{t('feedback')}</span>
            </div>
            <div className="text-muted-foreground">→</div>
          </button>

          <button 
            onClick={() => router.push('/privacy-safety')}
            className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Shield size={18} />
              </div>
              <span className="font-medium text-white">{t('privacy_safety')}</span>
            </div>
            <div className="text-muted-foreground">→</div>
          </button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <LogOut size={18} />
                  </div>
                  <span className="font-medium text-white">{t('sign_out')}</span>
                </div>
                <div className="text-muted-foreground">→</div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1A181C] border-white/10 text-white rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-8">
              <AlertDialogHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                  <LogOut size={32} />
                </div>
                <div className="space-y-2 text-center">
                  <AlertDialogTitle className="text-2xl font-semibold">{t('sign_out')}</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                    Are you sure you want to sign out? You can log back in anytime with your registered phone number.
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col gap-3 pt-4 sm:flex-col">
                <AlertDialogAction 
                  onClick={() => router.push('/auth')}
                  className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20"
                >
                  {t('sign_out')}
                </AlertDialogAction>
                <AlertDialogCancel className="w-full h-12 rounded-xl bg-white/5 border-transparent text-muted-foreground hover:bg-white/10 hover:text-white transition-colors">
                  {t('cancel')}
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
