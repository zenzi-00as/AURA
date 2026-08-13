
import { PlanType, UserProfile } from "./types";

export const PLAN_LIMITS = {
  Free: {
    maxRadiusKm: 50,
    dailyLikes: 25,
    dailyNewChats: 5,
    dailyMessagesPerProfile: 10,
    dailyMediaUploads: 2,
    advancedFilters: false,
    blurredPhotos: true,
    adsEnabled: true,
  },
  Elite: {
    maxRadiusKm: 100,
    dailyLikes: Infinity,
    dailyNewChats: Infinity,
    dailyMessagesPerProfile: Infinity,
    dailyMediaUploads: Infinity,
    advancedFilters: true,
    blurredPhotos: false,
    adsEnabled: false,
  }
};

export function checkPlanLimit(profile: UserProfile | null, type: keyof typeof PLAN_LIMITS.Free) {
  if (!profile) return PLAN_LIMITS.Free[type];
  const plan = profile.plan || 'Free';
  return PLAN_LIMITS[plan][type];
}

export function isElite(profile: UserProfile | null) {
  return profile?.plan === 'Elite';
}

export function isSpotlightActive(profile: UserProfile | null) {
  if (!profile?.spotlightExpiry) return false;
  const expiry = profile.spotlightExpiry.toDate ? profile.spotlightExpiry.toDate() : new Date(profile.spotlightExpiry);
  return expiry > new Date();
}
