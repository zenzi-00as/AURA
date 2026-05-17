"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MOCK_USERS: UserProfile[] = [
  {
    uid: "1",
    name: "Aarav",
    age: 22,
    bio: "Minimalist architect. Love digital art and late night coffee.",
    gender: "Man",
    orientation: "Gay",
    verificationStatus: "Verified",
    distance: "350 meters away",
    lastActive: new Date(),
    online: true,
  },
  {
    uid: "2",
    name: "Riyan",
    age: 24,
    bio: "Product designer from Berlin. Looking for meaningful conversations.",
    gender: "Non-binary",
    orientation: "Queer",
    verificationStatus: "Verified",
    distance: "1.4 km away",
    lastActive: new Date(),
    online: false,
  },
  {
    uid: "3",
    name: "Leo",
    age: 26,
    bio: "Jazz pianist. I appreciate good wine and better company.",
    gender: "Man",
    orientation: "Gay",
    verificationStatus: "Pending",
    distance: "2.8 km away",
    lastActive: new Date(),
    online: true,
  },
  {
    uid: "4",
    name: "Jordan",
    age: 23,
    bio: "Tech enthusiast. Always exploring new horizons.",
    gender: "Genderfluid",
    orientation: "Pansexual",
    verificationStatus: "Verified",
    distance: "5.2 km away",
    lastActive: new Date(),
    online: false,
  }
];

export default function Dashboard() {
  const [users] = useState<UserProfile[]>(MOCK_USERS);
  const [distance, setDistance] = useState([10]);
  const [ageRange, setAgeRange] = useState([18, 35]);

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-12 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl fuchsia-gradient flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Discovery</h1>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <SlidersHorizontal size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-[#1A181C] border-white/5 text-white rounded-t-[40px] px-8 pt-8 pb-12 outline-none">
            <SheetHeader className="mb-8">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold text-white">Discovery Filters</SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Maximum Distance</Label>
                  <span className="text-primary font-semibold text-sm">{distance[0]} km</span>
                </div>
                <Slider 
                  value={distance} 
                  onValueChange={setDistance} 
                  max={100} 
                  step={1}
                  className="py-4"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Age Range</Label>
                  <span className="text-primary font-semibold text-sm">{ageRange[0]} - {ageRange[1]}</span>
                </div>
                <Slider 
                  value={ageRange} 
                  onValueChange={setAgeRange} 
                  min={18}
                  max={80} 
                  step={1}
                  className="py-4"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button className="flex-1 h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20">
                  <Check className="mr-2" size={20} />
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="px-6 space-y-6 overflow-y-auto">
        <div className="px-2 pt-2 pb-1 flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-widest">
          <Sparkles size={14} />
          Verified Nearby
        </div>
        
        {users.map((user, idx) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
          >
            <AuraCard user={user} />
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
