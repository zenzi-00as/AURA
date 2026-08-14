"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
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

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
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
              {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[1/1.4] w-full rounded-3xl bg-white/[0.04] animate-pulse border border-white/5" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredUsers.map((user, idx) => (
                <motion.div 
                  key={user.uid} 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                >
                  <AuraCard user={user} onClick={() => router.push(`/chat/${user.uid}`)} />
                </motion.div>
              ))}
            </div>
          )}
          
          {filteredUsers.length === 0 && !usersLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20"><Search size={32} /></div>
              <p className="text-white/60 font-light max-w-[200px]">{t('no_results')}</p>
              <Button onClick={() => setActiveFilters({ distance: maxSearchRadius, ageRange: [18, 80] })} variant="ghost" className="text-[#0057FF] font-bold text-sm uppercase">Expand Search</Button>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}