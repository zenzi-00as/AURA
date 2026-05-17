"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, ShieldCheck, Gavel, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-16 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">Terms of Service</h1>
      </header>

      <div className="p-8 space-y-10 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Scale size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Agreement to Terms</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            By accessing or using Aura, you agree to be bound by these Terms. If you do not agree, do not use the service. These terms are governed by the laws of India and international digital service standards.
          </p>
        </div>

        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <UserCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">1. Eligibility</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                You must be at least 18 years of age to create an account. By using Aura, you represent that you have the right, authority, and capacity to enter into this agreement.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">2. Account Verification</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Aura uses AI-powered biometric verification to ensure community safety. You agree to provide accurate information and a genuine selfie for verification purposes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Gavel className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-white">3. Prohibited Conduct</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Harassment, hate speech, bullying, impersonation, and unauthorized commercial activity are strictly prohibited. Violations will result in immediate and permanent account suspension.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="font-semibold text-white">4. Indian Law Compliance</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 of India, Aura acts as a data fiduciary for your personal data. We implement reasonable security practices and procedures as mandated by Indian law.
          </p>
        </section>

        <section className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="font-semibold text-white">5. Limitation of Liability</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Aura is provided "as is". We are not liable for the conduct of any user or for any indirect, incidental, or consequential damages arising out of your use of the service.
          </p>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Last Updated: October 2024</p>
        </div>
      </div>
    </div>
  );
}
