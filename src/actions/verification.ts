
'use server';

/**
 * @fileOverview Automated Identity Guard Node.
 * Triggers Genkit AI verification flows and synchronizes results for Admin review.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, updateDoc, getDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { getStorage, ref, getBytes } from "firebase/storage";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";

export async function triggerAiVerification(uid: string) {
  const { db, storage, auth } = initializeFirebase();
  if (!db || !storage || !auth) return { success: false, error: "System Sync Fault" };

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("Identity node not found");

    const profile = userSnap.data();
    const imagePath = profile.verification?.imagePath;

    if (!imagePath) throw new Error("Verification packet missing image node");

    // 1. Fetch image buffer from secure Storage
    const storageRef = ref(storage, imagePath);
    const buffer = await getBytes(storageRef);
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    // 2. Execute Genkit Flow
    const aiResult = await selfieVerification({
      photoDataUri: dataUri,
      userName: profile.name || "Aura Member",
      userDescription: profile.bio || ""
    });

    // 3. Synchronize AI assessment to secure status node
    // Note: AI never grants 'Verified' status automatically; it provides assessment for Admin.
    await updateDoc(userRef, {
      'verification.aiAssessment': {
        isRealPerson: aiResult.isRealPerson,
        isLiveCapture: aiResult.isLiveCapture,
        matchesProfile: aiResult.matchesProfile,
        reason: aiResult.reason,
        processedAt: serverTimestamp()
      },
      // If AI rejects definitively (not a person/photo of screen), we can set status to Rejected
      verificationStatus: aiResult.verificationStatus === 'Rejected' ? 'Rejected' : 'Pending',
      updatedAt: serverTimestamp()
    });

    return { success: true, status: aiResult.verificationStatus };
  } catch (e: any) {
    console.error("[AI_VERIFICATION_ERROR]", e);
    return { success: false, error: e.message };
  }
}
