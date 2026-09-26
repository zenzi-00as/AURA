"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  BookOpen, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  Fingerprint, 
  ShieldAlert, 
  Globe, 
  HeartHandshake
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PrivacySafetyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      id: "safety-tips",
      title: mounted ? t('safety_tips') : "Safety Tips",
      description: mounted ? t('safety_tips_desc') : "Essential guidelines for a safe experience.",
      icon: Shield,
      color: "text-primary",
      content: [
        { title: mounted ? t('meeting_person') : "Meeting in Person", desc: mounted ? t('meeting_person_desc') : "Meet in public, tell a friend, and stay in control." },
        { title: mounted ? t('online_safety') : "Online Safety", desc: mounted ? t('online_safety_desc') : "Never share sensitive info like home address or bank details." },
        { title: mounted ? t('safety_financial') : "Financial Safety", desc: mounted ? t('safety_financial_desc') : "Never send money to someone you met on Aura." },
        { title: mounted ? t('safety_account') : "Account Security", desc: mounted ? t('safety_account_desc') : "Do not share your verification code or login details." }
      ]
    },
    {
      id: "data-privacy",
      title: mounted ? t('data_privacy') : "Data Privacy",
      description: mounted ? t('data_privacy_desc') : "How we protect and use your personal information.",
      icon: Lock,
      color: "text-secondary",
      content: [
        { title: "Secure Architecture", desc: "Your private messages are only readable by you and your match." },
        { title: "Minimal Data Footprint", desc: "We only collect what is necessary to connect you safely." },
        { title: "Stateless Infrastructure", desc: "Aura is designed to be ephemeral. Your presence is secured across borders." },
        { title: "Ethical Data Stewardship", desc: "We treat your data with the highest level of care, prioritizing your anonymity and digital well-being." }
      ]
    },
    {
      id: "guidelines",
      title: mounted ? t('community_guidelines') : "Community Guidelines",
      description: mounted ? t('guidelines_desc') : "Our standards for respect and authenticity.",
      icon: BookOpen,
      color: "text-[#00FF88]",
      content: [
        { title: mounted ? t('safety_consent') : "Consent Matters", desc: mounted ? t('safety_consent_desc') : "Always respect boundaries. Communication is key." },
        { title: "Respectful Communication", desc: "Harassment, hate speech, or abuse results in a permanent ban." },
        { title: "Authenticity First", desc: "We use AI identity verification to ensure every profile is a real person." },
        { title: mounted ? t('reporting_action') : "Our Action", desc: mounted ? t('reporting_action_desc') : "We investigate all reports to keep the community safe." }
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{mounted ? t('privacy_safety') : "Privacy & Safety"}</h1>
      </header>

      <div className="p-6 space-y-8">
        <div className="text-center space-y-3 py-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-[24px] premium-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
          >
            <Shield size={32} className="text-white" />
          </motion.div>
          <h2 className="text-2xl font-semibold text-foreground">{mounted ? t('safety_center') : "Safety Center"}</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
            {mounted ? t('safety_center_desc') : "Your safety is our priority. Explore our resources below."}
          </p>
        </div>

        {/* Protection Disclaimer */}
        <div className="p-6 bg-primary/5 border border-primary/10 rounded-[32px] space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Lock size={16} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Media Protection Protocol</h4>
          </div>
          <p className="text-[10px] text-white/50 leading-relaxed italic">
            Some devices and browsers may not allow Aura to definitively prevent or detect screenshots or screen recordings. Aura applies the strongest available platform-level protections, including content obscuration and watermarking, to secure your private presence.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-3xl bg-muted/50 border border-border space-y-2">
            <Fingerprint className="text-primary" size={20} />
            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Verified Only</h4>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">AI-checked identities to prevent bots.</p>
          </div>
          <div className="p-4 rounded-3xl bg-muted/50 border border-border space-y-2">
            <Globe className="text-[#00FF88]" size={20} />
            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Global Safety</h4>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">Resources for LGBTQ+ safety worldwide.</p>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-[32px] overflow-hidden border border-border"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={section.id} className="border-none">
                  <AccordionTrigger className="px-6 py-6 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4 text-left">
                      <div className={`w-12 h-12 rounded-2xl bg-muted flex items-center justify-center ${section.color}`}>
                        <section.icon size={22} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground font-light leading-snug">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-6 pt-2 space-y-6">
                    {section.content.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-primary" />
                          <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground font-light leading-relaxed pl-6">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          ))}
        </div>

        <section className="pt-4">
          <div className="p-6 bg-destructive/5 rounded-[32px] border border-destructive/10 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <ShieldAlert size={24} />
              <h3 className="font-semibold uppercase tracking-widest text-[10px]">{mounted ? t('reporting') : "Reporting & Support"}</h3>
            </div>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              {mounted ? t('reporting_desc') : "We review all reports within 24 hours. Help us keep Aura a safe haven."}
            </p>
            <button 
              onClick={() => router.push('/chat')}
              className="w-full h-12 rounded-2xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
            >
              Go to Messages to report
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section className="glass-card p-8 rounded-[40px] border border-border space-y-6 bg-gradient-to-br from-[#00FF88]/10 to-transparent">
          <div className="flex items-center gap-3 text-[#00FF88]">
            <HeartHandshake size={24} />
            <h3 className="text-sm font-semibold text-foreground">Always With You</h3>
          </div>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Our safety team operates globally to ensure that your experience on Aura remains respectful and authentic, regardless of where you are in the world.
          </p>
        </section>

        <div className="pt-8 text-center space-y-2 pb-12">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Aura Security Protocol v2.5.0</p>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground underline decoration-border">
            <button onClick={() => router.push('/terms')} className="hover:text-foreground transition-colors">Terms of Service</button>
            <button onClick={() => router.push('/privacy')} className="hover:text-foreground transition-colors">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
