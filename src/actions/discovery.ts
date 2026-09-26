'use server';

/**
 * @fileOverview Geospatial Discovery Node.
 * Calibrates geohashes for scalable proximity queries.
 * Hardened to exclude blocked relationships and Incognito members.
 */

import { initializeFirebase } from "@/firebase/init";
import { collection, query, where, getDocs, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import ngeohash from "ngeohash";

export async function updateLocationGeohash(uid: string, lat: number, lng: number) {
  const { db } = initializeFirebase();
  if (!db) return;

  const geohash = ngeohash.encode(lat, lng, 6); // ~1.2km precision
  await updateDoc(doc(db, "users", uid), {
    location: { lat, lng },
    geohash,
    updatedAt: serverTimestamp()
  });
}

export async function getDiscoveryNodes(uid: string, lat: number, lng: number, radiusKm: number) {
  const { db } = initializeFirebase();
  if (!db) return [];

  // HIGH-FIDELITY: Calculate geohash precision based on radius
  const precision = radiusKm > 50 ? 4 : radiusKm > 10 ? 5 : 6;
  const centerHash = ngeohash.encode(lat, lng, precision);
  const neighbors = ngeohash.neighbors(centerHash);
  const searchHashes = [centerHash, ...neighbors];

  // Fetch blocked users to exclude from results
  const blockedSnap = await getDocs(collection(db, "users", uid, "blockedUsers"));
  const blockedIds = new Set(blockedSnap.docs.map(d => d.id));

  const results: any[] = [];
  
  // Parallel query nodes for high-speed synchronization
  const queries = searchHashes.map(async (hash) => {
    const q = query(
      collection(db, "users"),
      where("onboardingCompleted", "==", true),
      // INCOGNITO GUARD: Exclude users in private browsing mode
      where("incognitoMode", "==", false),
      where("geohash", ">=", hash),
      where("geohash", "<=", hash + "~"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
  });

  const batches = await Promise.all(queries);
  batches.forEach(batch => results.push(...batch));

  // Deduplicate and filter: self, suspended, and blocked users
  return results.filter((user, index, self) => 
    user.uid !== uid && 
    !user.isSuspended && 
    !blockedIds.has(user.uid) &&
    self.findIndex(u => u.uid === user.uid) === index
  );
}