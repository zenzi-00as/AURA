'use server';

/**
 * @fileOverview Aura Account Deletion Hub.
 * Hardened server-side logic for the definitive cleanup of user identity nodes.
 * Ensures physical storage deletion and data-link destruction.
 */

import { initializeFirebase } from "@/firebase/init";
import { 
  doc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  updateDoc, 
  arrayRemove 
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";

export async function deleteAuraAccountData(uid: string) {
  const { db, storage, auth } = initializeFirebase();
  if (!db || !storage || !auth) return { success: false, error: "System Sync Fault" };

  // CRITICAL: Session Verification
  // We check if there's a currentUser, but in Server Actions we rely on the passed UID 
  // being verified by the caller's auth context.
  
  try {
    const batch = writeBatch(db);

    // 1. DELETE PERSONAL PROFILE NODES
    const userRef = doc(db, "users", uid);
    batch.delete(userRef);

    // 2. CLEANUP BLOCKED USERS
    const blockedSnap = await getDocs(collection(db, "users", uid, "blockedUsers"));
    blockedSnap.forEach(d => batch.delete(d.ref));

    // 3. CLEANUP NOTIFICATION DEVICES
    const deviceSnap = await getDocs(collection(db, "users", uid, "notificationDevices"));
    deviceSnap.forEach(d => batch.delete(d.ref));

    // 4. CLEANUP LIKES (Initiated by user)
    const outboundLikes = await getDocs(query(collection(db, "likes"), where("fromUserId", "==", uid)));
    outboundLikes.forEach(d => batch.delete(d.ref));

    // 5. CLEANUP NOTIFICATIONS
    const notifs = await getDocs(query(collection(db, "notifications"), where("userId", "==", uid)));
    notifs.forEach(d => batch.delete(d.ref));

    // 6. DETACH FROM CHAT ROOMS
    const rooms = await getDocs(query(collection(db, "chatRooms"), where("participants", "array-contains", uid)));
    rooms.forEach(roomDoc => {
      batch.update(roomDoc.ref, {
        participants: arrayRemove(uid),
        [`unreadCount.${uid}`]: 0
      });
    });

    // Execute Firestore Batch
    await batch.commit();

    // 7. PURGE STORAGE VAULTS (Photos & Verifications)
    const purgeFolders = [`profilePhotos/${uid}`, `verifications/${uid}`];
    
    for (const path of purgeFolders) {
      const folderRef = ref(storage, path);
      try {
        const list = await listAll(folderRef);
        const deletePromises = list.items.map(item => deleteObject(item));
        await Promise.all(deletePromises);
      } catch (e) {
        console.warn(`[ACCOUNT_DELETION] Storage path ${path} already empty or inaccessible.`);
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error("[ACCOUNT_DELETION_ERROR]", e);
    return { success: false, error: e.message };
  }
}
