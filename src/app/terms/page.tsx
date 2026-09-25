"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, ShieldCheck, Gavel, UserCheck, CreditCard, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-background pb-12 transition-colors">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Terms of Service</h1>
      </header>

      <div className="p-8 space-y-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Scale size={24} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Agreement to Terms</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            By accessing or using Aura, you agree to be bound by these Terms. If you do not agree, do not use the service. These terms are governed by the laws of India and international digital service standards.
          </p>
        </div>

        <section className="space-y-8">
          <div className="flex items-start gap-4">
            <UserCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Eligibility & Identity</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                You must be at least 18 years of age to create an account. You represent that all information provided is accurate. Impersonation of any person or entity is strictly prohibited and will result in immediate suspension.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Identity Guard Protocol</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Aura uses AI-powered biometric verification to ensure community safety. You agree to provide a genuine selfie for verification. You acknowledge that our Identity Guard may store anonymized hash data of your verification for security audits.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Gavel className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Conduct Standards</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Harassment, hate speech, bullying, and unauthorized commercial activity are prohibited. You are solely responsible for your interactions. Aura reserves the right to investigate and terminate accounts that violate our community ethos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CreditCard className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. Membership & Subscriptions</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Subscriptions (Elite, Elite Plus) grant access to premium features. Fees are non-refundable except where required by law. Aura utilizes Razorpay for secure payment processing; your financial data is never stored on Aura servers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldAlert className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">5. Termination</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We may suspend or terminate your access to Aura at our sole discretion, without notice, for conduct that violates these Terms or is harmful to other users or our business interests.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Indian Law & Compliance
          </h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDP), Aura acts as a Data Fiduciary. We implement robust security practices to protect your data. Disputes shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section className="glass-card p-6 rounded-3xl border border-border space-y-4">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest">Limitation of Liability</h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Aura is provided "as is". We make no warranties regarding the accuracy of member profiles or the availability of the service. We are not liable for any indirect or consequential damages arising from your use of the platform.
          </p>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Version 2.6.0 • Last Updated: March 2024</p>
        </div>
      </div>
    </div>
  );
}
