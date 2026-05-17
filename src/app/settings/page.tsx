"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Shield, 
  Bell, 
  UserX, 
  LogOut, 
  Trash2, 
  Globe, 
  Smartphone,
  ChevronRight,
  AlertTriangle,
  X,
  User
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const MOCK_BLOCKED_USERS = [
  { id: "b1", name: "Stranger12", date: "2 days ago" },
  { id: "b2", name: "SpamBot99", date: "1 week ago" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    privateProfile: false,
  });
  const [blockedUsers, setBlockedUsers] = useState(MOCK_BLOCKED_USERS);
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUnblock = (id: string, name: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
    toast({
      title: "User Unblocked",
      description: `${name} can now find and message you again.`,
    });
  };

  const handleDeleteAccount = () => {
    toast({
      variant: "destructive",
      title: "Account Deleted",
      description: "Your account and all associated data have been permanently removed.",
    });
    router.push("/auth");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0C0B0D] pb-12">
      <header className="px-6 h-20 flex items-center gap-4 border-b border-white/5 bg-[#0C0B0D]/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* Privacy Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield size={14} className="text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Privacy & Safety</h2>
          </div>
          <div className="space-y-2">
            <Dialog open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                      <UserX size={18} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white">Blocked Users</h3>
                      <p className="text-xs text-muted-foreground font-light">Manage who can't contact you.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A181C] border-white/10 text-white rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-6 sm:p-8">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold">Blocked Users</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                    People in this list won't be able to message you or see your profile on Aura.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {blockedUsers.length > 0 ? (
                      blockedUsers.map((user) => (
                        <motion.div
                          key={user.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground">
                              <User size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-[10px] text-muted-foreground">Blocked {user.date}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnblock(user.id, user.name)}
                            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 rounded-xl px-4"
                          >
                            Unblock
                          </Button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted-foreground">
                          <Shield size={24} />
                        </div>
                        <p className="text-sm text-muted-foreground font-light">Your blocked list is clear.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={() => setIsBlockedListOpen(false)}
                    className="w-full h-14 rounded-2xl bg-white/5 text-white font-medium text-lg hover:bg-white/10 transition-colors"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Bell size={14} className="text-secondary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Notifications</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-6 bg-white/5 rounded-[32px] border border-white/5">
              <div className="space-y-1">
                <h3 className="font-medium text-white">Push Notifications</h3>
                <p className="text-xs text-muted-foreground font-light">Alerts for messages and activity.</p>
              </div>
              <Switch 
                checked={settings.notifications} 
                onCheckedChange={() => toggleSetting('notifications')} 
              />
            </div>
          </div>
        </section>

        {/* App Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Smartphone size={14} className="text-muted-foreground" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">General</h2>
          </div>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors text-white font-medium">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                  <Globe size={18} />
                </div>
                <span>Language</span>
              </div>
              <span className="text-xs text-muted-foreground">English</span>
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-4">
          <h2 className="text-[10px] font-bold text-destructive uppercase tracking-widest px-1">Account Actions</h2>
          <div className="space-y-2">
            <button 
              onClick={() => router.push("/auth")}
              className="w-full flex items-center gap-4 p-6 bg-white/5 rounded-[32px] border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all text-white group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-rose-500 transition-colors">
                <LogOut size={18} />
              </div>
              <span className="font-medium">Sign Out</span>
            </button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-4 p-6 bg-rose-500/5 rounded-[32px] border border-rose-500/10 hover:bg-rose-500/10 transition-all text-rose-500 group">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Trash2 size={18} />
                  </div>
                  <span className="font-medium">Delete Account</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1A181C] border-white/10 text-white rounded-[32px] w-[calc(100%-40px)] max-w-[400px] p-8">
                <AlertDialogHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2 text-center">
                    <AlertDialogTitle className="text-2xl font-semibold">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-sm font-light leading-relaxed">
                      This action is permanent and cannot be undone. All your messages, matches, and profile data will be scrubbed from Aura.
                    </AlertDialogDescription>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-3 pt-4 sm:flex-col">
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-medium text-lg hover:bg-destructive/90 transition-colors"
                  >
                    Delete Permanently
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full h-12 rounded-xl bg-white/5 border-transparent text-muted-foreground hover:bg-white/10 hover:text-white transition-colors">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <div className="pt-8 text-center space-y-2 pb-12">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Aura v1.0.4</p>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground underline decoration-white/10">
            <button>Terms</button>
            <button>Privacy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
