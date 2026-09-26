"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from '@/firebase/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Aura Authentication & Synchronization Guard.
 * Hardened to enforce email verification, onboarding and terms acceptance state.
 */

interface AuthGuardProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function AuthGuard({ children, requireOnboarding = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, onboardingCompleted, needsTermsAcceptance, isEmailVerified } = useAuthContext();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting) return;

    // 1. Authenticated Perimeter
    if (!user && pathname !== '/auth') {
      setIsRedirecting(true);
      router.replace('/auth');
      return;
    }

    if (user) {
      // 2. Email Verification Perimeter (Highest Priority)
      // Note: Google users have emailVerified: true by default.
      if (!isEmailVerified && pathname !== '/auth/verify-email' && pathname !== '/auth') {
        setIsRedirecting(true);
        router.replace('/auth/verify-email');
        return;
      }

      // 3. Terms Acceptance Perimeter
      if (isEmailVerified && needsTermsAcceptance && pathname !== '/auth/terms') {
        setIsRedirecting(true);
        router.replace('/auth/terms');
        return;
      }

      // 4. Onboarding Perimeter
      if (isEmailVerified && !needsTermsAcceptance && requireOnboarding && !onboardingCompleted && 
          pathname !== '/onboarding' && pathname !== '/auth/terms' && pathname !== '/auth/verify-email') {
        setIsRedirecting(true);
        router.replace('/onboarding');
        return;
      }
    }
  }, [user, loading, onboardingCompleted, needsTermsAcceptance, isEmailVerified, requireOnboarding, router, pathname, isRedirecting]);

  if (loading || isRedirecting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <div className="w-20 h-20 rounded-[28px] blue-gradient flex items-center justify-center aura-glow aura-pulse shadow-xl shadow-primary/20 mb-6">
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Synchronizing Aura</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
