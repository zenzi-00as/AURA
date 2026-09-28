/**
 * @fileOverview Aura Razorpay Webhook Protocol.
 * Handles asynchronous payment capture and entitlement synchronization.
 * Implements strict signature validation and idempotency.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { validateServerEnv } from "@/lib/env-validation";
import { activateEntitlement } from "@/actions/payments";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const correlationId = logger.generateCorrelationId();
  const env = validateServerEnv();
  const signature = req.headers.get("x-razorpay-signature");
  
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  try {
    const body = await req.text();
    const expectedSignature = crypto
      .createHmac("sha256", env.webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      logger.warn("Webhook Signature Mismatch", { correlationId });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    logger.info("Razorpay Webhook Received", { correlationId, event: event.event });

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const notes = payment.notes;

      if (notes && notes.uid && notes.itemType) {
        await activateEntitlement(
          notes.uid,
          notes.itemType,
          parseInt(notes.quantity || "1"),
          orderId,
          paymentId,
          correlationId
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    logger.error("Webhook Processing Fault", { correlationId, errorMessage: err.message });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
