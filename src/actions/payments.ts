'use server';

/**
 * @fileOverview Edge-compatible Razorpay interaction node.
 * Updated to use 'node:crypto' for Cloudflare compatibility.
 */

import { initializeFirebase } from "@/firebase/init";
import { doc, getDoc, updateDoc, serverTimestamp, increment, collection, addDoc } from "firebase/firestore";
import Razorpay from "razorpay";
import crypto from "node:crypto"; // Definitively use node:crypto for Edge compatibility
import { validateServerEnv } from "@/lib/env-validation";
import { logger } from "@/lib/logger";

function getRazorpayInstance() {
  const env = validateServerEnv();
  return new Razorpay({
    key_id: env.razorpayKeyId || '',
    key_secret: env.razorpaySecret,
  });
}

export async function createRazorpayOrder({ amount, itemType, quantity }: { amount: number, itemType: string, quantity: number }) {
  const correlationId = logger.generateCorrelationId();
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}_${correlationId}`,
      notes: { itemType, quantity, correlationId }
    };

    const order = await razorpay.orders.create(options);
    logger.info('Razorpay Order Created', { correlationId, itemType, amount, orderId: order.id });
    return { success: true, orderData: order };
  } catch (e: any) {
    logger.error('Razorpay Order Creation Failed', { 
      category: 'PAYMENT_ERROR', 
      correlationId, 
      errorMessage: e.message 
    });
    return { success: false, error: e.message };
  }
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { db, auth } = initializeFirebase();
  const correlationId = logger.generateCorrelationId();
  
  if (!db || !auth?.currentUser) {
    logger.critical('Payment Verification Fault: Auth Sync', { correlationId });
    return { success: false, error: "Authentication Sync Fault" };
  }

  const uid = auth.currentUser.uid;
  const env = validateServerEnv();
  const secret = env.razorpaySecret;
  const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;

  // Use node:crypto Hmac for Cloudflare nodejs_compat support
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === data.razorpay_signature) {
    try {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.fetch(data.razorpay_order_id);
      
      if (!order) {
        logger.error('Order Not Found on Gateway', { category: 'PAYMENT_ERROR', correlationId, orderId: data.razorpay_order_id });
        throw new Error("Order not found on gateway");
      }

      const itemType = order.notes?.itemType as string;
      const quantity = parseInt(order.notes?.quantity?.toString() || "1");
      const amount = order.amount / 100;

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
      }

      await addDoc(collection(db, "purchases"), {
        uid,
        itemType,
        amount,
        timestamp: serverTimestamp(),
        razorpayOrderId: data.razorpay_order_id,
        status: 'Success',
        correlationId
      });

      logger.info('Payment Verified & Entitlement Granted', { correlationId, uid, itemType });
      return { success: true };
    } catch (err: any) {
      logger.error('Payment Verification Synchronization Fault', { 
        category: 'PAYMENT_ERROR', 
        correlationId, 
        uid,
        errorMessage: err.message 
      });
      return { success: false, error: "Entitlement Synchronization Fault" };
    }
  }

  logger.critical('Invalid Razorpay Signature Detected', { 
    category: 'PAYMENT_ERROR', 
    correlationId, 
    uid, 
    orderId: data.razorpay_order_id 
  });
  return { success: false, error: "Invalid Signature Packet" };
}
