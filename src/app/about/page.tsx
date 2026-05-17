"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Sparkles, 
  Shield, 
  Heart, 
  Fingerprint, 
  Globe, 
  ChevronRight, 
  ShieldCheck, 
  Cpu, 
  Map, 
  Handshake, 
  Lock 
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

export default function AboutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const coreValues = [
    {
      title: mounted ? t('authenticity_title') : "Authenticity",
      desc: mounted ? t('authenticity_desc') : "Verification is core to our safety protocol.",
      icon: Fingerprint,
      color: "text-primary"
    },
    {
      title: mounted ? t('minimalism_title') : "Minimalism",
      desc: mounted ? t('minimalism_desc') : "Design that stays out of your way.",
      icon: Sparkles,
      color: "text-secondary"
    },
    {
      title: mounted ? t('privacy_title') : "Privacy",
      desc: mounted ? t('privacy_desc') : "Your data stays where it belongs: with you.",
      icon: Shield,
      color: "text-emerald-500"
    }
  ];

  const features = [
    {
      title: mounted ? t('ai_guard') : "AI-Powered Guard",
      desc: mounted ? t('ai_guard_desc') : "Advanced verification for a bot-free space.",
      icon: Cpu,
    },
    {
      title: mounted ? t('stateless_title') : "Stateless Connection",
      desc: mounted ? t('stateless_desc') : "Secure infrastructure for modern queer nomads.",
      icon: Map,
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">{mounted ? t('about') : "About Aura"}</h1>
      </header>

      <div className="p-8 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 pt-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-[32px] fuchsia-gradient flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 aura-glow"
          >
            <span className="text-4xl font-bold text-white">A</span>
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-white tracking-tight">Aura</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">Minimalist • Private • Real</p>
          </div>
        </div>

        {/* Mission Statement */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="text-xs font-bold text-primary uppercase tracking-widest px-1">{mounted ? t('our_mission') : "Our Mission"}</h3>
          <p className="text-lg text-white font-light leading-relaxed">
            {mounted ? t('mission_desc') : "Aura provides a safe and authentic digital space for the LGBTQ+ community."}
          </p>
        </motion.section>

        {/* Beyond the Surface - Features */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{mounted ? t('how_it_works') : "Beyond the Surface"}</h3>
            <p className="text-sm text-muted-foreground font-light px-1">{mounted ? t('how_it_works_desc') : "Discover how we build a safer connection."}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-6 rounded-[32px] space-y-4 border border-white/5 bg-white/[0.01]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <feature.icon size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Core Values */}
        <section className="space-y-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{mounted ? t('core_values') : "Core Values"}</h3>
          <div className="space-y-4">
            {coreValues.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-6 rounded-[32px] flex items-start gap-5 border border-white/5"
              >
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${value.color} shrink-0`}>
                  <value.icon size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">{value.title}</h4>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    {value.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Our Promise Section */}
        <section className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3 text-emerald-500">
            <Handshake size={24} />
            <h3 className="text-sm font-semibold text-white">{mounted ? t('our_promise') : "Our Commitment"}</h3>
          </div>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {mounted ? t('promise_desc') : "We are committed to maintaining a space where authenticity is celebrated and your journey is protected."}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
            <Lock size={12} />
            <span>Encrypted • No Ads • No Selling</span>
          </div>
        </section>

        {/* Community & Global Presence */}
        <section className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white">Global Community</h3>
          </div>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Available in 6 languages and growing. Aura is a stateless community designed for the modern queer nomad, ensuring safety across borders.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['🇺🇸', '🇮🇳', '🇪🇸', '🇧🇷', '🇫🇷', '🇩🇪'].map(flag => (
              <div key={flag} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/5">
                {flag}
              </div>
            ))}
          </div>
        </section>

        {/* Version Info & Legal Trust */}
        <div className="pt-8 text-center space-y-4 pb-12">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Aura Identity Services v2.4.0</p>
            <p className="text-[9px] text-muted-foreground/60 italic font-light">Crafted with care by the Aura Collective.</p>
          </div>
          <div className="flex justify-center gap-6 text-[10px] text-muted-foreground/80 font-medium border-t border-white/5 pt-6">
            <button className="hover:text-white transition-colors">Terms of Service</button>
            <button className="hover:text-white transition-colors">Privacy Policy</button>
            <button className="hover:text-white transition-colors">Cookies</button>
          </div>
          <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground/40">
            <ShieldCheck size={10} />
            <span>Encrypted Infrastructure</span>
          </div>
        </div>
      </div>
    </div>
  );
}