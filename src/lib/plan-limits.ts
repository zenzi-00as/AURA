
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

export function isSpotlightActive(profile: UserProfile | null) {
  if (!profile?.spotlightExpiry) return false;
  const expiry = profile.spotlightExpiry.toDate ? profile.spotlightExpiry.toDate() : new Date(profile.spotlightExpiry);
  return expiry > new Date();
}
