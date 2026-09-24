
'use server';

/**
 * @fileOverview Atomic Interaction Hub.
 * Hardened with Session UID verification and Block checking.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, updateDoc, increment, serverTimestamp, setDoc, collection, runTransaction } from "firebase/firestore";
import { checkActionAllowed } from "@/lib/subscription-engine";
import { checkIsBlocked } from "./moderation";

export async function handleSecureLike(fromUid: string, toUid: string, type: 'like' | 'super_like') {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  // CRITICAL: Session UID Verification
  if (auth.currentUser.uid !== fromUid) return { success: false, error: "Unauthorized Identity Packet" };

  // CRITICAL: Block Verification
  const blocked = await checkIsBlocked(fromUid, toUid);
  if (blocked) return { success: false, error: "Interaction restricted by safety protocol" };

  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", fromUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User node not found");

      const profile = userSnap.data() as any;

      if (type === 'like') {
        const check = checkActionAllowed(profile, 'like');
        if (!check.allowed) throw new Error("Daily like limit synchronized");
        
        transaction.update(userRef, { 
          'usage.likesUsed': increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
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

      return { success: true };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function handleSecureChat(fromUid: string, roomId: string, text: string) {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  // CRITICAL: Session UID Verification
  if (auth.currentUser.uid !== fromUid) return { success: false, error: "Unauthorized Identity Packet" };

  try {
    return await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error("Communication node not found");

      const participants = roomSnap.data().participants;
      const otherUid = participants.find((id: string) => id !== fromUid);

      // CRITICAL: Block Verification (Skip for system rooms)
      if (otherUid && !roomId.startsWith('system_')) {
        const blocked = await checkIsBlocked(fromUid, otherUid);
        if (blocked) throw new Error("Messaging restricted by safety protocol");
      }

      const userRef = doc(db, "users", fromUid);
      const userSnap = await transaction.get(userRef);
      const profile = userSnap.data() as any;

      // Only check limit for the FIRST message in a new conversation
      if (roomSnap.data().lastMessage === "" && !roomId.startsWith('system_')) {
        const check = checkActionAllowed(profile, 'newChat');
        if (!check.allowed) throw new Error("Daily chat synchronization limit reached");
        transaction.update(userRef, { 'usage.newChatsUsed': increment(1) });
      }

      const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
      
      transaction.set(msgRef, {
        id: msgRef.id,
        senderId: fromUid,
        text,
        timestamp: serverTimestamp(),
        seen: false
      });

      transaction.update(roomRef, {
        lastMessage: text,
        lastTimestamp: serverTimestamp(),
        [`unreadCount.${otherUid}`]: increment(1)
      });

      return { success: true };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
