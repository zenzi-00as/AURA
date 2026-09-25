"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Database, EyeOff, Globe, Fingerprint, Trash2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Privacy Policy</h1>
      </header>

      <div className="p-8 space-y-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Your Privacy First</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Aura is built on the principle of data minimalism. We only collect what is essential to provide a safe, authentic, and ethereal connection experience.
          </p>
        </div>

        <section className="space-y-8">
          <div className="flex items-start gap-4">
            <Database className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Data Collection Node</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We collect your email for authentication, your name, age, and a biometric selfie for identity verification. We do not track your movement history; we only use your current approximate location to synchronize with nearby members.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Fingerprint className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Biometric Security</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Identity verification photos are processed via secure AI flows. These images are stored in hardware-locked storage vaults and are never visible to other members. Once a biometric hash is verified, original high-resolution images are purged according to our lifecycle policy.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <EyeOff className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Stateless Architecture</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Your private communications are ephemeral. Our infrastructure is "stateless," meaning we minimize the long-term persistence of your social graph. Ephemeral media is deleted from physical storage once view limits are reached.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Trash2 className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. Data Deletion & Rights</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Under the DPDP Act 2023 and GDPR, you have the right to access, correct, or erase your data. Deleting your account triggers a cascading purge of your identity nodes, photos, and messages across all Aura synchronization clusters.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Globe className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">5. Regulatory Guardianship</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We comply with the Digital Personal Data Protection (DPDP) Act of India, GDPR (EU), and CCPA (USA). We do not sell your personal data to third parties. Data is only shared with trusted service partners (e.g., Firebase, Razorpay) necessary for platform operation.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card p-8 rounded-3xl border border-border space-y-4 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3 text-emerald-500">
            <ShieldCheck size={24} />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">Our Promise</h4>
          </div>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Aura is built on a foundation of radical transparency. We promise to protect your digital autonomy and ensure that your experience is defined by real connections, not algorithmic manipulation or data exploitation.
          </p>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Version 2.6.0 • Stateless Security Protocol</p>
        </div>
      </div>
    </div>
  );
}
