'use server';

/**
 * @fileOverview Automated Identity Guard Node.
 * Hardened for Admin SDK execution to prevent unauthorized status spoofing.
 */

import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { selfieVerification } from "@/ai/flows/selfie-verification-ai";
import { logger } from "@/lib/logger";

export async function triggerAiVerification(uid: string) {
  const correlationId = logger.generateCorrelationId();

  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("Identity node not found");

    const profile = userSnap.data();
    const imagePath = profile?.verification?.imagePath;

    if (!imagePath) throw new Error("Verification packet missing image node");

    const bucket = adminStorage.bucket();
    const file = bucket.file(imagePath);
    const [buffer] = await file.download();
    const base64 = buffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    logger.info('Triggering AI Biometric Assessment via Admin Node', { correlationId, uid });

    const aiResult = await selfieVerification({
      photoDataUri: dataUri,
      userName: profile?.name || "Aura Member",
      userDescription: profile?.bio || ""
    });

    // PRIVILEGED UPDATE: Modifying verificationStatus requires Admin SDK
    await userRef.update({
      'verification.aiAssessment': {
        isRealPerson: aiResult.isRealPerson,
        isLiveCapture: aiResult.isLiveCapture,
        matchesProfile: aiResult.matchesProfile,
        reason: aiResult.reason,
        processedAt: Timestamp.now(),
        correlationId
      },
      verificationStatus: aiResult.verificationStatus === 'Rejected' ? 'Rejected' : 'Pending',
      updatedAt: Timestamp.now()
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
