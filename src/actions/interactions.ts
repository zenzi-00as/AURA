'use server';

/**
 * @fileOverview Atomic Interaction Hub.
 * Standardized with Aura Monitoring Protocol and Block verification.
 * Enforces mandatory 24-hour message expiration.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, updateDoc, increment, serverTimestamp, collection, runTransaction, addDoc } from "firebase/firestore";
import { checkActionAllowed } from "@/lib/subscription-engine";
import { checkIsBlocked } from "./moderation";
import { logger } from "@/lib/logger";

export async function handleSecureLike(fromUid: string, toUid: string, type: 'like' | 'super_like') {
  const { db, auth } = initializeFirebase();
  const correlationId = logger.generateCorrelationId();

  if (!db || !auth?.currentUser) {
    logger.error('Interaction Failed: Auth Fault', { category: 'AUTH_ERROR', correlationId });
    return { success: false, error: "Authentication Sync Fault" };
  }

  if (auth.currentUser.uid !== fromUid) {
    logger.critical('Interaction Identity Spoof Attempt', { category: 'AUTH_ERROR', correlationId, actor: auth.currentUser.uid, targetUid: fromUid });
    return { success: false, error: "Unauthorized Identity Packet" };
  }

  const blocked = await checkIsBlocked(fromUid, toUid);
  if (blocked) {
    logger.warn('Blocked Interaction Attempted', { category: 'CHAT_ERROR', correlationId, fromUid, toUid });
    return { success: false, error: "Interaction restricted by safety protocol" };
  }

  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", fromUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User node not found");

      const profile = userSnap.data() as any;

      if (type === 'like') {
        const check = checkActionAllowed(profile, 'like');
        if (!check.allowed) throw new Error("Daily like limit reached");
        
        transaction.update(userRef, { 
          'usage.likesUsed': increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        // SUPER LIKE: Server-controlled balance verification
        if ((profile.superLikeBalance || 0) <= 0) throw new Error("Insufficient Super Like credits");
        
        transaction.update(userRef, { 
          superLikeBalance: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

      const likeId = `${fromUid}_${toUid}`;
      const likeRef = doc(db, "likes", likeId);
      transaction.set(likeRef, {
        id: likeId,
        fromUserId: fromUid,
        toUserId: toUid,
        type: type,
        createdAt: serverTimestamp(),
        status: 'active'
      });

      // Recipient Notification Logic
      const targetRef = doc(db, "users", toUid);
      const targetSnap = await transaction.get(targetRef);
      if (targetSnap.exists()) {
        const targetPrefs = targetSnap.data().notificationPreferences;
        if (targetPrefs?.pushEnabled !== false) {
           const notifRef = doc(collection(db, "notifications"));
           transaction.set(notifRef, {
             recipientId: toUid,
             senderId: fromUid,
             type: type,
             title: type === 'super_like' ? "Super Match! ✦" : "New Interest",
             body: `${profile.name} ${type === 'super_like' ? "Super Liked" : "Liked"} your Aura.`,
             createdAt: serverTimestamp(),
             read: false
           });
        }
      }

      logger.info('Secure Interaction Recorded', { correlationId, type, fromUid, toUid });
      return { success: true };
    });
  } catch (e: any) {
    logger.error('Interaction Transaction Fault', { category: 'FIRESTORE_ERROR', correlationId, fromUid, errorMessage: e.message });
    return { success: false, error: e.message };
  }
}

export async function handleSecureChat(fromUid: string, roomId: string, text: string) {
  const { db, auth } = initializeFirebase();
  const correlationId = logger.generateCorrelationId();

  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  if (auth.currentUser.uid !== fromUid) {
    logger.critical('Chat Identity Spoof Attempt', { category: 'AUTH_ERROR', correlationId, actor: auth.currentUser.uid });
    return { success: false, error: "Unauthorized Identity Packet" };
  }

  try {
    return await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error("Communication node not found");

      const participants = roomSnap.data().participants;
      const otherUid = participants.find((id: string) => id !== fromUid);

      if (otherUid && !roomId.startsWith('system_')) {
        const blocked = await checkIsBlocked(fromUid, otherUid);
        if (blocked) throw new Error("Messaging restricted by safety protocol");
      }

      const userRef = doc(db, "users", fromUid);
      const userSnap = await transaction.get(userRef);
      const profile = userSnap.data() as any;

      if (roomSnap.data().lastMessage === "" && !roomId.startsWith('system_')) {
        const check = checkActionAllowed(profile, 'newChat');
        if (!check.allowed) throw new Error("Daily chat synchronization limit reached");
        transaction.update(userRef, { 'usage.newChatsUsed': increment(1) });
      }

      const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour mandatory retention
      
      transaction.set(msgRef, {
        id: msgRef.id,
        senderId: fromUid,
        text,
        timestamp: serverTimestamp(),
        expiresAt: expiresAt,
        seen: false
      });

      transaction.update(roomRef, {
        lastMessage: text,
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      // Notification Center Dispatch
      if (otherUid && !roomId.startsWith('system_')) {
        const targetRef = doc(db, "users", otherUid);
        const targetSnap = await transaction.get(targetRef);
        if (targetSnap.exists()) {
          const targetPrefs = targetSnap.data().notificationPreferences;
          if (targetPrefs?.newMessages !== false) {
             const notifRef = doc(collection(db, "notifications"));
             transaction.set(notifRef, {
               recipientId: otherUid,
               senderId: fromUid,
               type: "message",
               roomId: roomId,
               title: "New Message",
               body: text.length > 50 ? text.substring(0, 47) + "..." : text,
               createdAt: serverTimestamp(),
               read: false
             });
          }
        }
      }

      logger.info('Secure Chat Synchronized', { correlationId, roomId, fromUid });
      return { success: true };
    });
  } catch (e: any) {
    logger.error('Chat Transaction Fault', { category: 'CHAT_ERROR', correlationId, roomId, errorMessage: e.message });
    return { success: false, error: e.message };
  }
}
