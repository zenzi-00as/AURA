"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/firebase/auth-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function AuthGuard({ children, requireOnboarding = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, onboardingCompleted } = useAuthContext();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting) return;

    if (!user && pathname !== '/auth') {
      setIsRedirecting(true);
      router.replace('/auth');
    } else if (requireOnboarding && !onboardingCompleted && pathname !== '/onboarding') {
      setIsRedirecting(true);
      router.replace('/onboarding');
    }
  }, [user, loading, onboardingCompleted, requireOnboarding, router, pathname, isRedirecting]);

  if (loading || !user || (requireOnboarding && !onboardingCompleted) || isRedirecting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <div className="w-20 h-20 rounded-[28px] blue-gradient flex items-center justify-center aura-glow aura-pulse shadow-xl shadow-primary/20 mb-6">
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}