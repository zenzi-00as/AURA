"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Sparkles, 
  Megaphone, 
  ChevronRight, 
  X, 
  Calendar, 
  Tag,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { AURA_UPDATES, UpdateItem, UpdateCategory } from "@/data/updates";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: UpdateCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'feature', label: 'New Features' },
  { id: 'improvement', label: 'Improvements' },
  { id: 'community', label: 'Community' },
  { id: 'security', label: 'Security' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'coming_soon', label: 'Coming Soon' },
];

export default function UpdatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<UpdateCategory | 'all'>('all');
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateItem | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('aura_viewed_updates');
    if (saved) {
      try {
        setViewedIds(JSON.parse(saved));
      } catch (e) {
        console.error("Viewed updates sync fault", e);
      }
    }
  }, []);

  const handleOpenUpdate = (update: UpdateItem) => {
    setSelectedUpdate(update);
    if (!viewedIds.includes(update.id)) {
      const newViewed = [...viewedIds, update.id];
      setViewedIds(newViewed);
      localStorage.setItem('aura_viewed_updates', JSON.stringify(newViewed));
    }
  };

  const filteredUpdates = useMemo(() => {
    if (selectedCategory === 'all') return AURA_UPDATES;
    return AURA_UPDATES.filter(u => u.category === selectedCategory);
  }, [selectedCategory]);

  const featuredUpdate = useMemo(() => {
    return AURA_UPDATES.find(u => u.featured && (selectedCategory === 'all' || u.category === selectedCategory));
  }, [selectedCategory]);

  const standardUpdates = useMemo(() => {
    return filteredUpdates.filter(u => u.id !== featuredUpdate?.id);
  }, [filteredUpdates, featuredUpdate]);

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen pb-12 transition-colors duration-300">
      <header className="px-6 h-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 safe-top">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-foreground">Updates</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Aura Haven Pulse</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <Megaphone size={18} />
        </div>
      </header>

      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground font-light leading-relaxed px-1 italic">
            Stay up to date with everything happening on Aura.
          </p>

          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                  selectedCategory === cat.id 
                    ? "premium-gradient text-white border-transparent shadow-lg shadow-primary/20" 
                    : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {featuredUpdate && (
              <motion.div
                key={featuredUpdate.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => handleOpenUpdate(featuredUpdate)}
                className="relative p-8 rounded-[40px] premium-gradient text-white shadow-2xl overflow-hidden cursor-pointer group"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/20 text-white border-none backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">Featured</Badge>
                    {!viewedIds.includes(featuredUpdate.id) && <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]" />}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tighter leading-tight group-hover:underline underline-offset-4 transition-all">{featuredUpdate.title}</h2>
                    <p className="text-white/80 font-light text-sm leading-relaxed line-clamp-2">{featuredUpdate.summary}</p>
                  </div>
                  <div className="pt-4 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/60">
                      <Calendar size={12} />
                      {new Date(featuredUpdate.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      Explore Update
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {standardUpdates.length > 0 ? standardUpdates.map((update, idx) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleOpenUpdate(update)}
                  className="p-6 rounded-[32px] bg-card border border-border hover:border-primary/40 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-muted text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border-none">
                          {CATEGORIES.find(c => c.id === update.category)?.label}
                        </Badge>
                        {update.badge && <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">{update.badge}</Badge>}
                      </div>
                      {!viewedIds.includes(update.id) && <Circle className="text-primary fill-primary" size={8} />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{update.title}</h3>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed line-clamp-2">{update.summary}</p>
                    </div>
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{update.date}</span>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.div>
              )) : !featuredUpdate && (
                <div className="py-20 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-muted border border-border mx-auto flex items-center justify-center text-muted-foreground/20">
                    <Megaphone size={40} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">No updates here yet</h3>
                    <p className="text-xs text-muted-foreground font-light px-8">Check back soon for something new from the Aura collective.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedCategory('all')} className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Reset Filters</Button>
                </div>
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedUpdate} onOpenChange={(open) => !open && setSelectedUpdate(null)}>
        <DialogContent className="bg-background border-border text-foreground rounded-[40px] p-0 w-[calc(100%-40px)] max-w-[500px] overflow-hidden shadow-2xl">
          {selectedUpdate && (
            <div className="flex flex-col max-h-[85vh]">
              <div className={cn(
                "h-48 flex flex-col justify-end p-8 relative overflow-hidden",
                selectedUpdate.featured ? "premium-gradient" : "bg-muted"
              )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <Badge className="absolute top-6 left-8 bg-white/20 text-white border-none backdrop-blur-md text-[8px] font-black uppercase tracking-widest">
                  {CATEGORIES.find(c => c.id === selectedUpdate.category)?.label}
                </Badge>
                <div className="relative z-10 space-y-2">
                  <DialogTitle className={cn("text-2xl font-bold tracking-tight m-0", selectedUpdate.featured ? "text-white" : "text-foreground")}>
                    {selectedUpdate.title}
                  </DialogTitle>
                  <div className={cn("flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest", selectedUpdate.featured ? "text-white/60" : "text-muted-foreground")}>
                    <Calendar size={12} />
                    {selectedUpdate.date}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                <DialogDescription className="text-foreground text-sm font-light leading-relaxed whitespace-pre-wrap italic">
                  {selectedUpdate.summary}
                </DialogDescription>
                
                <div className="h-px bg-border" />
                
                <div className="text-sm text-muted-foreground font-light leading-relaxed space-y-4">
                  {selectedUpdate.content.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <div className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                    <Sparkles size={14} className="animate-pulse" />
                    <span>Aura Synchronization Node</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">
                    This update has been materialized as part of Aura v2.5.0 protocol. Your digital presence remains secured and stateless during this transition.
                  </p>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-border bg-muted/20">
                <Button 
                  onClick={() => setSelectedUpdate(null)} 
                  className="w-full h-14 rounded-2xl premium-gradient text-white font-bold shadow-xl"
                >
                  Synchronized
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
