/**
 * @fileOverview Server-side Environment Validation Node.
 * Definitively checks for required system secrets before execution.
 * This utility MUST NOT be imported into client components.
 */

export function validateServerEnv() {
  const required = [
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'GEMINI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[AURA SECURITY FAULT] Missing Server Secrets: ${missing.join(', ')}`);
    }
    throw new Error("System configuration fault: Secure synchronization failed.");
  }

  return {
    razorpaySecret: process.env.RAZORPAY_KEY_SECRET!,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,
    geminiKey: process.env.GEMINI_API_KEY!,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  };
}
