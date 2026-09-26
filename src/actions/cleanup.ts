'use server';

/**
 * @fileOverview Ephemeral Media and Message Cleanup Node.
 * Definitively deletes physical files and expired records from Storage/Firestore.
 */

import { initializeFirebase } from "@/firebase/init";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  deleteDoc
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

export async function handleMediaViewCleanup(uid: string, roomId: string, messageId: string) {
  const { db, storage, auth } = initializeFirebase();
  if (!db || !storage || !auth?.currentUser) return { success: false, error: "Auth Sync Fault" };

  // CRITICAL: Session Verification
  if (auth.currentUser.uid !== uid) return { success: false, error: "Unauthorized Identity" };

  try {
    const msgRef = doc(db, "chatRooms", roomId, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    
    if (!msgSnap.exists()) throw new Error("Media packet not found");
    const msg = msgSnap.data();

    if (!msg.isMedia || !msg.mediaUrl) return { success: true };

    const currentViews = (msg.viewCount?.[uid] || 0) + 1;
    const viewMode = msg.viewMode || "unlimited";

    // Update view count atomically
    await updateDoc(msgRef, {
      [`viewCount.${uid}`]: increment(1)
    });

    // Check if media has reached its final lifecycle stage
    const shouldDelete = (viewMode === 'one' && currentViews >= 1) || (viewMode === 'two' && currentViews >= 2);

    if (shouldDelete && msg.storagePath) {
      const fileRef = ref(storage, msg.storagePath);
      await deleteObject(fileRef).catch(err => console.error("Storage cleanup fault:", err));
      
      // Clear URL and path to prevent further retrieval
      await updateDoc(msgRef, {
        mediaUrl: null,
        storagePath: null,
        status: 'expired'
      });
    }

    return { success: true, expired: shouldDelete };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Global scheduled cleanup for the mandatory 24-hour retention rule.
 * Deletes expired messages across all subcollections.
 */
export async function cleanupExpiredMessages() {
  const { db, storage } = initializeFirebase();
  if (!db || !storage) return { success: false, error: "System Sync Fault" };

  const now = new Date();
  
  try {
    const expiredQuery = query(
      collectionGroup(db, "messages"),
      where("expiresAt", "<=", now)
    );

    const snapshot = await getDocs(expiredQuery);
    if (snapshot.empty) return { success: true, count: 0 };

    const batch = writeBatch(db);
    let count = 0;

    for (const messageDoc of snapshot.docs) {
      const data = messageDoc.data();
      
      // Physical Storage Deletion
      if (data.isMedia && data.storagePath) {
        const fileRef = ref(storage, data.storagePath);
        await deleteObject(fileRef).catch(() => {});
      }

      batch.delete(messageDoc.ref);
      count++;
    }

    await batch.commit();
    return { success: true, count };
  } catch (e: any) {
    console.error("[CLEANUP_FAULT]", e);
    return { success: false, error: e.message };
  }
}
