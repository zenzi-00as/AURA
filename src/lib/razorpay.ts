/**
 * Aura Production Razorpay Implementation.
 * Hardened for server-side verification and high-fidelity transactions.
 */

import { createRazorpayOrder, verifyRazorpayPayment } from "@/actions/payments";

export async function initializeRazorpayPayment(options: {
  amount: number;
  currency?: string;
  itemType: 'Elite' | 'ElitePlus' | 'SuperLike' | 'Spotlight' | 'SuperFund';
  quantity?: number;
  onSuccess: (response: any) => void;
  onFailure?: (error: any) => void;
}) {
  try {
    // 1. Request legitimate order from Server
    const order = await createRazorpayOrder({
      amount: options.amount,
      itemType: options.itemType,
      quantity: options.quantity || 1
    });

    if (!order.success) throw new Error(order.error || "Order generation failed");

    // 2. Open Razorpay Checkout
    const rzpOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.orderData.amount,
      currency: options.currency || "INR",
      name: "AURA",
      description: `${options.itemType} Activation`,
      order_id: order.orderData.id,
      handler: async function (response: any) {
        // 3. Verify payment on Server (removed itemType/quantity from call as they are fetched from order notes)
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
      }
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.open();

  } catch (error: any) {
    console.error("[RAZORPAY_FLOW_ERROR]", error);
    options.onFailure?.({ message: error.message });
  }
}
