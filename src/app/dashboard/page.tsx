"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { AdBanner } from "@/components/aura/AdBanner";
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

const DEMO_USER: Partial<UserProfile> & { distance?: string } = {
  uid: "demo-aura-architect",
  name: "Artemis",
  age: 27,
  bio: "Architect of dreams and digital spaces. Exploring the intersection of art and reality in the Aura realm. ✨",
  gender: "Non-binary",
  orientation: "Queer",
  interestedIn: ["Man", "Woman", "Non-binary"],
  position: "Versatile",
  room: "Yes",
  verificationStatus: "Verified",
  plan: "Elite",
  photoUrl: "https://picsum.photos/seed/aura_demo/600/800",
  isOnline: true,
  incognitoMode: false,
  distance: "Nearby in the Aether"
};

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
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log("Location access denied or unavailable", error)
      );
    }
  }, []);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      limit(100)
    ) as Query<UserProfile>;
  }, [db]);

  const { data: firestoreUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!firestoreUsers || !currentUserProfile) return [];
    
    const results = firestoreUsers
      .filter(user => {
        if (!user.uid || user.uid === currentUserProfile.uid) return false;
        if (user.isSuspended) return false;

        const withinAge = user.age >= activeFilters.ageRange[0] && user.age <= activeFilters.ageRange[1];
        if (!withinAge) return false;

        // Interest Logic
        const iAmInterestedInThem = currentUserProfile.interestedIn.some(cat => {
            if (cat === "Man") return user.gender === "Man" || user.gender === "Trans Man";
            if (cat === "Woman") return user.gender === "Woman" || user.gender === "Trans Woman";
            if (cat === "Non-binary") return user.gender === "Non-binary";
            return user.gender === cat;
        });

        const theyAreInterestedInMe = user.interestedIn.some(cat => {
            if (cat === "Man") return currentUserProfile.gender === "Man" || currentUserProfile.gender === "Trans Man";
            if (cat === "Woman") return currentUserProfile.gender === "Woman" || currentUserProfile.gender === "Trans Woman";
            if (cat === "Non-binary") return currentUserProfile.gender === "Non-binary";
            return currentUserProfile.gender === cat;
        });

        return iAmInterestedInThem && theyAreInterestedInMe;
      })
      .map(user => {
        let distanceStr = "";
        let distKm = 999;

        if (currentLocation && user.location) {
          const lat1 = currentLocation.lat;
          const lon1 = currentLocation.lng;
          const lat2 = user.location.lat;
          const lon2 = user.location.lng;
          
          distKm = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 111;
          distanceStr = distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`;
        }

        return { ...user, distance: distanceStr, distanceKm: distKm };
      })
      .filter(user => {
        if (currentLocation && user.location) {
          return user.distanceKm! <= activeFilters.distance;
        }
        return true;
      })
      .sort((a, b) => {
        const aSpotlight = isSpotlightActive(a);
        const bSpotlight = isSpotlightActive(b);
        if (aSpotlight !== bSpotlight) return aSpotlight ? -1 : 1;
        
        const aElite = a.plan === 'Elite';
        const bElite = b.plan === 'Elite';
        if (aElite !== bElite) return aElite ? -1 : 1;

        return (a.distanceKm || 0) - (b.distanceKm || 0);
      });

    // Final deduplication by UID to prevent key warnings
    return Array.from(new Map(results.map(u => [u.uid, u])).values());
  }, [firestoreUsers, currentUserProfile, activeFilters, currentLocation]);

  const handleApplyFilters = () => {
    setActiveFilters({ distance: distance[0], ageRange: ageRange });
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const defaultDist = eliteUser ? 25 : 15;
    setDistance([defaultDist]);
    setAgeRange([18, 35]);
    setActiveFilters({ distance: defaultDist, ageRange: [18, 35] });
  };

  const handleUserClick = (uid: string) => {
    router.push(`/chat/${uid}`);
  };

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col min-h-screen-safe relative transition-colors overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)]"
          />
        </div>

        <header className="px-5 h-16 flex justify-between items-center sticky top-0 bg-background/40 backdrop-blur-2xl z-20 border-b border-white/5 safe-top">
          <div className="flex items-center gap-2">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-8 h-8 rounded-xl premium-gradient flex items-center justify-center neon-glow shrink-0"
            >
              <span className="text-white font-bold text-xs">A</span>
            </motion.div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {t('discovery')}
            </h1>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
              >
                <SlidersHorizontal size={16} />
              </motion.button>
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] px-8 pt-8 pb-12 outline-none max-h-[85dvh] overflow-y-auto backdrop-blur-2xl">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-bold text-white">Discovery Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Max Radius</Label>
                      {!eliteUser && <Lock size={10} className="text-primary" />}
                    </div>
                    <span className="text-primary font-bold text-sm">{distance[0]} km</span>
                  </div>
                  <Slider 
                    value={distance} 
                    onValueChange={setDistance} 
                    max={maxSearchRadius} 
                    step={1} 
                    className="py-4" 
                  />
                  {!eliteUser && <p className="text-[9px] text-white/20 italic">Elite members can search up to 100km.</p>}
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">{t('age_range')}</Label>
                    <span className="text-primary font-bold text-sm">{ageRange[0]} - {ageRange[1]}</span>
                  </div>
                  <Slider value={ageRange} onValueChange={setAgeRange} min={18} max={80} step={1} className="py-4" />
                </div>
                
                <div className="pt-4">
                  <Button onClick={handleApplyFilters} className="w-full h-16 rounded-3xl premium-gradient text-white font-bold text-lg neon-glow">
                    <Check className="mr-2" size={22} />
                    {t('apply_filters')}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide pb-32 relative z-10">
          {usersLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[1, 2, 3, 4].map(i => <div key={`skeleton-${i}`} className="aspect-[1/1.3] w-full rounded-2xl glass animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="px-1 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary font-bold text-[9px] uppercase tracking-[0.2em]">
                  <Sparkles size={12} className="animate-pulse" />
                  {filteredUsers.length > 0 ? t('verified_nearby') : "Status"}
                </div>
              </div>
              
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {filteredUsers.map((user, idx) => (
                    <React.Fragment key={user.uid || `user-${idx}`}>
                      <motion.div 
                        layout 
                        initial={{ opacity: 0, y: 15, scale: 0.98 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        transition={{ duration: 0.3, delay: idx * 0.02 }}
                        className="w-full h-full"
                      >
                        <AuraCard user={user} onClick={() => handleUserClick(user.uid)} />
                      </motion.div>
                      {(idx + 1) % 6 === 0 && (
                        <div key={`ad-block-${idx}`} className="col-span-full py-2">
                          <AdBanner />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {filteredUsers.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex flex-col items-center justify-center py-6 text-center space-y-6 px-4"
                  >
                    <div className="relative">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-[24px] glass flex items-center justify-center text-primary relative z-10"
                      >
                        <Search size={24} strokeWidth={1.5} />
                      </motion.div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-white tracking-tight">Ethereal Silence...</h2>
                      <p className="text-[10px] text-white/50 font-light leading-relaxed max-w-[200px] mx-auto">
                        No matches synchronized. Expand your search radius to discover more connections.
                      </p>
                    </div>
                    
                    <div className="w-full max-w-[360px] mx-auto space-y-3 pt-2">
                      <p className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.3em]">Demo Synchronicity</p>
                      <div className="grid grid-cols-2 gap-2 justify-center">
                        <div className="col-start-1 col-end-3 sm:col-end-2 max-w-[180px] mx-auto w-full">
                           <AuraCard user={DEMO_USER as any} onClick={() => handleUserClick(DEMO_USER.uid!)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col w-full max-w-[200px] gap-3 pt-2">
                      <Button onClick={handleResetFilters} className="w-full h-12 rounded-xl premium-gradient text-white font-bold text-sm neon-glow">
                        <RefreshCcw className="mr-2" size={16} />
                        Reset Filters
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
