
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuraCard } from "@/components/aura/AuraCard";
import { BottomNav } from "@/components/aura/BottomNav";
import { UserProfile } from "@/lib/types";
import { SlidersHorizontal, Sparkles, Check, Info } from "lucide-react";
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
import { useTranslation } from "@/context/LanguageContext";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, limit, Query } from "firebase/firestore";

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const db = useFirestore();
  const { user: authUser } = useUser();
  
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
      limit(20)
    ) as Query<UserProfile>;
  }, [db]);

  const { data: firestoreUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!firestoreUsers) return [];
    
    return firestoreUsers
      .filter(user => {
        if (authUser && user.uid === authUser.uid) return false;
        const withinAge = user.age >= activeFilters.ageRange[0] && user.age <= activeFilters.ageRange[1];
        return withinAge;
      })
      .map(user => {
        let distanceStr = "";
        let distKm = 999;

        if (currentLocation && user.location) {
          const lat1 = currentLocation.lat;
          const lon1 = currentLocation.lng;
          const lat2 = user.location.lat;
          const lon2 = user.location.lng;
          
          distKm = Math.sqrt(
            Math.pow(lat2 - lat1, 2) + 
            Math.pow(lon2 - lon1, 2)
          ) * 111;

          distanceStr = distKm < 1 
            ? `${Math.round(distKm * 1000)}m away` 
            : `${distKm.toFixed(1)}km away`;
        }

        return {
          ...user,
          distance: distanceStr,
          distanceKm: distKm
        };
      })
      .filter(user => {
        if (currentLocation && user.location) {
          return user.distanceKm! <= activeFilters.distance;
        }
        return true;
      });
  }, [firestoreUsers, activeFilters, authUser, currentLocation]);

  const handleApplyFilters = () => {
    setActiveFilters({
      distance: distance[0],
      ageRange: ageRange
    });
    setIsOpen(false);
  };

  const handleUserClick = (uid: string) => {
    router.push(`/chat/${uid}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-background pb-32 transition-colors">
      <header className="px-8 py-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl fuchsia-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('discovery')}</h1>
          </div>
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <SlidersHorizontal size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-popover border-border text-foreground rounded-t-[40px] px-8 pt-8 pb-12 outline-none">
            <SheetHeader className="mb-8">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold text-foreground">{t('filters')}</SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('max_distance')}</Label>
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
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('age_range')}</Label>
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
                <Button 
                  onClick={handleApplyFilters}
                  className="w-full h-14 rounded-2xl fuchsia-gradient text-white font-medium text-lg shadow-lg shadow-primary/20"
                >
                  <Check className="mr-2" size={20} />
                  {t('apply_filters')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="px-6 space-y-4 overflow-y-auto pt-4">
        {usersLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 w-full rounded-[32px] bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="px-2 pt-2 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-medium text-[10px] uppercase tracking-widest">
                <Sparkles size={12} />
                {filteredUsers.length > 0 ? t('verified_nearby') : t('no_results')}
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
                  >
                    <AuraCard user={user} onClick={() => handleUserClick(user.uid)} />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Info size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">{t('no_results')}</p>
                    <p className="text-sm text-muted-foreground font-light">{t('try_expanding')}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setDistance([100]);
                      setAgeRange([18, 80]);
                      setActiveFilters({ distance: 100, ageRange: [18, 80] });
                    }}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    {t('reset_filters')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
