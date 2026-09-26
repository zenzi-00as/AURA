
'use server';

/**
 * @fileOverview Centralized Backend Notification Gating Node.
 * Ensures push notifications are only dispatched if preferences are synchronized.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, collection, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { NotificationType } from "@/lib/types";
import { logger } from "@/lib/logger";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Dispatches a categorized notification while respecting user preferences.
 * This is a server-side perimeter for FCM delivery.
 */
export async function sendCategorizedNotification(
  targetUid: string,
  category: NotificationType,
  payload: NotificationPayload
) {
  const { db } = initializeFirebase();
  const correlationId = logger.generateCorrelationId();

  if (!db) {
    logger.error("Notification Sync Fault: DB Unavailable", { correlationId });
    return { success: false, error: "System Sync Fault" };
  }

  try {
    // 1. Load User Notification Preferences
    const userRef = doc(db, "users", targetUid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return { success: false, error: "Identity node not found" };
    
    const profile = userSnap.data();
    const settings = profile.notificationSettings;

    // 2. GATING: Check Master Toggle and Category Preference
    const pushEnabled = settings?.pushEnabled ?? true;
    const categoryKey = getCategoryMapping(category);
    const categoryEnabled = categoryKey ? (settings?.[categoryKey] ?? true) : true;

    if (!pushEnabled || !categoryEnabled) {
      logger.info("Notification Suppressed: Preference Locked", { 
        correlationId, 
        targetUid, 
        category, 
        pushEnabled, 
        categoryEnabled 
      });
      return { success: true, suppressed: true };
    }

    // 3. FETCH ACTIVE FCM TOKENS
    const tokenSnap = await getDocs(collection(db, "users", targetUid, "notificationDevices"));
    const activeTokens = tokenSnap.docs
      .filter(d => d.data().enabled !== false)
      .map(d => d.data().token);

    if (activeTokens.length === 0) {
      logger.warn("No active messaging nodes found for target", { correlationId, targetUid });
      return { success: true, suppressed: true, reason: "no_tokens" };
    }

    // 4. DISPATCH (Note: Actual FCM dispatch requires Firebase Admin or a secure relay)
    // For this prototype, we record the intent and log the synchronized dispatch.
    logger.info("Push Notification Synchronized for Dispatch", {
      correlationId,
      targetUid,
      category,
      tokenCount: activeTokens.length,
      title: payload.title
    });

    return { success: true, tokenCount: activeTokens.length };

  } catch (e: any) {
    logger.error("Notification Lifecycle Exception", { 
      category: 'FCM_ERROR', 
      correlationId, 
      errorMessage: e.message 
    });
    return { success: false, error: e.message };
  }
}

function getCategoryMapping(type: NotificationType): string | null {
  const map: Record<NotificationType, string> = {
    message: 'newMessages',
    like: 'newLikes',
    super_like: 'superLikes',
    match: 'newMatches',
    proximity: 'profileViews',
    verification: 'verificationUpdates',
    subscription: 'membershipUpdates',
    payment: 'paymentUpdates',
    spotlight: 'spotlightUpdates',
    welcome: 'auraUpdates',
    super_fund: 'auraUpdates'
  };
  return map[type] || null;
}
