
'use server';

/**
 * @fileOverview Geospatial Discovery Node.
 * Calibrates geohashes for scalable proximity queries.
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

  const results: any[] = [];
  
  // Parallel query nodes for high-speed synchronization
  const queries = searchHashes.map(async (hash) => {
    const q = query(
      collection(db, "users"),
      where("onboardingCompleted", "==", true),
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

  // Deduplicate and filter self
  return results.filter((user, index, self) => 
    user.uid !== uid && !user.isSuspended && self.findIndex(u => u.uid === user.uid) === index
  );
}
