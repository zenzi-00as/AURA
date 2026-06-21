
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Info, Search, RefreshCcw, Compass } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/firebase/auth-context";
import { collection, query, limit, Query } from "firebase/firestore";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { profile: currentUserProfile } = useAuthContext();
  
  const [distance, setDistance] = useState([15]);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [activeFilters, setActiveFilters] = useState({
    distance: 15,
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
      limit(50)
    ) as Query<UserProfile>;
  }, [db]);

  const { data: firestoreUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!firestoreUsers || !currentUserProfile) return [];
    
    return firestoreUsers
      .filter(user => {
        if (user.uid === currentUserProfile.uid) return false;
        const withinAge = user.age >= activeFilters.ageRange[0] && user.age <= activeFilters.ageRange[1];
        if (!withinAge) return false;

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
      });
  }, [firestoreUsers, currentUserProfile, activeFilters, currentLocation]);

  const handleApplyFilters = () => {
    setActiveFilters({ distance: distance[0], ageRange: ageRange });
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    setDistance([100]);
    setAgeRange([18, 80]);
    setActiveFilters({ distance: 100, ageRange: [18, 80] });
  };

  const handleUserClick = (uid: string) => {
    router.push(`/chat/${uid}`);
  };

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background min-h-screen-safe relative transition-colors overflow-hidden">
        <header className="px-6 sm:px-8 py-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {t('discovery')}
            </h1>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <SlidersHorizontal size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-popover border-border text-foreground rounded-t-[40px] px-8 pt-8 pb-12 outline-none max-h-[85dvh] overflow-y-auto">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-semibold text-foreground">{t('filters')}</SheetTitle>
              </SheetHeader>
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('max_distance')}</Label>
                    <span className="text-primary font-semibold text-sm">{distance[0]} km</span>
                  </div>
                  <Slider value={distance} onValueChange={setDistance} max={100} step={1} className="py-4" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('age_range')}</Label>
                    <span className="text-primary font-semibold text-sm">{ageRange[0]} - {ageRange[1]}</span>
                  </div>
                  <Slider value={ageRange} onValueChange={setAgeRange} min={18} max={80} step={1} className="py-4" />
                </div>
                <div className="pt-4 flex gap-3">
                  <Button onClick={handleApplyFilters} className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20">
                    <Check className="mr-2" size={20} />
                    {t('apply_filters')}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide pb-32">
          {usersLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 w-full rounded-[32px] bg-muted animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="px-2 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-medium text-[10px] uppercase tracking-widest">
                  <Sparkles size={12} />
                  {filteredUsers.length > 0 ? t('verified_nearby') : "Status"}
                </div>
                {filteredUsers.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {filteredUsers.length} {t('found')}
                  </span>
                )}
              </div>
              
              <AnimatePresence mode="popLayout">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <motion.div 
                      key={user.uid} 
                      layout 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }} 
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full"
                    >
                      <AuraCard user={user} onClick={() => handleUserClick(user.uid)} />
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex flex-col items-center justify-center py-12 text-center space-y-8 px-4"
                  >
                    <div className="relative">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="w-20 h-20 rounded-[40px] bg-primary/10 flex items-center justify-center text-primary relative z-10"
                      >
                        <Search size={40} strokeWidth={1.5} />
                      </motion.div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-primary/5 rounded-full blur-2xl -z-10" />
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">✨ No matches found yet</h2>
                      <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
                        We're still searching for compatible people.
                      </p>
                    </div>

                    <div className="w-full max-w-[280px] space-y-3 text-left bg-muted/30 p-6 rounded-[32px] border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Try:</p>
                      <ul className="space-y-3">
                        {['Expanding age range', 'Increasing distance', 'Updating interests'].map((tip, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-xs text-foreground/80 font-light">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col w-full max-w-[280px] gap-3">
                      <Button onClick={handleResetFilters} className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-bold text-base shadow-lg shadow-primary/20">
                        <RefreshCcw className="mr-2" size={18} />
                        Reset Filters
                      </Button>
                      <Button variant="ghost" onClick={() => router.push('/dashboard')} className="w-full h-12 rounded-xl text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
                        <Compass size={18} />
                        Discover More
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
