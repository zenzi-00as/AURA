
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthContext } from "@/firebase/auth-context";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, updateDoc, doc, serverTimestamp, addDoc, limit } from "firebase/firestore";
import { UserProfile, Report } from "@/lib/types";
import { Shield, UserCheck, UserX, Star, Zap, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { profile } = useAuthContext();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');

  const { data: users, loading: usersLoading } = useCollection<UserProfile>(
    db ? query(collection(db, "users"), limit(50)) : null
  );

  const { data: reports } = useCollection<Report>(
    db ? query(collection(db, "reports"), limit(50)) : null
  );

  const handleAction = async (uid: string, action: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    
    try {
      switch (action) {
        case 'verify':
          await updateDoc(userRef, { verificationStatus: 'Verified' });
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
          <div className="flex gap-2">
            <Button variant={activeTab === 'users' ? 'default' : 'ghost'} onClick={() => setActiveTab('users')}>Users</Button>
            <Button variant={activeTab === 'reports' ? 'default' : 'ghost'} onClick={() => setActiveTab('reports')}>Reports</Button>
          </div>
        </header>

        <div className="p-6 space-y-4">
          {activeTab === 'users' ? (
            users.map(u => (
              <div key={u.uid} className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {u.name}, {u.age}
                    {u.verificationStatus === 'Verified' && <Shield size={14} className="text-primary" />}
                    {u.plan === 'Elite' && <Star size={14} className="text-accent" />}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase">{u.uid}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'verify')} title="Verify"><UserCheck size={16} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'grantElite')} title="Grant Elite"><Star size={16} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, 'grantSpotlight')} title="Grant Spotlight"><Zap size={16} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleAction(u.uid, u.isSuspended ? 'unsuspend' : 'suspend')} className={u.isSuspended ? "text-emerald-500" : "text-destructive"}>
                    <UserX size={16} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            reports.map(r => (
              <div key={r.id} className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-2">
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
            ))
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
