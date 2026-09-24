'use server';

/**
 * @fileOverview Automated Identity Guard Node.
 * Standardized with Aura Monitoring Protocol.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, getBytes } from "firebase/storage";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";
import { logger } from "@/lib/logger";

export async function triggerAiVerification(uid: string) {
  const { db, storage, auth } = initializeFirebase();
  const correlationId = logger.generateCorrelationId();

  if (!db || !storage || !auth) {
    logger.error('AI Verification Trigger Fault: System Sync', { correlationId });
    return { success: false, error: "System Sync Fault" };
  }

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("Identity node not found");

    const profile = userSnap.data();
    const imagePath = profile.verification?.imagePath;

    if (!imagePath) throw new Error("Verification packet missing image node");

    const storageRef = ref(storage, imagePath);
    const buffer = await getBytes(storageRef);
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    logger.info('Triggering AI Biometric Assessment', { correlationId, uid });

    const aiResult = await selfieVerification({
      photoDataUri: dataUri,
      userName: profile.name || "Aura Member",
      userDescription: profile.bio || ""
    });

    await updateDoc(userRef, {
      'verification.aiAssessment': {
        isRealPerson: aiResult.isRealPerson,
        isLiveCapture: aiResult.isLiveCapture,
        matchesProfile: aiResult.matchesProfile,
        reason: aiResult.reason,
        processedAt: serverTimestamp(),
        correlationId
      },
      verificationStatus: aiResult.verificationStatus === 'Rejected' ? 'Rejected' : 'Pending',
      updatedAt: serverTimestamp()
    });

    logger.info('AI Biometric Assessment Completed', { correlationId, uid, status: aiResult.verificationStatus });
    return { success: true, status: aiResult.verificationStatus };
  } catch (e: any) {
    logger.error('AI Verification Lifecycle Exception', { 
      category: 'VERIFICATION_ERROR', 
      correlationId, 
      uid, 
      errorMessage: e.message 
    });
    return { success: false, error: e.message };
  }
}
