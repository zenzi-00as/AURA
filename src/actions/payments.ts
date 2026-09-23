
'use server';

/**
 * @fileOverview Hardened Razorpay interaction node.
 * Definitively verifies signatures before granting community entitlements.
 */

import { initializeFirebase } from "@/firebase/init";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, collection, addDoc } from "firebase/firestore";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function createRazorpayOrder({ amount, itemType, quantity }: { amount: number, itemType: string, quantity: number }) {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { itemType, quantity }
    };

    const order = await razorpay.orders.create(options);
    return { success: true, orderData: order };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  itemType: string;
  quantity: number;
}) {
  const { db, auth } = initializeFirebase();
  if (!db || !auth?.currentUser) return { success: false, error: "Authentication Sync Fault" };

  const uid = auth.currentUser.uid;
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === data.razorpay_signature) {
    // HARDENED: Signature verified. Grant entitlement server-side.
    const userRef = doc(db, "users", uid);
    
    try {
      if (data.itemType === 'Elite' || data.itemType === 'ElitePlus') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 28);
        await updateDoc(userRef, { 
          plan: data.itemType === 'Elite' ? 'elite' : 'elite_plus',
          subscription: {
            planId: data.itemType === 'Elite' ? 'elite' : 'elite_plus', 
            status: 'active',
            expiresAt: expiry,
            startedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
      } else if (data.itemType === 'Spotlight') {
        const snap = await getDoc(userRef);
        const currentExp = snap.data()?.spotlightExpiry?.toDate ? snap.data().spotlightExpiry.toDate() : (snap.data()?.spotlightExpiry ? new Date(snap.data().spotlightExpiry) : new Date());
        const baseDate = currentExp > new Date() ? currentExp : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 7);
        await updateDoc(userRef, { spotlightExpiry: newExpiry, updatedAt: serverTimestamp() });
      } else if (data.itemType === 'SuperLike') {
        await updateDoc(userRef, { superLikeBalance: increment(data.quantity), updatedAt: serverTimestamp() });
      } else if (data.itemType === 'SuperFund') {
        const snap = await getDoc(userRef);
        await updateDoc(userRef, { isSuperFunder: true, updatedAt: serverTimestamp() });
        await addDoc(collection(db, "superFunds"), {
          userId: uid,
          displayName: snap.data()?.name || "Aura Supporter",
          amount: data.amount,
          status: 'verified',
          timestamp: serverTimestamp(),
          paymentId: data.razorpay_payment_id
        });
      }

      await addDoc(collection(db, "purchases"), {
        uid,
        itemType: data.itemType,
        amount: data.amount,
        timestamp: serverTimestamp(),
        razorpayOrderId: data.razorpay_order_id,
        status: 'Success'
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Entitlement Synchronization Fault" };
    }
  }

  return { success: false, error: "Invalid Signature Packet" };
}
