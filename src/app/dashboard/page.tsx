"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { NativeAdCard } from "@/components/aura/NativeAdCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { SuperFundPrompt } from "@/components/aura/SuperFundPrompt";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Search, Loader2, Shield, Globe, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { useAuthContext } from "@/firebase/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getPlanConfig } from "@/lib/subscription-engine";
import { UpgradeModal } from "@/components/aura/UpgradeModal";
import { getDiscoveryNodes, updateLocationGeohash } from "@/actions/discovery";
import { cn } from "@/lib/utils";

const DEMO_USERS: UserProfile[] = [
  {
    uid: "aura-demo-1",
    name: "Julian",
    age: 26,
    bio: "Architectural photographer exploring hidden city nodes. Passionate about minimalism and ambient vinyl sets.",
    gender: "Man",
    orientation: "Gay",
    interestedIn: ["Men"],
    photoUrl: "https://picsum.photos/seed/aura_demo_1/400/500",
    isOnline: true,
    verificationStatus: "Verified",
    lastActive: new Date(),
    onboardingCompleted: true,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false,
    superLikeBalance: 0
  },
  {
    uid: "aura-demo-2",
    name: "Sasha",
    age: 24,
    bio: "Digital artist focusing on queer futurism. Let's talk about the intersection of tech and identity.",
    gender: "Non-binary",
    orientation: "Queer",
    interestedIn: ["Anyone"],
    photoUrl: "https://picsum.photos/seed/aura_demo_2/400/500",
    isOnline: true,
    verificationStatus: "Verified",
    lastActive: new Date(),
    onboardingCompleted: true,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false,
    superLikeBalance: 0
  }
];

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile: currentUserProfile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [distance, setDistance] = useState([planConfig.searchRadiusKm]);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: 'elite' | 'elite_plus', feature: string} | null>(null);
  
  const [activeFilters, setActiveFilters] = useState({
    distance: planConfig.searchRadiusKm,
    ageRange: [18, 35]
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCurrentLocation(loc);
          if (currentUserProfile?.uid) {
            updateLocationGeohash(currentUserProfile.uid, loc.lat, loc.lng);
          }
        },
        (error) => console.log("Location access denied")
      );
    }
  }, [currentUserProfile?.uid]);

  useEffect(() => {
    if (currentLocation && currentUserProfile) {
      setIsLoading(true);
      getDiscoveryNodes(currentUserProfile.uid, currentLocation.lat, currentLocation.lng, activeFilters.distance)
        .then(res => {
          setDiscoveryResults(res as UserProfile[]);
          setIsLoading(false);
        });
    } else {
      // Small timeout for demo visual synchronization
      setTimeout(() => setIsLoading(false), 1200);
    }
  }, [currentLocation, currentUserProfile, activeFilters]);

  const discoveryItems = useMemo(() => {
    const items: Array<{ type: 'user'; data: UserProfile } | { type: 'ad' }> = [];
    
    // Combine discovery results with demo fallback if empty
    const baseResults = discoveryResults.length > 0 ? discoveryResults : DEMO_USERS;

    baseResults.forEach((user, index) => {
      items.push({ type: 'user', data: user });
      // Inject ads at standard intervals for free/lite users
      if (planConfig.ads !== 'none' && (index + 1) % 5 === 0) {
        items.push({ type: 'ad' });
      }
    });
    return items;
  }, [discoveryResults, planConfig.ads]);

  const handleDistanceChange = (val: number[]) => {
    if (val[0] > planConfig.searchRadiusKm) {
      setUpgradeModal({ isOpen: true, plan: effectivePlan === 'free' ? 'elite' : 'elite_plus', feature: 'Search Radius' });
    } else {
      setDistance(val);
    }
  };

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col min-h-screen-safe bg-[#05070D] relative transition-colors overflow-hidden">
        {/* Support Onboarding Prompt */}
        <SuperFundPrompt />

        <header className="px-4 h-20 flex justify-between items-center sticky top-0 bg-[#080A10E0] backdrop-blur-[18px] z-20 border-b border-white/5 safe-top">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl blue-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">{t('discovery')}</h1>
              <div className="flex items-center gap-1 mt-1 opacity-40">
                <Shield size={10} className="text-primary" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-white">AI Guard Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/super-fund')} 
              className="h-10 px-5 rounded-full premium-gradient border-2 border-primary flex items-center gap-2 group transition-all shadow-[0_0_10px_rgba(0,87,255,0.15)] active:scale-95"
            >
              <Sparkles size={16} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest hidden sm:block">Support</span>
            </button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                  <SlidersHorizontal size={18} />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#05070D] text-white rounded-t-[40px] px-8 pt-10 pb-12 outline-none border-t border-white/10">
                <SheetHeader className="mb-8"><SheetTitle className="text-2xl font-bold">Discovery Filters</SheetTitle></SheetHeader>
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Max Radius</Label>
                      <span className="text-primary font-bold text-sm">{distance[0]} km</span>
                    </div>
                    <Slider value={distance} onValueChange={handleDistanceChange} max={100} step={1} />
                  </div>
                  <Button onClick={() => { setActiveFilters({ distance: distance[0], ageRange }); setIsOpen(false); }} className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg shadow-xl shadow-primary/20">
                    Apply Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-6 pb-32 relative z-10">
          {/* Dashboard Hero / Welcome Node */}
          <div className="px-2 mb-4">
             <div className="p-4 rounded-[28px] glass-card border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                <div className="relative z-10">
                   <div className="flex gap-4">
                      <div className="space-y-1">
                         <div className="flex items-center gap-1.5 text-primary">
                            <Users size={16} />
                            <span className="text-lg font-black uppercase tabular-nums tracking-widest">1,240</span>
                         </div>
                         <p className="text-[7px] text-white/30 uppercase font-bold tracking-[0.2em]">Active Members</p>
                      </div>
                      <div className="space-y-1">
                         <div className="flex items-center gap-1.5 text-[#00FF88]">
                            <Globe size={16} />
                            <span className="text-lg font-black uppercase tabular-nums tracking-widest">Global Sync</span>
                         </div>
                         <p className="text-[7px] text-white/30 uppercase font-bold tracking-[0.2em]">Healthy Node</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="px-2 mb-4">
             <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary" />
               Latest Connections
             </h3>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Synchronizing Auras...</p>
              </div>
            </div>
          ) : discoveryItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
              {discoveryItems.map((item, idx) => (
                <motion.div key={item.type === 'user' ? item.data.uid : `ad-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  {item.type === 'user' ? (
                    <AuraCard user={item.data} onClick={() => router.push(`/chat/${item.data.uid}`)} />
                  ) : (
                    <NativeAdCard />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <Search size={48} className="mx-auto text-white/10" />
              <p className="text-white/40 text-sm font-light">Quiet in the Aura. Expand filters.</p>
            </div>
          )}
        </div>

        <UpgradeModal isOpen={!!upgradeModal?.isOpen} onClose={() => setUpgradeModal(null)} requiredPlan={upgradeModal?.plan as any} featureName={upgradeModal?.feature || ''} />
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
