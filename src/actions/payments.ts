'use server';

/**
 * @fileOverview Trusted Payment State Node.
 * Synchronized with Firebase Admin SDK for entitlement materialization.
 * Implements server-side pricing and signature verification.
 */

import { adminDb } from "@/lib/firebase-admin";
import { serverTimestamp as adminTimestamp, FieldValue } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import { validateServerEnv } from "@/lib/env-validation";
import { logger } from "@/lib/logger";
import { PLAN_CONFIG } from "@/lib/subscription-engine";

// Server-side Pricing Authority (INR Base)
const PRICING_LEDGER: Record<string, number> = {
  'Elite': 99,
  'ElitePlus': 199,
  'Spotlight': 30,
  'SuperLike': 3
};

function getRazorpayInstance() {
  const env = validateServerEnv();
  return new Razorpay({
    key_id: env.razorpayKeyId || '',
    key_secret: env.razorpaySecret,
  });
}

export async function createRazorpayOrder({ itemType, quantity = 1, uid }: { itemType: string, quantity?: number, uid: string }) {
  const correlationId = logger.generateCorrelationId();
  try {
    const basePrice = PRICING_LEDGER[itemType];
    if (!basePrice) throw new Error("Invalid plan identifier");

    const amount = Math.round(basePrice * quantity * 1.18); // Including 18% GST server-side
    const razorpay = getRazorpayInstance();
    
    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `aura_${Date.now()}_${correlationId}`,
      notes: { itemType, quantity, uid, correlationId }
    };

    const order = await razorpay.orders.create(options);
    
    // Log intent for auditing
    await adminDb.collection("orders").doc(order.id).set({
      uid,
      itemType,
      quantity,
      amount,
      status: 'created',
      createdAt: adminTimestamp(),
      correlationId
    });

    logger.info('Razorpay Order Materialized', { correlationId, itemType, amount, orderId: order.id });
    return { success: true, orderData: order };
  } catch (e: any) {
    logger.error('Order Generation Fault', { correlationId, errorMessage: e.message });
    return { success: false, error: e.message };
  }
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const correlationId = logger.generateCorrelationId();
  const env = validateServerEnv();
  const secret = env.razorpaySecret;
  const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== data.razorpay_signature) {
    logger.error('Invalid Signature Detected', { correlationId, orderId: data.razorpay_order_id });
    return { success: false, error: "Signature Mismatch" };
  }

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.fetch(data.razorpay_order_id);
    if (!order) throw new Error("Order node not found on gateway");

    const { uid, itemType, quantity } = order.notes as any;
    return await activateEntitlement(uid, itemType, parseInt(quantity || "1"), data.razorpay_order_id, data.razorpay_payment_id, correlationId);
  } catch (err: any) {
    logger.error('Verification Fault', { correlationId, errorMessage: err.message });
    return { success: false, error: "Synchronization Fault" };
  }
}

export async function activateEntitlement(uid: string, itemType: string, quantity: number, orderId: string, paymentId: string, correlationId: string) {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const purchaseRef = adminDb.collection("purchases").doc(paymentId);
    
    // IDEMPOTENCY CHECK
    const existing = await purchaseRef.get();
    if (existing.exists) {
      logger.info('Duplicate Entitlement Suppression', { correlationId, paymentId });
      return { success: true, duplicated: true };
    }

    const batch = adminDb.batch();
    const now = adminTimestamp();

    if (itemType === 'Elite' || itemType === 'ElitePlus') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 28);
      batch.update(userRef, { 
        plan: itemType === 'Elite' ? 'elite' : 'elite_plus',
        subscription: {
          planId: itemType === 'Elite' ? 'elite' : 'elite_plus', 
          status: 'active',
          expiresAt: expiry,
          startedAt: now
        },
        updatedAt: now
      });
    } else if (itemType === 'Spotlight') {
      const userSnap = await userRef.get();
      const currentExp = userSnap.data()?.spotlightExpiry?.toDate ? userSnap.data().spotlightExpiry.toDate() : new Date();
      const baseDate = currentExp > new Date() ? currentExp : new Date();
      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + 7);
      batch.update(userRef, { spotlightExpiry: newExpiry, updatedAt: now });
    } else if (itemType === 'SuperLike') {
      batch.update(userRef, { superLikeBalance: FieldValue.increment(quantity), updatedAt: now });
    }

    batch.set(purchaseRef, {
      uid,
      itemType,
      amount: PRICING_LEDGER[itemType] * quantity,
      timestamp: now,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      status: 'Success',
      correlationId
    });

    // Update order node status
    batch.update(adminDb.collection("orders").doc(orderId), { status: 'paid', paymentId, updatedAt: now });

    await batch.commit();
    logger.info('Entitlement Materialized', { correlationId, uid, itemType });
    return { success: true };
  } catch (err: any) {
    logger.error('Entitlement Activation Fault', { correlationId, errorMessage: err.message });
    throw err;
  }
}
