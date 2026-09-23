
'use server';

/**
 * @fileOverview Ephemeral Media Cleanup Node.
 * Definitively deletes physical files from Storage once view limits are synchronized.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
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
