
import { useAuthContext } from "@/firebase/auth-context";
import { PlanType, UserProfile } from "./types";

export const PLAN_CONFIG = {
  free: {
    displayName: "Aura Free",
    maxRadiusKm: 25,
    dailyLikes: 5,
    dailyNewChats: 5,
    dailyMessagesPerProfile: 10,
    dailyMediaUploads: 2,
    advancedFilters: false,
    blurredPhotos: true,
    adsEnabled: true,
    seeWhoLikesYou: false,
    prioritySupport: false,
    earlyAccess: false,
    incognito: false,
  },
  elite: {
    displayName: "Aura Elite",
    maxRadiusKm: 50,
    dailyLikes: 10,
    dailyNewChats: 15,
    dailyMessagesPerProfile: 50,
    dailyMediaUploads: 5,
    advancedFilters: false, 
    blurredPhotos: true,
    adsEnabled: true, 
    seeWhoLikesYou: true,
    prioritySupport: true,
    earlyAccess: false,
    incognito: false,
  },
  elite_plus: {
    displayName: "Aura Elite Plus",
    maxRadiusKm: 100,
    dailyLikes: 999999,
    dailyNewChats: 999999,
    dailyMessagesPerProfile: 999999,
    dailyMediaUploads: 999999,
    advancedFilters: true,
    blurredPhotos: false,
    adsEnabled: false,
    seeWhoLikesYou: true,
    prioritySupport: true,
    earlyAccess: true,
    incognito: true,
  }
};

export function checkPlanLimit(profile: UserProfile | null, type: keyof typeof PLAN_CONFIG.free) {
  if (!profile) return PLAN_CONFIG.free[type];
  const plan = (profile.plan as keyof typeof PLAN_CONFIG) || 'free';
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return config[type];
}

export function isElite(profile: UserProfile | null) {
  return profile?.plan === 'elite' || profile?.plan === 'elite_plus';
}

export function isElitePlus(profile: UserProfile | null) {
  return profile?.plan === 'elite_plus';
}

export function isSpotlightActive(profile: UserProfile | null | undefined) {
  if (!profile?.spotlightExpiry) return false;
  try {
    const expiry = profile.spotlightExpiry.toDate 
      ? profile.spotlightExpiry.toDate() 
      : (profile.spotlightExpiry instanceof Date ? profile.spotlightExpiry : new Date(profile.spotlightExpiry));
    return expiry > new Date();
  } catch (e) {
    return false;
  }
}

export function usePlan() {
  const { profile } = useAuthContext();
  const plan = (profile?.plan as keyof typeof PLAN_CONFIG) || 'free';
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;

  const getRemaining = (used: number, limit: number) => {
    if (limit >= 999999) return "Unlimited";
    return Math.max(0, limit - used).toString();
  };

  return {
    plan,
    isElite: plan === 'elite' || plan === 'elite_plus',
    isElitePlus: plan === 'elite_plus',
    config,
    maxRadius: config.maxRadiusKm,
    remainingDailyChats: getRemaining(profile?.dailyChatCount || 0, config.dailyNewChats),
    remainingDailyLikes: getRemaining(profile?.dailyLikeCount || 0, config.dailyLikes),
    remainingDailyMedia: getRemaining(profile?.dailyMediaCount || 0, config.dailyMediaUploads),
    canChat: config.dailyNewChats >= 999999 || (profile?.dailyChatCount || 0) < config.dailyNewChats,
    canLike: config.dailyLikes >= 999999 || (profile?.dailyLikeCount || 0) < config.dailyLikes,
    canSendMedia: config.dailyMediaUploads >= 999999 || (profile?.dailyMediaCount || 0) < config.dailyMediaUploads,
  };
}
