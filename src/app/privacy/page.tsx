"use client";

import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Lock, 
  Database, 
  EyeOff, 
  Globe, 
  Fingerprint, 
  Trash2, 
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  RefreshCcw
} from "lucide-react";
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

      <div className="p-8 space-y-12 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Lock size={24} />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Data Stewardship</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            At Aura, your privacy isn't just a setting—it's the foundation of our architecture. We operate on a principle of radical data minimalism, collecting only the signals necessary for a safe and authentic connection.
          </p>
        </div>

        <section className="space-y-10">
          <div className="flex items-start gap-4">
            <Database className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Data Collection Node</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We collect your email and UID for authentication. Profile data (name, age, bio, gender, orientation) is used for discovery synchronization. Location data is stored as a geohash (approximate area) and is never tracked in real-time or stored as a historical movement log.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Fingerprint className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Biometric Security & AI Assessment</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Our Identity Guard processes your selfie to verify liveness and profile alignment. This is performed via a private Genkit flow. Once assessed, the raw image is purged from active nodes, and only a mathematical hash is retained to prevent identity spoofing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <UserPlus className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Third-Party Synchronization</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We do not sell your data. We only synchronize with trusted infrastructure partners:
                <span className="block mt-2 font-medium opacity-80">• Firebase: Authentication and data persistence.</span>
                <span className="block font-medium opacity-80">• Razorpay: Secure payment processing (Aura never sees your CVV or card details).</span>
                <span className="block font-medium opacity-80">• Google AI: For biometric liveness assessment.</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <EyeOff className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. Stateless Architecture</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Private communications are ephemeral. Ephemeral media (photos sent in chat) are physically deleted from our Google Cloud Storage bucket the moment they reach the view limit (one or two views), ensuring no permanent record remains on our hardware.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Trash2 className="text-emerald-500 mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">5. Your Digital Autonomy</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Under the Indian DPDP Act (2023) and GDPR, you have the right to access, rectify, or definitively erase your data. Account deletion triggers a recursive cleanup script that purges your messages, likes, and identity nodes across our global clusters.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card p-8 rounded-[40px] border border-border space-y-6 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3 text-emerald-500">
            <ShieldCheck size={24} />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">Our Commitment</h4>
          </div>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Aura complies with the highest international standards for data protection. We use hardware-locked encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We maintain a zero-access policy for unauthorized staff regarding your private messages.
          </p>
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3">
               <ShieldAlert className="text-emerald-500" size={16} />
               <span className="text-[10px] font-bold text-white uppercase tracking-widest">Grievance Node</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              If you have concerns regarding data processing, contact our Data Protection Officer (DPO) at privacy@aura.community. We respond to all regulatory inquiries within 72 hours.
            </p>
          </div>
        </section>

        <div className="pt-8 text-center pb-12">
          <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
            <Globe size={10} />
            Aura Security Node v2.6.5 • Stateless Security Protocol
          </div>
        </div>
      </div>
    </div>
  );
}
