
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ArrowLeft, 
  Trophy, 
  Check, 
  Info, 
  ShieldCheck, 
  ChevronRight, 
  Heart, 
  Zap, 
  Lock,
  Globe,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuthContext } from "@/firebase/auth-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { SuperFund } from "@/lib/types";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000, 2500];

export default function SuperFundPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatPrice, currency } = useCurrency();
  const { profile, user: authUser } = useAuthContext();
  const db = useFirestore();
  const { toast } = useToast();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Leaderboard Query: All verified funds, top 50
  const fundsQuery = useMemoFirebase(() => {
    // SECURITY: Ensure authUser is initialized before attempting to query public funds
    if (!db || !authUser) return null;
    return query(
      collection(db, "superFunds"),
      where("status", "==", "verified"),
      orderBy("amount", "desc"),
      limit(50)
    );
  }, [db, authUser?.uid]);

  const { data: leaderboard, loading: loadingLeaderboard } = useCollection<SuperFund>(fundsQuery as any);

  const amountToPay = selectedAmount || parseInt(customAmount) || 0;

  const handleSupport = () => {
    if (!amountToPay || amountToPay < 10) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Minimum contribution is ₹10." });
      return;
    }
    if (!authUser || !db) return;

    setIsProcessing(true);
    initializeRazorpayPayment({
      amount: amountToPay,
      currency: currency.code,
      itemType: 'SuperFund',
      onSuccess: async (res) => {
        const fundData = {
          userId: authUser.uid,
          displayName: isAnonymous ? "Anonymous Supporter" : (profile?.name || "Aura Member"),
          amount: amountToPay,
          currency: currency.code,
          isAnonymous,
          status: 'verified',
          timestamp: serverTimestamp(),
          paymentOrderId: res.razorpay_order_id,
          paymentId: res.razorpay_payment_id
        };

        try {
          // 1. Create Fund Record
          await addDoc(collection(db, "superFunds"), fundData);

          // 2. Update User Badge Status
          await updateDoc(doc(db, "users", authUser.uid), {
            isSuperFunder: true,
            updatedAt: serverTimestamp()
          });

          // 3. Create Notification
          await addDoc(collection(db, "notifications"), {
            userId: authUser.uid,
            title: "Super Fund Synchronized ✨",
            body: `Thank you for supporting Aura's growth with a ${formatPrice(amountToPay)} contribution.`,
            type: "super_fund",
            timestamp: serverTimestamp(),
            read: false
          });

          setShowSuccess(true);
        } catch (e) {
          toast({ variant: "destructive", title: "Sync Fault", description: "Payment successful, but record sync failed. Contact support." });
        } finally {
          setIsProcessing(false);
        }
      },
      onFailure: () => setIsProcessing(false)
    });
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background min-h-screen">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-[32px] premium-gradient flex items-center justify-center shadow-2xl neon-glow mb-8"
        >
          <Sparkles size={48} className="text-white" />
        </motion.div>
        <div className="space-y-4 mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Support Materialized!</h2>
          <p className="text-white/60 font-light leading-relaxed max-w-[280px] mx-auto">
            Your {formatPrice(amountToPay)} Super Fund has been successfully synchronized with Aura's development core.
          </p>
        </div>
        <div className="w-full space-y-3">
          <Button onClick={() => router.push('/dashboard')} className="w-full h-16 rounded-[28px] premium-gradient font-bold text-lg">Return to Aura</Button>
          <Button variant="ghost" onClick={() => setShowSuccess(false)} className="w-full h-12 text-[10px] font-bold uppercase tracking-widest text-white/40">View Leaderboard</Button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background pb-32 transition-colors min-h-screen">
        <header className="px-6 h-20 flex items-center gap-4 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-20 safe-top">
          <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors p-2 -ml-2">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-white">Super Fund</h1>
        </header>

        <div className="p-8 space-y-12">
          {/* Hero Section */}
          <section className="text-center space-y-4 py-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-16 h-16 rounded-[24px] premium-gradient flex items-center justify-center mx-auto shadow-xl shadow-primary/20 mb-6"
            >
              <Sparkles size={32} className="text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold tracking-tighter text-white">Support Aura ✨</h2>
            <p className="text-sm text-white/40 font-light leading-relaxed max-w-[280px] mx-auto italic">
              Voluntary contributions help us build, maintain, and evolve the connection experience for the entire community.
            </p>
          </section>

          {/* Amount Selection */}
          <section className="space-y-8">
            <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Select Support Level</label>
                  {amountToPay > 0 && <span className="text-sm font-bold text-white">{formatPrice(amountToPay)}</span>}
               </div>
               <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={`amt-${amt}`}
                      onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                      className={cn(
                        "h-12 rounded-xl text-xs font-bold transition-all border",
                        selectedAmount === amt 
                          ? "premium-gradient border-transparent text-white neon-glow" 
                          : "bg-white/5 border-white/5 text-white/60"
                      )}
                    >
                      {currency.symbol}{amt}
                    </button>
                  ))}
               </div>
               <div className="relative glass rounded-2xl p-0.5 mt-2 focus-within:neon-glow transition-all">
                  <Input 
                    placeholder="Custom Amount (Min ₹10)" 
                    type="number"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    className="h-14 bg-transparent border-none text-center text-white font-bold placeholder:text-white/20 focus:ring-0 shadow-none"
                  />
               </div>
            </div>

            <div className="flex items-center justify-between p-6 rounded-[32px] bg-white/5 border border-white/5">
               <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Support Anonymously</h4>
                  <p className="text-[10px] text-white/40">Hide your identity on the leaderboard.</p>
               </div>
               <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} className="data-[state=checked]:bg-primary" />
            </div>

            <Button 
              onClick={handleSupport}
              disabled={isProcessing || !amountToPay}
              className="w-full h-16 rounded-[28px] premium-gradient text-white font-bold text-lg shadow-xl shadow-primary/20 neon-glow flex items-center justify-center gap-3"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <><Heart size={20} /> Support Aura {amountToPay > 0 && `— ${formatPrice(amountToPay)}`}</>}
            </Button>
          </section>

          {/* Leaderboard Section */}
          <section className="space-y-6 pt-4">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                   <Trophy size={18} className="text-primary" />
                   <h3 className="text-xs font-bold text-white uppercase tracking-widest">Global Supporters</h3>
                </div>
                <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">ALL TIME</span>
             </div>

             <div className="space-y-3">
                {loadingLeaderboard ? (
                  Array(3).fill(0).map((_, i) => <div key={`skel-${i}`} className="h-16 w-full rounded-2xl bg-white/5 animate-pulse" />)
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((fund, idx) => {
                    const isTop3 = idx < 3;
                    const rankColors = [
                      "from-amber-400 to-amber-600 shadow-amber-500/20", 
                      "from-slate-300 to-slate-500 shadow-slate-400/20", 
                      "from-orange-400 to-orange-600 shadow-orange-500/20"
                    ];

                    return (
                      <motion.div 
                        key={fund.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "p-4 rounded-[24px] border flex items-center justify-between transition-all",
                          isTop3 ? "bg-white/10 border-white/10 shadow-lg" : "bg-white/5 border-white/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg",
                              isTop3 ? `bg-gradient-to-br ${rankColors[idx]}` : "bg-white/5"
                           )}>
                              {idx + 1}
                           </div>
                           <div className="space-y-0.5">
                              <h4 className={cn("text-sm font-bold", isTop3 ? "text-white" : "text-white/60")}>
                                 {fund.isAnonymous ? "Anonymous Supporter" : fund.displayName}
                              </h4>
                              <p className="text-[9px] text-white/30 uppercase tracking-widest">verified aura supporter</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-primary tabular-nums">{formatPrice(fund.amount)}</p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center space-y-3">
                     <Sparkles size={40} className="text-white/10 mx-auto" />
                     <p className="text-sm text-white/30 italic">Be the first to support Aura.</p>
                  </div>
                )}
             </div>
          </section>

          {/* How it Works Section */}
          <section className="glass-card p-8 rounded-[40px] border border-white/10 space-y-8 bg-gradient-to-br from-primary/5 to-transparent">
             <div className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Info size={16} className="text-primary" />
                  How Super Fund Works
                </h3>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Super Fund is a voluntary engagement mechanism for members who want to definitively support the Aura mission.
                </p>
             </div>

             <div className="space-y-6">
                {[
                  { title: "Select Level", desc: "Choose a suggested amount or define your own contribution packet." },
                  { title: "Secure Checkout", desc: "Complete the transaction through our hardware-locked payment gateway." },
                  { title: "Verification", desc: "Aura verifies the signature before materializing your support record." },
                  { title: "Recognition", desc: "If public, your identity is added to the global leaderboard." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                     <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-black shrink-0">{i+1}</div>
                     <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">{step.title}</h4>
                        <p className="text-[10px] text-white/40 leading-relaxed font-light">{step.desc}</p>
                     </div>
                  </div>
                ))}
             </div>

             <div className="pt-4 flex items-center gap-3 text-emerald-500 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                <ShieldCheck size={18} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Transparency: Funds are utilized for infrastructure & development.</span>
             </div>
          </section>

          {/* FAQ Section */}
          <section className="space-y-6 pb-12">
             <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-1 text-center">Frequently Asked Questions</h3>
             <div className="space-y-3">
                {[
                  { q: "Is this a subscription?", a: "No. Super Fund is a one-time voluntary contribution." },
                  { q: "Does it grant Elite access?", a: "No. Super Fund supports the platform, while Elite unlocks personal features." },
                  { q: "Can I get a refund?", a: "Super Fund contributions are voluntary and generally non-refundable." }
                ].map((faq, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                     <h4 className="text-xs font-bold text-white/80">Q: {faq.q}</h4>
                     <p className="text-[10px] text-white/40 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}
