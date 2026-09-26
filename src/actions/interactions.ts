'use server';

/**
 * @fileOverview Atomic Interaction Hub.
 * Hardened for Admin SDK execution to bypass client-side entitlement restrictions.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { checkActionAllowed } from "@/lib/subscription-engine";
import { checkIsBlocked } from "./moderation";
import { logger } from "@/lib/logger";

export async function handleSecureLike(fromUid: string, toUid: string, type: 'like' | 'super_like') {
  const correlationId = logger.generateCorrelationId();

  // BLOCKING CHECK
  const blocked = await checkIsBlocked(fromUid, toUid);
  if (blocked) return { success: false, error: "Interaction restricted by safety protocol" };

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection("users").doc(fromUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("User node not found");

      const profile = userSnap.data() as any;

      if (type === 'like') {
        const check = checkActionAllowed(profile, 'like');
        if (!check.allowed) throw new Error("Daily like limit reached");
        
        transaction.update(userRef, { 
          'usage.likesUsed': FieldValue.increment(1),
          updatedAt: Timestamp.now()
        });
      } else {
        // SUPER LIKE: Trusted Balance Verification
        if ((profile.superLikeBalance || 0) <= 0) throw new Error("Insufficient Super Like credits");
        
        transaction.update(userRef, { 
          superLikeBalance: FieldValue.increment(-1),
          updatedAt: Timestamp.now()
        });
      }

      const likeId = `${fromUid}_${toUid}`;
      const likeRef = adminDb.collection("likes").doc(likeId);
      transaction.set(likeRef, {
        id: likeId,
        fromUserId: fromUid,
        toUserId: toUid,
        type: type,
        createdAt: Timestamp.now(),
        status: 'active'
      });

      // Recipient Notification Center Dispatch
      const targetRef = adminDb.collection("users").doc(toUid);
      const targetSnap = await transaction.get(targetRef);
      if (targetSnap.exists) {
        const targetPrefs = targetSnap.data()?.notificationPreferences;
        if (targetPrefs?.newMatches !== false) {
           const notifRef = adminDb.collection("notifications").doc();
           transaction.set(notifRef, {
             recipientId: toUid,
             senderId: fromUid,
             type: type,
             title: type === 'super_like' ? "Super Match! ✦" : "New Interest",
             body: `${profile.name} ${type === 'super_like' ? "Super Liked" : "Liked"} your Aura.`,
             createdAt: Timestamp.now(),
             read: false
           });
        }
      }

      logger.info('Secure Interaction Recorded via Admin SDK', { correlationId, type, fromUid, toUid });
      return { success: true };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function handleSecureChat(fromUid: string, roomId: string, text: string) {
  const correlationId = logger.generateCorrelationId();

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const roomRef = adminDb.collection("chatRooms").doc(roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists) throw new Error("Communication node not found");

      const participants = roomSnap.data()?.participants;
      const otherUid = participants?.find((id: string) => id !== fromUid);

      if (otherUid && !roomId.startsWith('system_')) {
        const blocked = await checkIsBlocked(fromUid, otherUid);
        if (blocked) throw new Error("Messaging restricted by safety protocol");
      }

      const userRef = adminDb.collection("users").doc(fromUid);
      const userSnap = await transaction.get(userRef);
      const profile = userSnap.data() as any;

      if (roomSnap.data()?.lastMessage === "" && !roomId.startsWith('system_')) {
        const check = checkActionAllowed(profile, 'newChat');
        if (!check.allowed) throw new Error("Daily chat synchronization limit reached");
        transaction.update(userRef, { 'usage.newChatsUsed': FieldValue.increment(1) });
      }

      const msgRef = adminDb.collection("chatRooms").doc(roomId).collection("messages").doc();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
      
      transaction.set(msgRef, {
        id: msgRef.id,
        senderId: fromUid,
        text,
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        seen: false
      });

      transaction.update(roomRef, {
        lastMessage: text,
        lastTimestamp: Timestamp.now(),
        [`unreadCount.${otherUid}`]: FieldValue.increment(1)
      });

      logger.info('Secure Chat Synchronized via Admin SDK', { correlationId, roomId, fromUid });
      return { success: true };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
