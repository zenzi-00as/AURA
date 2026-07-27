"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Search, RefreshCcw, Compass } from "lucide-react";
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
      <div className="flex-1 flex flex-col min-h-screen-safe relative transition-colors overflow-hidden">
        {/* Dashboard Aurora Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)]"
          />
        </div>

        <header className="px-8 h-24 flex justify-between items-center sticky top-0 bg-background/40 backdrop-blur-2xl z-20 border-b border-white/5 safe-top">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center neon-glow shrink-0"
            >
              <span className="text-white font-bold text-lg">A</span>
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {t('discovery')}
            </h1>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-full glass border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
              >
                <SlidersHorizontal size={20} />
              </motion.button>
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-dark border-white/10 text-white rounded-t-[40px] px-8 pt-8 pb-12 outline-none max-h-[85dvh] overflow-y-auto backdrop-blur-3xl">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-bold text-white">{t('filters')}</SheetTitle>
              </SheetHeader>
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">{t('max_distance')}</Label>
                    <span className="text-primary font-bold text-sm">{distance[0]} km</span>
                  </div>
                  <Slider value={distance} onValueChange={setDistance} max={100} step={1} className="py-4" />
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide pb-32 relative z-10">
          {usersLoading ? (
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-44 w-full rounded-[28px] glass animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="px-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
                  <Sparkles size={14} className="animate-pulse" />
                  {filteredUsers.length > 0 ? t('verified_nearby') : "Status"}
                </div>
                {filteredUsers.length > 0 && (
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
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
                      initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }} 
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="w-full"
                    >
                      <AuraCard user={user} onClick={() => handleUserClick(user.uid)} />
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex flex-col items-center justify-center py-20 text-center space-y-10 px-4"
                  >
                    <div className="relative">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-[40px] glass flex items-center justify-center text-primary relative z-10"
                      >
                        <Search size={48} strokeWidth={1.5} />
                      </motion.div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Ethereal Silence...</h2>
                      <p className="text-sm text-white/60 font-light leading-relaxed max-w-[280px] mx-auto">
                        No matches were synchronized in your current realm.
                      </p>
                    </div>

                    <div className="flex flex-col w-full max-w-[280px] gap-4">
                      <Button onClick={handleResetFilters} className="w-full h-16 rounded-3xl premium-gradient text-white font-bold text-lg neon-glow">
                        <RefreshCcw className="mr-2" size={20} />
                        Reset Filters
                      </Button>
                      <Button variant="ghost" onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2">
                        <Compass size={20} />
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