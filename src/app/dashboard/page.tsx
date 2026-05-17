
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
    distanceKm: 0.35,
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
    distanceKm: 1.4,
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
    distanceKm: 2.8,
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
    distanceKm: 5.2,
    lastActive: new Date(),
    online: false,
  },
  {
    uid: "5",
    name: "Sam",
    age: 31,
    bio: "Urban gardener and part-time DJ. Let's talk plants and beats.",
    gender: "Non-binary",
    orientation: "Queer",
    verificationStatus: "Verified",
    distance: "12 km away",
    distanceKm: 12,
    lastActive: new Date(),
    online: true,
  },
  {
    uid: "6",
    name: "Kai",
    age: 19,
    bio: "Fine arts student. Passionate about portraiture and analog film.",
    gender: "Trans Man",
    orientation: "Gay",
    verificationStatus: "Verified",
    distance: "8.5 km away",
    distanceKm: 8.5,
    lastActive: new Date(),
    online: false,
  }
];

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [distance, setDistance] = useState([15]);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [isOpen, setIsOpen] = useState(false);
  const [userOrientation, setUserOrientation] = useState<string | null>(null);
  
  const [activeFilters, setActiveFilters] = useState({
    distance: 15,
    ageRange: [18, 35]
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aura_user_orientation');
      setUserOrientation(saved);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter(user => {
      const withinDistance = user.distanceKm <= activeFilters.distance;
      const withinAge = user.age >= activeFilters.ageRange[0] && user.age <= activeFilters.ageRange[1];
      
      // Orientation compatibility logic
      let matchesOrientation = true;
      if (userOrientation && userOrientation !== 'Pansexual' && userOrientation !== 'Queer') {
        // Broadly, show people with same orientation or those who identify as Pan/Queer
        matchesOrientation = user.orientation === userOrientation || 
                             user.orientation === 'Pansexual' || 
                             user.orientation === 'Queer' ||
                             (userOrientation === 'Gay' && (user.orientation === 'Bisexual' || user.orientation === 'Queer')) ||
                             (userOrientation === 'Lesbian' && (user.orientation === 'Bisexual' || user.orientation === 'Queer'));
      }

      return withinDistance && withinAge && matchesOrientation;
    });
  }, [activeFilters, userOrientation]);

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
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-32">
      <header className="px-8 pt-6 pb-6 flex justify-between items-center sticky top-0 bg-[#0C0B0D]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl fuchsia-gradient flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{t('discovery')}</h1>
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <SlidersHorizontal size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-[#1A181C] border-white/5 text-white rounded-t-[40px] px-8 pt-8 pb-12 outline-none">
            <SheetHeader className="mb-8">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold text-white">{t('filters')}</SheetTitle>
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

      <div className="px-6 space-y-6 overflow-y-auto">
        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-widest">
            <Sparkles size={14} />
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
            filteredUsers.map((user, idx) => (
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
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-muted-foreground">
                <Info size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-white font-medium">{t('no_results')}</p>
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
      </div>

      <BottomNav />
    </div>
  );
}
