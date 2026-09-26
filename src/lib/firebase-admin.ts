/**
 * @fileOverview Aura Trusted Firebase Admin SDK Node.
 * Hardened for server-side privileged mutations.
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

/**
 * Validates the caller's server-side session and returns the verified UID.
 */
export async function getVerifiedUid(idToken: string): Promise<string | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (e) {
    return null;
  }
}
