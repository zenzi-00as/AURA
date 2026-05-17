
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, EyeOff, Lock, Handshake, BookOpen, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react";
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

  const sections = [
    {
      id: "safety-tips",
      title: t('safety_tips'),
      description: t('safety_tips_desc'),
      icon: Shield,
      color: "text-primary",
      content: [
        { title: t('meeting_person'), desc: t('meeting_person_desc') },
        { title: t('online_safety'), desc: t('online_safety_desc') },
        { title: "Trust Your Instincts", desc: "If someone makes you feel uncomfortable, block them immediately and report." }
      ]
    },
    {
      id: "data-privacy",
      title: t('data_privacy'),
      description: t('data_privacy_desc'),
      icon: Lock,
      color: "text-secondary",
      content: [
        { title: "Encryption", desc: "All your messages and personal data are encrypted end-to-end." },
        { title: "Control", desc: "You decide what information is shown on your profile." }
      ]
    },
    {
      id: "guidelines",
      title: t('community_guidelines'),
      description: t('guidelines_desc'),
      icon: BookOpen,
      color: "text-emerald-500",
      content: [
        { title: "Respect", desc: "Aura is a safe space. Harassment, hate speech, or abuse results in a permanent ban." },
        { title: "Authenticity", desc: "We use AI identity verification to ensure every profile is a real person." }
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">{t('privacy_safety')}</h1>
      </header>

      <div className="p-6 space-y-8">
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-[24px] fuchsia-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
            <Shield size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">{t('safety_center')}</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-[280px] mx-auto">
            {t('safety_center_desc')}
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-[32px] overflow-hidden border border-white/5"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={section.id} className="border-none">
                  <AccordionTrigger className="px-6 py-6 hover:no-underline hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4 text-left">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${section.color}`}>
                        <section.icon size={22} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white">{section.title}</h3>
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
                          <h4 className="text-sm font-medium text-white">{item.title}</h4>
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

        <section className="pt-8">
          <div className="p-6 bg-destructive/5 rounded-[32px] border border-destructive/10 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle size={20} />
              <h3 className="font-semibold uppercase tracking-widest text-[10px]">{t('reporting')}</h3>
            </div>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              {t('reporting_desc')}
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

        <div className="pt-8 text-center space-y-2 pb-12">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Aura Security Protocol v2.4</p>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground underline decoration-white/10">
            <button>Full Terms</button>
            <button>Global Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
