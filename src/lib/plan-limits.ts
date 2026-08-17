
import { useAuthContext } from "@/firebase/auth-context";
import { PlanType, UserProfile } from "./types";

export const PLAN_CONFIG = {
  Free: {
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
  Elite: {
    displayName: "Aura Elite",
    maxRadiusKm: 50,
    dailyLikes: 10,
    dailyNewChats: 15,
    dailyMessagesPerProfile: 50,
    dailyMediaUploads: 5,
    advancedFilters: false, // Only basic
    blurredPhotos: true,
    adsEnabled: true, // Reduced
    seeWhoLikesYou: true, // Limited preview
    prioritySupport: true,
    earlyAccess: false,
    incognito: false,
  },
  ElitePlus: {
    displayName: "Aura Elite Plus",
    maxRadiusKm: 100,
    dailyLikes: 999999,
    dailyNewChats: 999999,
    dailyMessagesPerProfile: 999999,
    dailyMediaUploads: 999999,
    advancedFilters: true,
    blurredPhotos: false,
    adsEnabled: false,
    seeWhoLikesYou: true, // Full
    prioritySupport: true,
    earlyAccess: true,
    incognito: true,
  }
};

export function checkPlanLimit(profile: UserProfile | null, type: keyof typeof PLAN_CONFIG.Free) {
  if (!profile) return PLAN_CONFIG.Free[type];
  const plan = profile.plan as keyof typeof PLAN_CONFIG || 'Free';
  return PLAN_CONFIG[plan][type];
}

export function isElite(profile: UserProfile | null) {
  return profile?.plan === 'Elite' || profile?.plan === 'ElitePlus';
}

export function isElitePlus(profile: UserProfile | null) {
  return profile?.plan === 'ElitePlus';
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
  const plan = (profile?.plan as keyof typeof PLAN_CONFIG) || 'Free';
  const config = PLAN_CONFIG[plan];

  return {
    plan,
    isElite: plan === 'Elite' || plan === 'ElitePlus',
    isElitePlus: plan === 'ElitePlus',
    config,
    remainingDailyChats: config.dailyNewChats >= 999999 ? 999999 : Math.max(0, config.dailyNewChats - (profile?.dailyChatCount || 0)),
    remainingDailyLikes: config.dailyLikes >= 999999 ? 999999 : Math.max(0, config.dailyLikeCount - (profile?.dailyLikeCount || 0)),
    remainingDailyMedia: config.dailyMediaUploads >= 999999 ? 999999 : Math.max(0, config.dailyMediaUploads - (profile?.dailyMediaCount || 0)),
    canChat: config.dailyNewChats >= 999999 || (profile?.dailyChatCount || 0) < config.dailyNewChats,
    canLike: config.dailyLikes >= 999999 || (profile?.dailyLikeCount || 0) < config.dailyLikes,
    canSendMedia: config.dailyMediaUploads >= 999999 || (profile?.dailyMediaCount || 0) < config.dailyMediaUploads,
    maxRadiusKm: config.maxRadiusKm,
    canUseAdvancedFilters: config.advancedFilters,
    canSeeWhoLikesYou: config.seeWhoLikesYou,
    canViewProfileImages: !config.blurredPhotos,
  };
}
