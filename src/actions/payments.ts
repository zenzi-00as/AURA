'use server';

/**
 * @fileOverview Hardened Razorpay interaction node.
 * Definitively verifies signatures and order metadata server-side to prevent entitlement spoofing.
 */

import { initializeFirebase } from "@/firebase/init";
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
      notes: { itemType, quantity } // Store details in notes for server-side verification
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
    try {
      // HARDENED: Fetch order details directly from Razorpay to prevent itemType/quantity spoofing
      const order = await razorpay.orders.fetch(data.razorpay_order_id);
      if (!order) throw new Error("Order not found on gateway");

      const itemType = order.notes?.itemType as string;
      const quantity = parseInt(order.notes?.quantity?.toString() || "1");
      const amount = order.amount / 100;

      if (!itemType) throw new Error("Invalid order metadata synchronization");

      const userRef = doc(db, "users", uid);
      
      if (itemType === 'Elite' || itemType === 'ElitePlus') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 28);
        await updateDoc(userRef, { 
          plan: itemType === 'Elite' ? 'elite' : 'elite_plus',
          subscription: {
            planId: itemType === 'Elite' ? 'elite' : 'elite_plus', 
            status: 'active',
            expiresAt: expiry,
            startedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
      } else if (itemType === 'Spotlight') {
        const snap = await getDoc(userRef);
        const currentExp = snap.data()?.spotlightExpiry?.toDate ? snap.data().spotlightExpiry.toDate() : (snap.data()?.spotlightExpiry ? new Date(snap.data().spotlightExpiry) : new Date());
        const baseDate = currentExp > new Date() ? currentExp : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 7);
        await updateDoc(userRef, { spotlightExpiry: newExpiry, updatedAt: serverTimestamp() });
      } else if (itemType === 'SuperLike') {
        await updateDoc(userRef, { superLikeBalance: increment(quantity), updatedAt: serverTimestamp() });
      } else if (itemType === 'SuperFund') {
        const snap = await getDoc(userRef);
        await updateDoc(userRef, { isSuperFunder: true, updatedAt: serverTimestamp() });
        await addDoc(collection(db, "superFunds"), {
          userId: uid,
          displayName: snap.data()?.name || "Aura Supporter",
          amount: amount,
          status: 'verified',
          timestamp: serverTimestamp(),
          paymentId: data.razorpay_payment_id
        });
      }

      await addDoc(collection(db, "purchases"), {
        uid,
        itemType,
        amount,
        timestamp: serverTimestamp(),
        razorpayOrderId: data.razorpay_order_id,
        status: 'Success'
      });

      return { success: true };
    } catch (err: any) {
      console.error("[PAYMENT_VERIFY_ERROR]", err);
      return { success: false, error: "Entitlement Synchronization Fault" };
    }
  }

  return { success: false, error: "Invalid Signature Packet" };
}
