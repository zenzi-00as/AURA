import { useAuthContext } from "@/firebase/auth-context";
import { PlanType, UserProfile } from "./types";

export const PLAN_CONFIG = {
  Free: {
    displayName: "Aura Free",
    maxRadiusKm: 50,
    dailyLikes: 25,
    dailyNewChats: 5,
    dailyMessagesPerProfile: 10,
    dailyMediaUploads: 2,
    advancedFilters: false,
    blurredPhotos: true,
    adsEnabled: true,
    seeWhoLikesYou: false,
    prioritySupport: false,
    earlyAccess: false,
  },
  Elite: {
    displayName: "Aura Elite Plus",
    maxRadiusKm: 100,
    dailyLikes: Infinity,
    dailyNewChats: Infinity,
    dailyMessagesPerProfile: Infinity,
    dailyMediaUploads: Infinity,
    advancedFilters: true,
    blurredPhotos: false,
    adsEnabled: false,
    seeWhoLikesYou: true,
    prioritySupport: true,
    earlyAccess: true,
  }
};

export function checkPlanLimit(profile: UserProfile | null, type: keyof typeof PLAN_CONFIG.Free) {
  if (!profile) return PLAN_CONFIG.Free[type];
  const plan = profile.plan === 'Elite' ? 'Elite' : 'Free';
  return PLAN_CONFIG[plan][type];
}

export function isElite(profile: UserProfile | null) {
  return profile?.plan === 'Elite';
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
  const plan = profile?.plan === 'Elite' ? 'Elite' : 'Free';
  const config = PLAN_CONFIG[plan];

  return {
    plan,
    isElitePlus: plan === 'Elite',
    config,
    remainingDailyChats: config.dailyNewChats === Infinity ? Infinity : Math.max(0, config.dailyNewChats - (profile?.dailyChatCount || 0)),
    remainingDailyLikes: config.dailyLikes === Infinity ? Infinity : Math.max(0, config.dailyLikes - (profile?.dailyLikeCount || 0)),
    remainingDailyMedia: config.dailyMediaUploads === Infinity ? Infinity : Math.max(0, config.dailyMediaUploads - (profile?.dailyMediaCount || 0)),
    canChat: config.dailyNewChats === Infinity || (profile?.dailyChatCount || 0) < config.dailyNewChats,
    canLike: config.dailyLikes === Infinity || (profile?.dailyLikeCount || 0) < config.dailyLikes,
    canSendMedia: config.dailyMediaUploads === Infinity || (profile?.dailyMediaCount || 0) < config.dailyMediaUploads,
    maxRadiusKm: config.maxRadiusKm,
    canUseAdvancedFilters: config.advancedFilters,
    canSeeWhoLikesYou: config.seeWhoLikesYou,
    canViewProfileImages: !config.blurredPhotos,
  };
}
