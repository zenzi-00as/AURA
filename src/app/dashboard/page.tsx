
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { NativeAdCard } from "@/components/aura/NativeAdCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Search, Lock, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, limit, Query } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getPlanConfig } from "@/lib/subscription-engine";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/aura/UpgradeModal";

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
  },
  {
    uid: 'demo-2',
    name: 'Sasha',
    age: 29,
    bio: 'Digital nomad and landscape photographer. Always chasing the perfect golden hour Aura.',
    photoUrl: 'https://picsum.photos/seed/aura-demo-2/600/800',
    distance: '3.5km away',
    isOnline: true,
    verificationStatus: 'Verified',
    onboardingCompleted: true,
    lastActive: new Date(),
    phoneNumber: '+1000000001',
    gender: 'Non-binary',
    orientation: 'Queer',
    interestedIn: ['Anyone'],
    superLikeBalance: 0,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false,
    spotlightExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
  },
  {
    uid: 'demo-3',
    name: 'Ezra',
    age: 22,
    bio: 'Music producer and synth enthusiast. Looking for someone to share vinyl and deep conversations.',
    photoUrl: 'https://picsum.photos/seed/aura-demo-3/600/800',
    distance: '0.8km away',
    isOnline: false,
    verificationStatus: 'Verified',
    onboardingCompleted: true,
    lastActive: new Date(),
    phoneNumber: '+1000000002',
    gender: 'Man',
    orientation: 'Bisexual',
    interestedIn: ['Men', 'Women'],
    superLikeBalance: 0,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false
  },
  {
    uid: 'demo-4',
    name: 'Nova',
    age: 26,
    bio: 'Plant parent and sustainable fashion advocate. Exploring the intersection of tech and empathy.',
    photoUrl: 'https://picsum.photos/seed/aura-demo-4/600/800',
    distance: '5.2km away',
    isOnline: true,
    verificationStatus: 'Pending',
    onboardingCompleted: true,
    lastActive: new Date(),
    phoneNumber: '+1000000003',
    gender: 'Woman',
    orientation: 'Lesbian',
    interestedIn: ['Women'],
    superLikeBalance: 0,
    incognitoMode: false,
    isSuspended: false,
    isAdmin: false
  }
];

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { profile: currentUserProfile, effectivePlan } = useAuthContext();
  const planConfig = getPlanConfig(effectivePlan as any);
  
  const [distance, setDistance] = useState([planConfig.searchRadiusKm]);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{isOpen: boolean, plan: 'elite' | 'elite_plus', feature: string} | null>(null);
  
  const [activeFilters, setActiveFilters] = useState({
    distance: planConfig.searchRadiusKm,
    ageRange: [18, 35]
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.log("Location access denied")
      );
    }
  }, []);

  useEffect(() => {
    setDistance([planConfig.searchRadiusKm]);
    setActiveFilters(prev => ({ ...prev, distance: planConfig.searchRadiusKm }));
  }, [planConfig.searchRadiusKm]);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), limit(100)) as Query<UserProfile>;
  }, [db]);

  const { data: firestoreUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!firestoreUsers || !currentUserProfile) return [];
    
    return firestoreUsers
      .filter(user => {
        if (user.uid === currentUserProfile.uid || user.isSuspended) return false;
        const withinAge = user.age >= activeFilters.ageRange[0] && user.age <= activeFilters.ageRange[1];
        if (!withinAge) return false;
        return true;
      })
      .map(user => {
        let distKm = 999;
        if (currentLocation && user.location) {
          // Haversine or simple distance is fine for UI
          distKm = Math.sqrt(Math.pow(user.location.lat - currentLocation.lat, 2) + Math.pow(user.location.lng - currentLocation.lng, 2)) * 111;
        }
        return { ...user, distance: distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`, distanceKm: distKm };
      })
      .filter(user => user.distanceKm! <= activeFilters.distance)
      .sort((a, b) => {
        const aSpot = a.spotlightExpiry && (a.spotlightExpiry.toDate ? a.spotlightExpiry.toDate() : new Date(a.spotlightExpiry)) > new Date();
        const bSpot = b.spotlightExpiry && (b.spotlightExpiry.toDate ? b.spotlightExpiry.toDate() : new Date(b.spotlightExpiry)) > new Date();
        if (aSpot !== bSpot) return aSpot ? -1 : 1;
        return (a.distanceKm || 0) - (b.distanceKm || 0);
      });
  }, [firestoreUsers, currentUserProfile?.uid, activeFilters, currentLocation]);

  const discoveryItems = useMemo(() => {
    const items: Array<{ type: 'user'; data: UserProfile } | { type: 'ad' }> = [];
    filteredUsers.forEach((user, index) => {
      items.push({ type: 'user', data: user });
      if (planConfig.ads !== 'none' && (index + 1) % 5 === 0) {
        items.push({ type: 'ad' });
      }
    });
    return items;
  }, [filteredUsers, planConfig.ads]);

  const demoDiscoveryItems = useMemo(() => {
    const items: Array<{ type: 'user'; data: UserProfile } | { type: 'ad' }> = [];
    DEMO_USERS.forEach((user, index) => {
      items.push({ type: 'user', data: user });
      if ((index + 1) % 2 === 0) {
        items.push({ type: 'ad' });
      }
    });
    return items;
  }, []);

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
            <div className="w-9 h-9 rounded-2xl blue-gradient flex items-center justify-center neon-glow">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t('discovery')}</h1>
          </div>
          
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
                    <div className="flex items-center gap-2">
                       <span className="text-primary font-bold text-sm">{distance[0]} km</span>
                       {distance[0] >= planConfig.searchRadiusKm && planConfig.searchRadiusKm < 100 && <Lock size={12} className="text-white/20" />}
                    </div>
                  </div>
                  <Slider value={distance} onValueChange={handleDistanceChange} max={100} step={1} />
                  <p className="text-[9px] text-white/20 uppercase font-bold tracking-tighter">
                    {planConfig.displayName} limit: {planConfig.searchRadiusKm} km
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{t('age_range')}</Label>
                    <span className="text-primary font-bold text-sm">{ageRange[0]} - {ageRange[1]}</span>
                  </div>
                  <Slider value={ageRange} onValueChange={setAgeRange} min={18} max={80} step={1} />
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Advanced Filters</Label>
                    {planConfig.filters !== 'advanced' && (
                      <span className="bg-white/5 text-[8px] font-bold px-2 py-1 rounded-md text-white/40 uppercase tracking-widest flex items-center gap-1">
                         <Lock size={10} /> Elite Plus
                      </span>
                    )}
                  </div>
                  <div className={cn("grid grid-cols-2 gap-2 transition-opacity", planConfig.filters !== 'advanced' && "opacity-40 grayscale pointer-events-none")}>
                     <div className="h-12 rounded-xl border border-white/10 flex items-center px-4 text-xs">Gender Identity</div>
                     <div className="h-12 rounded-xl border border-white/10 flex items-center px-4 text-xs">Interests</div>
                  </div>
                </div>
                
                <Button onClick={() => { setActiveFilters({ distance: distance[0], ageRange }); setIsOpen(false); }} className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg neon-glow">
                  <Check className="mr-2" size={22} />
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-6 pb-32 relative z-10">
          {usersLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={`skeleton-${i}`} className="aspect-[1/1.5] w-full rounded-[22px] bg-white/[0.04] animate-pulse border border-white/5" />)}
            </div>
          ) : discoveryItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
              {discoveryItems.map((item, idx) => (
                <div key={item.type === 'user' ? item.data.uid : `ad-${idx}`} className="h-full">
                  {item.type === 'user' ? (
                    <AuraCard user={item.data} onClick={() => router.push(`/chat/${item.data.uid}`)} />
                  ) : (
                    <NativeAdCard />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              <div className="px-4 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mx-auto">
                  <Search size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Quiet in the Aura</p>
                  <p className="text-white/40 text-xs font-light max-w-[240px] mx-auto">Expand your filters to find matches. Below are some recommendations to get you started.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Discovery Recommendations</h2>
                  </div>
                  <div className="bg-primary/10 text-primary text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">Demo Mode</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
                  {demoDiscoveryItems.map((item, idx) => (
                    <div key={`demo-${idx}`} className="h-full">
                      {item.type === 'user' ? (
                        <AuraCard user={item.data} onClick={() => router.push(`/chat/${item.data.uid}`)} />
                      ) : (
                        <NativeAdCard />
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-6 py-10 bg-white/[0.02] border-y border-white/5 flex flex-col items-center text-center gap-6">
                   <div className="w-14 h-14 rounded-3xl premium-gradient flex items-center justify-center shadow-xl">
                      <Lock size={24} className="text-white" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">Unlock Full Discovery</h3>
                      <p className="text-xs text-white/40 font-light max-w-[280px]">Upgrade to Aura Elite to increase your visibility and see everyone nearby.</p>
                   </div>
                   <Button onClick={() => router.push('/profile?tab=elite')} variant="outline" className="h-12 px-8 rounded-xl border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5">
                      Join Aura Elite
                      <ChevronRight size={14} className="ml-2" />
                   </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <UpgradeModal 
          isOpen={!!upgradeModal?.isOpen} 
          onClose={() => setUpgradeModal(null)}
          requiredPlan={upgradeModal?.plan as any}
          featureName={upgradeModal?.feature || ''}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
