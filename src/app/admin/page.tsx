"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthContext } from "@/firebase/auth-context";
import { useCollection, useFirestore, initializeFirebase } from "@/firebase";
import { collection, query, updateDoc, doc, serverTimestamp, limit, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { UserProfile, Report } from "@/lib/types";
import { Shield, UserCheck, UserX, Star, ArrowLeft, ShieldCheck, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const { profile } = useAuthContext();
  const db = useFirestore();
  const { storage } = initializeFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'verifications'>('users');
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: users } = useCollection<UserProfile>(
    db ? query(collection(db, "users"), limit(100)) : null
  );

  const { data: reports } = useCollection<Report>(
    db ? query(collection(db, "reports"), limit(50)) : null
  );

  const { data: verifications } = useCollection<UserProfile>(
    db ? query(collection(db, "users"), where("verificationStatus", "==", "Pending"), limit(50)) : null
  );

  const handleAction = async (uid: string, action: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    
    try {
      switch (action) {
        case 'verify':
          await updateDoc(userRef, { 
            verificationStatus: 'Verified',
            verification: { 
              status: 'approved',
              reviewedAt: serverTimestamp(),
              rejectionReason: null
            }
          });
          break;
        case 'reject':
          await updateDoc(userRef, { 
            verificationStatus: 'Rejected',
            verification: { 
              status: 'rejected',
              reviewedAt: serverTimestamp(),
              rejectionReason: rejectionReason
            }
          });
          setRejectionReason("");
          break;
        case 'grantElite':
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 28);
          await updateDoc(userRef, { plan: 'Elite', subscriptionEndDate: expiry });
          break;
        case 'grantSpotlight':
          const spotExpiry = new Date();
          spotExpiry.setDate(spotExpiry.getDate() + 7);
          await updateDoc(userRef, { spotlightExpiry: spotExpiry });
          break;
        case 'suspend':
          await updateDoc(userRef, { isSuspended: true });
          break;
        case 'unsuspend':
          await updateDoc(userRef, { isSuspended: false });
          break;
      }
      toast({ title: "Admin Action Successful", description: `${action} applied to user.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const openVerificationImage = async (imagePath: string) => {
    try {
      const url = await getDownloadURL(ref(storage, imagePath));
      window.open(url, '_blank');
    } catch (e) {
      toast({ variant: "destructive", title: "Could not load image" });
    }
  };

  if (!profile?.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <Shield size={64} className="text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have administrative privileges.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-8">Return to Safety</Button>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col bg-background min-h-screen">
        <header className="px-8 h-20 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-muted-foreground"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-bold">Aura Command</h1>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={activeTab === 'users' ? 'default' : 'ghost'} onClick={() => setActiveTab('users')}>Users</Button>
            <Button size="sm" variant={activeTab === 'verifications' ? 'default' : 'ghost'} onClick={() => setActiveTab('verifications')}>Verifications</Button>
            <Button size="sm" variant={activeTab === 'reports' ? 'default' : 'ghost'} onClick={() => setActiveTab('reports')}>Reports</Button>
          </div>
        </header>

        <div className="p-6 space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div key="admin-tab-users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {users.map((u, idx) => (
                  <div key={u.uid || `admin-user-${idx}`} className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {u.name}, {u.age}
                        {u.verificationStatus === 'Verified' && <ShieldCheck size={14} className="text-primary" />}
                        {u.plan === 'Elite' && <Star size={14} className="text-primary" />}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase">{u.uid}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'verify')} title="Verify"><UserCheck size={16} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'grantElite')} title="Grant Elite"><Star size={16} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'grantSpotlight')} title="Grant Spotlight"><Star size={16} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, u.isSuspended ? 'unsuspend' : 'suspend')} className={u.isSuspended ? "text-emerald-500" : "text-destructive"}>
                        <UserX size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'verifications' && (activeTab === 'verifications') && (
              <motion.div key="admin-tab-verifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="px-2">
                  <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={16} />
                    Pending Requests ({verifications.length})
                  </h2>
                </div>
                {verifications.length > 0 ? verifications.map((u, idx) => (
                  <div key={u.uid || `admin-v-${idx}`} className="p-5 rounded-[28px] border border-white/10 bg-white/5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{u.name}, {u.age}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{u.uid}</p>
                        <p className="text-xs text-white/60 line-clamp-1">{u.bio}</p>
                      </div>
                      <div className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-2">
                        <Clock size={12} className="text-amber-500" />
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Under Review</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex gap-3">
                      {u.verification?.imagePath && (
                        <Button 
                          onClick={() => openVerificationImage(u.verification!.imagePath!)}
                          className="flex-1 h-12 rounded-xl glass border border-white/10 text-white/80"
                        >
                          <ExternalLink size={16} className="mr-2" />
                          View Private Image
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleAction(u.uid, 'verify')}
                        className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      >
                        Approve
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="flex-1 h-12 rounded-xl">Reject</Button>
                        </DialogTrigger>
                        <DialogContent className="glass-dark border-white/10 rounded-[32px]">
                          <DialogHeader>
                            <DialogTitle>Reject Verification</DialogTitle>
                            <DialogDescription>Please provide a reason for the member.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Input placeholder="e.g. Image was too blurry" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" />
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleAction(u.uid, 'reject')} disabled={!rejectionReason.trim()} className="w-full h-12 rounded-xl">Confirm Rejection</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center space-y-4">
                    <ShieldCheck size={48} className="text-white/10 mx-auto" />
                    <p className="text-white/20 font-medium">No pending verification requests.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div key="admin-tab-reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {reports.map((r, idx) => (
                  <div key={r.id || `admin-report-${idx}`} className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold uppercase">Reporter: {r.reporterId}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.timestamp?.seconds * 1000).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">Reason: {r.reason}</p>
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" onClick={() => handleAction(r.targetId, 'suspend')}>Suspend Target</Button>
                      <Button size="sm" variant="ghost">Dismiss</Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
