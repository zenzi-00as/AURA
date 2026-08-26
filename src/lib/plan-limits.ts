/**
 * @fileOverview Proxy module for plan limits, now definitively synchronized with the central engine.
 */
import { useAuthContext } from "@/firebase/auth-context";
import { UserProfile } from "./types";
import { 
  getEffectivePlan, 
  getPlanConfig, 
  PLAN_CONFIG as ENGINE_PLAN_CONFIG,
  isElite as engineIsElite,
  isElitePlus as engineIsElitePlus,
  isSpotlightActive as engineIsSpotlightActive
} from "./subscription-engine";

export const PLAN_CONFIG = ENGINE_PLAN_CONFIG;

export function checkPlanLimit(profile: UserProfile | null, type: string) {
  const planId = getEffectivePlan(profile);
  const config = getPlanConfig(planId);
  // Map legacy type keys to engine config keys
  const keyMap: Record<string, keyof typeof config> = {
    maxRadiusKm: 'searchRadiusKm',
    dailyLikes: 'likesPerDay',
    dailyNewChats: 'newChatsPerDay',
    dailyMediaUploads: 'mediaPerDay',
    adsEnabled: 'ads'
  };
  const key = keyMap[type] || type;
  return (config as any)[key];
}

export const isElite = engineIsElite;
export const isElitePlus = engineIsElitePlus;
export const isSpotlightActive = engineIsSpotlightActive;

export function usePlan() {
  const { profile, effectivePlan } = useAuthContext();
  const config = getPlanConfig(effectivePlan as any);

  const getRemaining = (used: number, limit: number | null) => {
    if (limit === null) return "Unlimited";
    return Math.max(0, limit - used).toString();
  };

  return {
    plan: effectivePlan,
    isElite: engineIsElite(profile),
    isElitePlus: engineIsElitePlus(profile),
    config,
    maxRadius: config.searchRadiusKm,
    remainingDailyChats: getRemaining(profile?.usage?.newChatsUsed || 0, config.newChatsPerDay),
    remainingDailyLikes: getRemaining(profile?.usage?.likesUsed || 0, config.likesPerDay),
    remainingDailyMedia: getRemaining(profile?.usage?.mediaUsed || 0, config.mediaPerDay),
    canChat: config.newChatsPerDay === null || (profile?.usage?.newChatsUsed || 0) < config.newChatsPerDay,
    canLike: config.likesPerDay === null || (profile?.usage?.likesUsed || 0) < config.likesPerDay,
    canSendMedia: config.mediaPerDay === null || (profile?.usage?.mediaUsed || 0) < config.mediaPerDay,
  };
}
