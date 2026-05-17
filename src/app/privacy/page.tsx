"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Database, EyeOff, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">Privacy Policy</h1>
      </header>

      <div className="p-8 space-y-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Your Privacy First</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Aura is built on the principle of data minimalism. We only collect what is essential to provide a safe and authentic connection experience.
          </p>
        </div>

        <section className="space-y-8">
          <div className="flex items-start gap-4">
            <Database className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Data Collection</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We collect your phone number for authentication, your name, age, and a selfie for identity verification. We do not track your location history; we only use your current approximate position to find nearby matches.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <EyeOff className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Encryption & Storage</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Messages are protected with end-to-end encryption. Our infrastructure is "stateless," meaning we minimize the persistence of your social graph and data presence to what is strictly necessary.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Globe className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Regulatory Compliance</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We comply with the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and the Indian Digital Personal Data Protection (DPDP) Act 2023. You have the right to access, rectify, or delete your data at any time.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-widest">Our Promise</h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Aura does not sell your personal information. We do not use third-party trackers for advertising. Your privacy is a fundamental right, not a product.
          </p>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Version 2.5.0 • Stateless Security</p>
        </div>
      </div>
    </div>
  );
}
