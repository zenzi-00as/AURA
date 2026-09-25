"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { NativeAdCard } from "@/components/aura/NativeAdCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { SuperFundPrompt } from "@/components/aura/SuperFundPrompt";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Search, Lock, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { useFirestore } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getPlanConfig } from "@/lib/subscription-engine";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/aura/UpgradeModal";
import { getDiscoveryNodes, updateLocationGeohash } from "@/actions/discovery";

const DEMO_USERS: UserProfile[] = [
  {
    uid: 'demo-1',
    name: 'Julian',
    age: 24,
    bio: 'Architectural designer with a passion for brutalist minimalism and early morning espresso.',
    photoUrl: 'https://picsum.photos/seed/aura-demo-1/600/800',
    distance: '1.2km away',
    isOnline: true,
    verificationStatus: 'Verified',
    onboardingCompleted: true,
    lastActive: new Date(),
    phoneNumber: '+1000000000',
    gender: 'Man',
    orientation: 'Gay',
    interestedIn: ['Men'],
    superLikeBalance: 0,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false
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
    }
  }, [currentLocation, currentUserProfile, activeFilters]);

  const discoveryItems = useMemo(() => {
    const items: Array<{ type: 'user'; data: UserProfile } | { type: 'ad' }> = [];
    discoveryResults.forEach((user, index) => {
      items.push({ type: 'user', data: user });
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
      <div className="flex-1 flex flex-col min-h-screen bg-[#05070D] relative transition-colors overflow-hidden">
        <header className="px-4 h-20 flex justify-between items-center sticky top-0 bg-[#080A10E0] backdrop-blur-[18px] z-20 border-b border-white/5 safe-top">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl blue-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t('discovery')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/super-fund')} className="h-10 px-5 rounded-full premium-gradient border-2 border-primary flex items-center gap-2 group transition-all shadow-[0_0_10px_rgba(0,87,255,0.15)]">
              <Sparkles size={16} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest hidden sm:block">Support</span>
            </button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
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
                  <Button onClick={() => { setActiveFilters({ distance: distance[0], ageRange }); setIsOpen(false); }} className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg">
                    Apply Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-6 pb-32 relative z-10">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
          ) : discoveryItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
              {discoveryItems.map((item, idx) => (
                <motion.div key={item.type === 'user' ? item.data.uid : `ad-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
