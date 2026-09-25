"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Cookie, ShieldCheck, Eye, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function CookiesPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Cookies Policy</h1>
      </header>

      <div className="p-8 space-y-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Cookie size={24} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Understanding Cookies</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Aura uses essential cookies and similar technologies to enhance your experience, maintain your secure session, and remember your preferences. We believe in radical transparency regarding your data.
          </p>
        </div>

        <section className="space-y-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Essential Cookies</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                These are strictly necessary for the operation of Aura. They include, for example, cookies that enable you to log into secure areas of our platform. Without these, the application would not synchronize with your identity node.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Settings className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Preference Cookies</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                These allow us to recognize you when you return to our service. This enables us to personalize our content for you, greet you by name, and remember your preferences (for example, your choice of language or theme).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Eye className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Analytics & Performance</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We use minimalist analytics to understand how members interact with the Aura Discovery stage. This data is aggregated and anonymized, helping us improve the speed and reliability of your connections.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card p-6 rounded-3xl border border-border space-y-4">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">Managing Your Data</h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Most web browsers allow some control of most cookies through the browser settings. However, please note that if you use your browser settings to block all cookies (including essential ones), you may not be able to access parts of Aura.
          </p>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Aura Cookie Protocol v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
