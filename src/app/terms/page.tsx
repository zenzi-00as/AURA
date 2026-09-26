"use client";

import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Scale, 
  ShieldCheck, 
  Gavel, 
  UserCheck, 
  CreditCard, 
  AlertTriangle, 
  ShieldAlert,
  HeartHandshake,
  MessageSquare,
  Globe
} from "lucide-react";
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

      <div className="p-8 space-y-12 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Scale size={24} />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Legal Framework</h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Welcome to Aura. These Terms of Service ("Terms") constitute a legally binding agreement between you and Aura. By accessing our platform, you acknowledge that you have read, understood, and agreed to be synchronized with these standards.
          </p>
        </div>

        <section className="space-y-10">
          <div className="flex items-start gap-4">
            <UserCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Eligibility & Identity Authenticity</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                You must be at least 18 years of age. Aura is a space for authentic human interaction; impersonation or the use of automated "bot" accounts is strictly prohibited. We reserve the right to request identity re-verification at any stage to maintain the integrity of our community.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldCheck className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Biometric Identity Guard Protocol</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Aura utilizes advanced AI to cross-reference bio-signals for verification. You agree that your verification photo will be processed into a mathematical "biometric hash." While original images are purged according to our privacy policy, the hash node remains synchronized with your UID to prevent duplicate or fraudulent account creation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <HeartHandshake className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Safety & Interaction Disclaimer</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Aura is a discovery platform, not a safety service. You are solely responsible for your interactions. We strongly advise meeting in public, notifying trusted contacts of your plans, and never sharing financial details. Aura does not conduct criminal background checks on its members.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MessageSquare className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. User-Generated Content & Conduct</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                You retain ownership of your content but grant Aura a worldwide, non-exclusive license to host it. Prohibited conduct includes: hate speech, harassment, commercial solicitation, and sharing non-consensual sexual imagery. Violations trigger an immediate and definitive purge of your identity node.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CreditCard className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">5. Subscriptions & Financial Transactions</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Elite and Elite Plus memberships are synchronized through Razorpay. Fees include applicable GST (18%). All purchases are final and non-refundable. Cancellations of recurring plans must be performed through your membership hub 24 hours prior to the next billing cycle.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ShieldAlert className="text-primary mt-1 shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">6. Account Termination</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Aura reserves the right to suspend or delete any account for any reason, including prolonged inactivity or suspected breach of these Terms. Upon deletion, your social graph is dismantled according to our stateless architecture policy.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-amber-500">
            <AlertTriangle size={20} />
            <h3 className="font-semibold text-foreground">Dispute Resolution & Jurisdiction</h3>
          </div>
          <div className="p-6 bg-muted/30 rounded-3xl border border-border space-y-4">
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              These Terms are governed by the laws of India. Any disputes arising from your use of Aura shall be subject to mandatory individual arbitration in Bengaluru, Karnataka. You waive your right to participate in a class-action lawsuit.
            </p>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Aura acts as a "Data Fiduciary" under the Digital Personal Data Protection Act, 2023. We maintain a Grievance Officer node to address your concerns within 72 hours of report synchronization.
            </p>
          </div>
        </section>

        <div className="pt-8 text-center pb-12">
          <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium border border-border px-4 py-2 rounded-full">
            <Globe size={10} />
            Aura Protocol v2.5.0 • Updated Oct 2024
          </div>
        </div>
      </div>
    </div>
  );
}
