'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/firebase/auth-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function AuthGuard({ children, requireOnboarding = true }: AuthGuardProps) {
  const router = useRouter();
  const { user, loading, onboardingCompleted } = useAuthContext();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth');
    } else if (requireOnboarding && !onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [user, loading, onboardingCompleted, requireOnboarding, router]);

  if (loading || !user || (requireOnboarding && !onboardingCompleted)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <div className="w-20 h-20 rounded-[28px] fuchsia-gradient flex items-center justify-center aura-glow aura-pulse shadow-xl shadow-primary/20 mb-6">
          <span className="text-3xl font-bold text-white tracking-tighter">A</span>
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
