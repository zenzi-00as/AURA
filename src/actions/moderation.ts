
'use server';

/**
 * @fileOverview Aura Moderation Node.
 * Handles server-authorized user blocking and reporting protocols.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";

export async function handleBlockUser(fromUid: string, toUid: string, toName: string) {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  // CRITICAL: Session Verification
  if (auth.currentUser.uid !== fromUid) return { success: false, error: "Unauthorized Identity" };
  if (fromUid === toUid) return { success: false, error: "Self-restriction impossible" };

  try {
    const blockRef = doc(db, "users", fromUid, "blockedUsers", toUid);
    await setDoc(blockRef, {
      uid: toUid,
      name: toName,
      blockedAt: serverTimestamp()
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function handleUnblockUser(fromUid: string, toUid: string) {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  if (auth.currentUser.uid !== fromUid) return { success: false, error: "Unauthorized Identity" };

  try {
    const blockRef = doc(db, "users", fromUid, "blockedUsers", toUid);
    await deleteDoc(blockRef);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function handleReportUser(data: {
  reporterId: string;
  targetId: string;
  reason: string;
  description?: string;
  conversationId?: string;
}) {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  if (auth.currentUser.uid !== data.reporterId) return { success: false, error: "Unauthorized Identity" };
  if (data.reporterId === data.targetId) return { success: false, error: "Self-reporting impossible" };

  try {
    // Spam protection: check for recent reports from this user for this target
    const recentQuery = query(
      collection(db, "reports"),
      where("reporterId", "==", data.reporterId),
      where("targetId", "==", data.targetId),
      limit(1)
    );
    const snap = await getDocs(recentQuery);
    if (!snap.empty) return { success: false, error: "Report already synchronized. Our team is investigating." };

    await addDoc(collection(db, "reports"), {
      ...data,
      timestamp: serverTimestamp(),
      status: 'Pending'
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function checkIsBlocked(fromUid: string, toUid: string) {
  const { db } = initializeFirebase();
  if (!db) return false;

  // Check both directions
  const [outbound, inbound] = await Promise.all([
    getDoc(doc(db, "users", fromUid, "blockedUsers", toUid)),
    getDoc(doc(db, "users", toUid, "blockedUsers", fromUid))
  ]);

  return outbound.exists() || inbound.exists();
}
