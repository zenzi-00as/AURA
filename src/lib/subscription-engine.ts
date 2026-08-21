
import { PlanType, UserProfile } from "./types";
import { format } from "date-fns";

export interface PlanConfig {
  id: PlanType;
  displayName: string;
  price: number;
  newChatsPerDay: number | null;
  searchRadiusKm: number;
  likesPerDay: number | null;
  mediaPerDay: number | null;
  profilePhotos: 'blurred' | 'visible';
  incognito: boolean;
  readReceipts: boolean;
  filters: 'none' | 'basic' | 'advanced';
  whoLikesYou: 'locked' | 'limited' | 'full';
  ads: 'full' | 'reduced' | 'none';
  priorityDiscovery: 'none' | 'true' | 'highest';
}

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    displayName: "Aura Free",
    price: 0,
    newChatsPerDay: 5,
    searchRadiusKm: 25,
    likesPerDay: 5,
    mediaPerDay: 2,
    profilePhotos: 'blurred',
    incognito: false,
    readReceipts: false,
    filters: 'none',
    whoLikesYou: 'locked',
    ads: 'full',
    priorityDiscovery: 'none',
  },
  elite: {
    id: 'elite',
    displayName: "Aura Elite",
    price: 99,
    newChatsPerDay: 15,
    searchRadiusKm: 50,
    likesPerDay: 10,
    mediaPerDay: 5,
    profilePhotos: 'blurred',
    incognito: false,
    readReceipts: true,
    filters: 'basic',
    whoLikesYou: 'limited',
    ads: 'reduced',
    priorityDiscovery: 'true',
  },
  elite_plus: {
    id: 'elite_plus',
    displayName: "Aura Elite Plus",
    price: 199,
    newChatsPerDay: null,
    searchRadiusKm: 100,
    likesPerDay: null,
    mediaPerDay: null,
    profilePhotos: 'visible',
    incognito: true,
    readReceipts: true,
    filters: 'advanced',
    whoLikesYou: 'full',
    ads: 'none',
    priorityDiscovery: 'highest',
  }
};

export type CheckResult = {
  allowed: boolean;
  reason?: 'LIMIT_REACHED' | 'FEATURE_LOCKED' | 'SUBSCRIPTION_EXPIRED' | 'UNAUTHENTICATED';
  limit?: number | null;
  used?: number;
  remaining?: number | 'Unlimited';
};

export function getEffectivePlan(profile: UserProfile | null): PlanType {
  if (!profile) return 'free';
  if (profile.isDemoUser && profile.subscription?.planId) return profile.subscription.planId as PlanType;
  
  const plan = (profile.plan as PlanType) || 'free';
  if (plan === 'free') return 'free';

  if (profile.subscription?.expiresAt) {
    const expiryDate = profile.subscription.expiresAt.toDate ? profile.subscription.expiresAt.toDate() : new Date(profile.subscription.expiresAt);
    if (expiryDate <= new Date()) return 'free';
  }

  return plan;
}

export function getPlanConfig(planId: PlanType): PlanConfig {
  return PLAN_CONFIG[planId] || PLAN_CONFIG.free;
}

export function checkActionAllowed(
  profile: UserProfile | null, 
  action: 'newChat' | 'like' | 'media'
): CheckResult {
  const planId = getEffectivePlan(profile);
  const config = getPlanConfig(planId);
  const usage = profile?.usage || { newChatsUsed: 0, likesUsed: 0, mediaUsed: 0, lastResetDate: '' };

  const today = format(new Date(), 'yyyy-MM-dd');
  const isStale = usage.lastResetDate !== today;
  
  const used = isStale ? 0 : (
    action === 'newChat' ? usage.newChatsUsed :
    action === 'like' ? usage.likesUsed :
    usage.mediaUsed
  );

  const limit = (
    action === 'newChat' ? config.newChatsPerDay :
    action === 'like' ? config.likesPerDay :
    config.mediaPerDay
  );

  if (limit === null) {
    return { allowed: true, limit: null, used, remaining: 'Unlimited' };
  }

  const remaining = Math.max(0, limit - used);
  if (remaining <= 0) {
    return { allowed: false, reason: 'LIMIT_REACHED', limit, used, remaining: 0 };
  }

  return { allowed: true, limit, used, remaining };
}
