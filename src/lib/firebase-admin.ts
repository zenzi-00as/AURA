/**
 * @fileOverview Aura Trusted Firebase Admin SDK Node.
 * Hardened for Vercel Serverless and local development synchronization.
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (privateKey && clientEmail && projectId) {
    // Vercel / External Environment Initialization
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Default Environment (Firebase App Hosting / GCP)
    admin.initializeApp({
      projectId: projectId,
    });
  }
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
