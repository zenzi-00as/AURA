
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { NativeAdCard } from "@/components/aura/NativeAdCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Search, RefreshCcw, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, limit, Query } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PLAN_LIMITS, isElite, isSpotlightActive } from "@/lib/plan-limits";
import { useToast } from "@/hooks/use-toast";

const DEMO_USER: UserProfile = {
  uid: "demo-artemis",
  name: "Artemis",
  age: 26,
  bio: "Architect of digital spaces and collector of ethereal moments. Looking for someone to synchronize with in the noise of the city.",
  gender: "Non-binary",
  orientation: "Queer",
  interestedIn: ["Anyone"],
  verificationStatus: "Verified",
  plan: "Free",
  dailyChatCount: 0,
  dailyMediaCount: 0,
  dailyLikeCount: 0,
  superLikeBalance: 3,
  incognitoMode: false,
  isSuspended: false,
  isAdmin: false,
  lastActive: new Date(),
  isOnline: true,
  onboardingCompleted: true,
  photoUrl: "https://picsum.photos/seed/aura_artemis/600/800",
  phoneNumber: "+91 0000000000",
  location: { lat: 0, lng: 0 },
  distance: "Nearby"
};

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { toast } = useToast();
  const { profile: currentUserProfile } = useAuthContext();
  
  const eliteUser = isElite(currentUserProfile);
  const maxSearchRadius = eliteUser ? PLAN_LIMITS.Elite.maxRadiusKm : PLAN_LIMITS.Free.maxRadiusKm;

  const [distance, setDistance] = useState([eliteUser ? 25 : 15]);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [activeFilters, setActiveFilters] = useState({
    distance: eliteUser ? 25 : 15,
    ageRange: [18, 35]
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.log("Location access denied", error)
      );
    }
  }, []);

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
          distKm = Math.sqrt(Math.pow(user.location.lat - currentLocation.lat, 2) + Math.pow(user.location.lng - currentLocation.lng, 2)) * 111;
        }
        return { ...user, distance: distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`, distanceKm: distKm };
      })
      .filter(user => user.distanceKm! <= activeFilters.distance)
      .sort((a, b) => {
        if (isSpotlightActive(a) !== isSpotlightActive(b)) return isSpotlightActive(a) ? -1 : 1;
        return (a.distanceKm || 0) - (b.distanceKm || 0);
      });
  }, [firestoreUsers, currentUserProfile, activeFilters, currentLocation]);

  const discoveryItems = useMemo(() => {
    const items: Array<{ type: 'user'; data: UserProfile } | { type: 'ad' }> = [];
    filteredUsers.forEach((user, index) => {
      items.push({ type: 'user', data: user });
      // Insert an ad after every 5 users if not elite
      if (!eliteUser && (index + 1) % 5 === 0) {
        items.push({ type: 'ad' });
      }
    });
    return items;
  }, [filteredUsers, eliteUser]);

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col min-h-screen bg-[#05070D] relative transition-colors overflow-hidden">
        <header className="px-6 h-20 flex justify-between items-center sticky top-0 bg-[#080A10E0] backdrop-blur-[18px] z-20 border-b border-white/5 safe-top">
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
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-bold">Discovery Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Max Radius</Label>
                    <span className="text-[#0057FF] font-bold text-sm">{distance[0]} km</span>
                  </div>
                  <Slider value={distance} onValueChange={setDistance} max={maxSearchRadius} step={1} />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{t('age_range')}</Label>
                    <span className="text-[#0057FF] font-bold text-sm">{ageRange[0]} - {ageRange[1]}</span>
                  </div>
                  <Slider value={ageRange} onValueChange={setAgeRange} min={18} max={80} step={1} />
                </div>
                
                <Button onClick={() => { setActiveFilters({ distance: distance[0], ageRange }); setIsOpen(false); }} className="w-full h-16 rounded-[28px] blue-gradient text-white font-bold text-lg neon-glow">
                  <Check className="mr-2" size={22} />
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 relative z-10">
          {usersLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <div key={`skeleton-${i}`} className="aspect-[1/1.5] w-full rounded-[22px] bg-white/[0.04] animate-pulse border border-white/5" />)}
            </div>
          ) : discoveryItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 items-stretch">
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
            <div className="flex flex-col items-center justify-center space-y-12 py-10">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mx-auto">
                  <Search size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">No one matches your filters</p>
                  <p className="text-white/40 text-xs font-light max-w-[240px] mx-auto">Expand your search to discover more auras, or check out this demo profile.</p>
                </div>
                <Button 
                  onClick={() => setActiveFilters({ distance: maxSearchRadius, ageRange: [18, 80] })} 
                  variant="ghost" 
                  className="text-[#0057FF] font-bold text-xs uppercase tracking-widest"
                >
                  Expand Search
                </Button>
              </div>

              <div className="w-full max-w-[320px] mx-auto grid grid-cols-2 gap-4">
                <div className="col-span-2 mb-2 flex items-center gap-2 px-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#0057FF] aura-glow-blue" />
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Demo Connection</span>
                </div>
                <div className="col-span-1 h-full">
                  <AuraCard user={DEMO_USER} onClick={() => toast({ title: "Demo Interaction", description: "This is a preview of the discovery experience." })} />
                </div>
                <div className="col-span-1 h-full">
                  <NativeAdCard />
                </div>
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
