'use server';

/**
 * @fileOverview Trusted Payment State Node.
 * Synchronized with Firebase Admin SDK for entitlement materialization.
 */

import { adminDb } from "@/lib/firebase-admin";
import { serverTimestamp as adminTimestamp, FieldValue } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import crypto from "node:crypto";
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
  uid: string; // Authenticated UID passed from server context or verified via token
}) {
  const correlationId = logger.generateCorrelationId();
  const env = validateServerEnv();
  const secret = env.razorpaySecret;
  const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === data.razorpay_signature) {
    try {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.fetch(data.razorpay_order_id);
      
      if (!order) throw new Error("Order not found on gateway");

      const itemType = order.notes?.itemType as string;
      const quantity = parseInt(order.notes?.quantity?.toString() || "1");
      const amount = order.amount / 100;
      const uid = data.uid;

      const userRef = adminDb.collection("users").doc(uid);
      const batch = adminDb.batch();
      
      if (itemType === 'Elite' || itemType === 'ElitePlus') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 28);
        batch.update(userRef, { 
          plan: itemType === 'Elite' ? 'elite' : 'elite_plus',
          subscription: {
            planId: itemType === 'Elite' ? 'elite' : 'elite_plus', 
            status: 'active',
            expiresAt: expiry,
            startedAt: adminTimestamp()
          },
          updatedAt: adminTimestamp()
        });
      } else if (itemType === 'Spotlight') {
        const snap = await userRef.get();
        const currentExp = snap.data()?.spotlightExpiry?.toDate ? snap.data().spotlightExpiry.toDate() : (snap.data()?.spotlightExpiry ? new Date(snap.data().spotlightExpiry) : new Date());
        const baseDate = currentExp > new Date() ? currentExp : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 7);
        batch.update(userRef, { spotlightExpiry: newExpiry, updatedAt: adminTimestamp() });
      } else if (itemType === 'SuperLike') {
        batch.update(userRef, { superLikeBalance: FieldValue.increment(quantity), updatedAt: adminTimestamp() });
      }

      const purchaseRef = adminDb.collection("purchases").doc();
      batch.set(purchaseRef, {
        uid,
        itemType,
        amount,
        timestamp: adminTimestamp(),
        razorpayOrderId: data.razorpay_order_id,
        status: 'Success',
        correlationId
      });

      await batch.commit();
      logger.info('Payment Verified & Entitlement Granted via Admin SDK', { correlationId, uid, itemType });
      return { success: true };
    } catch (err: any) {
      logger.error('Payment Verification Synchronization Fault', { correlationId, errorMessage: err.message });
      return { success: false, error: "Entitlement Synchronization Fault" };
    }
  }

  return { success: false, error: "Invalid Signature Packet" };
}
