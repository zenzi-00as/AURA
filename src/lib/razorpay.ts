/**
 * Aura Production Razorpay Implementation.
 * Hardened for server-side verification and high-fidelity transactions.
 */

import { createRazorpayOrder, verifyRazorpayPayment } from "@/actions/payments";
import { PlanType } from "./types";

export async function initializeRazorpayPayment(options: {
  itemType: 'Elite' | 'ElitePlus' | 'SuperLike' | 'Spotlight' | 'SuperFund';
  quantity?: number;
  uid: string;
  onSuccess: (response: any) => void;
  onFailure?: (error: any) => void;
}) {
  try {
    // 1. Request legitimate order from Server (No price sent from client)
    const order = await createRazorpayOrder({
      itemType: options.itemType,
      quantity: options.quantity || 1,
      uid: options.uid
    });

    if (!order.success) throw new Error(order.error || "Order generation failed");

    // 2. Open Razorpay Checkout
    const rzpOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.orderData.amount,
      currency: "INR",
      name: "AURA",
      description: `${options.itemType} Activation`,
      order_id: order.orderData.id,
      handler: async function (response: any) {
        // 3. Verify payment on Server via Action
        const verification = await verifyRazorpayPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });

        if (verification.success) {
          options.onSuccess(response);
        } else {
          options.onFailure?.({ message: "Payment verification sync failed." });
        }
      },
      prefill: {
        name: "Aura Member"
      },
      theme: {
        color: "#0057FF"
      },
      modal: {
        ondismiss: function() {
          options.onFailure?.({ message: "Checkout cancelled." });
        }
      }
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.open();

  } catch (error: any) {
    console.error("[RAZORPAY_FLOW_ERROR]", error);
    options.onFailure?.({ message: error.message });
  }
}
