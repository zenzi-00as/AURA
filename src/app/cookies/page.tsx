"use client";

import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Cookie, 
  ShieldCheck, 
  Eye, 
  Settings, 
  Lock,
  Smartphone,
  MousePointer2,
  RefreshCcw,
  Info
} from "lucide-react";
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

      <div className="p-8 space-y-12 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Cookie size={24} />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Aura Tracking Protocol</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Aura uses essential cookies and local storage nodes to maintain your secure session and ensure your preferences are synchronized across your devices. We believe in radical transparency regarding the technologies we use.
          </p>
        </div>

        <section className="space-y-10">
          <div className="flex items-start gap-4">
            <ShieldCheck className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Strictly Necessary Nodes</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                These are essential for you to navigate Aura and use its features. Without these, synchronization with your Firebase identity node would be impossible.
                <span className="block mt-2 font-medium opacity-80">• Authentication Tokens: Keeps you signed in during your session.</span>
                <span className="block font-medium opacity-80">• Security/CSRF Tokens: Protects your account from malicious external scripts.</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Settings className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Functional & Preference Cookies</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                These allow us to remember your choices (such as your theme, language, and currency settings) and provide enhanced, personalized features.
                <span className="block mt-2 font-medium opacity-80">• Theme State: Remembers if you prefer Aura Dark or Aura Light.</span>
                <span className="block font-medium opacity-80">• Localization: Ensures Aura speaks your language across every stage.</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Eye className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Analytics & Performance</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We use minimalist analytics to understand how members interact with the Discovery stage. This data is aggregated and anonymized, helping us optimize the speed and reliability of your connections.
                <span className="block mt-2 font-medium opacity-80">• Load Balancing: Optimizes server response times based on traffic nodes.</span>
                <span className="block font-medium opacity-80">• Interaction Flow: Identifies friction points in the discovery UI.</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MousePointer2 className="text-amber-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. Manage Your Preferences</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Most browsers allow you to block or delete cookies through their settings. However, please note that disabling essential cookies will definitively interrupt your Aura synchronization and sign-in capabilities.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {['Chrome', 'Safari', 'Firefox', 'Edge'].map(browser => (
                  <div key={browser} className="p-3 bg-muted/50 rounded-xl border border-border text-[10px] font-bold text-center uppercase tracking-widest">
                    {browser} Settings
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-8 rounded-[40px] border border-border space-y-4 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center gap-3 text-amber-500">
            <Lock size={24} />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">Third-Party Tracking</h4>
          </div>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            We do not permit third-party advertising networks to place tracking pixels or cookies on Aura. Our only external synchronization nodes are Firebase (for core infrastructure) and Razorpay (for membership activation).
          </p>
          <div className="pt-4 flex items-center gap-3 text-amber-500/60 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
            <Smartphone size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Local Storage is used for performance optimization.</span>
          </div>
        </section>

        <div className="pt-8 text-center pb-12">
          <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium border border-border px-4 py-2 rounded-full">
            <RefreshCcw size={10} />
            Aura Tracking node v1.2.0 • Updated Oct 2024
          </div>
        </div>
      </div>
    </div>
  );
}
