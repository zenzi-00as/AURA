"use client";

import { motion } from "framer-motion";
import { BottomNav } from "@/components/aura/BottomNav";
import { BadgeCheck, Settings, LogOut, Shield, MapPin, Heart, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-12 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20">
        <h1 className="text-xl font-semibold tracking-tight text-white">Profile</h1>
        <button className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
          <Settings size={18} />
        </button>
      </header>

      <div className="px-8 space-y-12">
        {/* Identity Section */}
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
            <h2 className="text-3xl font-semibold text-white">Alex, 25</h2>
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
              <Shield size={12} />
              Identity Verified
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="glass-card p-8 rounded-[40px] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
          
          <div className="space-y-4 relative">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">About Me</h3>
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                <Pencil size={14} />
              </button>
            </div>
            <p className="text-lg leading-relaxed text-white font-light">
              Designing spaces and digital experiences. Looking for genuine connections in the city.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gender</label>
              <div className="flex items-center gap-2 text-white">
                <Heart size={14} className="text-primary" />
                <span className="font-medium">Non-binary</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Orientation</label>
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={14} className="text-primary" />
                <span className="font-medium">Queer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Shield size={18} />
              </div>
              <span className="font-medium text-white">Privacy & Safety</span>
            </div>
            <div className="text-muted-foreground">→</div>
          </button>
          
          <button className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 px-8 flex items-center justify-between group hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <LogOut size={18} />
              </div>
              <span className="font-medium text-white">Sign Out</span>
            </div>
            <div className="text-muted-foreground">→</div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
