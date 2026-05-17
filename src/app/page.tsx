
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@/firebase";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    // Wait for the auth state to be determined before redirecting
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          router.push("/dashboard");
        } else {
          router.push("/auth");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-3xl fuchsia-gradient aura-glow mb-6 flex items-center justify-center">
          <span className="text-4xl font-bold text-foreground">A</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-2">Aura</h1>
        <p className="text-muted-foreground font-light tracking-wide uppercase text-xs">Minimalist • Private • Real</p>
      </motion.div>

      {loading && (
        <motion.div 
          className="absolute bottom-12 flex gap-1"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        </motion.div>
      )}
    </div>
  );
}
