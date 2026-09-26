# Aura Cloudflare Compatibility Audit 🛡️

**Project:** Aura (Premium LGBTQ+ Social Discovery)
**Target:** Cloudflare Pages (Edge Runtime)
**Next.js Version:** 15.1.11 (Canary Node)
**Status:** READY FOR PRE-DEPLOYMENT VALIDATION

---

## 1. Executive Summary
Aura is technically compatible with Cloudflare Pages. The decision to use the Firebase Client SDK in Server Actions (instead of the Node-heavy Admin SDK) ensures that core database and auth interactions are `fetch`-based and Edge-ready. The primary production risks are centralized in the Razorpay SDK dependency and the stability of Next.js Canary on the Cloudflare `workerd` runtime.

---

## 2. Validation Matrix

| Node | Status | Risk | Mitigation |
| :--- | :--- | :--- | :--- |
| **Next.js 15 App Router** | **YELLOW** | Medium | Canary versions may have Edge-runtime regressions. Use `@cloudflare/next-on-pages` for stabilization. |
| **Firebase Client SDK** | **GREEN** | Low | Uses standard `fetch` APIs. Verified compatible with Edge environments. |
| **Genkit / Gemini** | **GREEN** | Low | `@genkit-ai/google-genai` utilizes `fetch`. Genkit v1 logic is stateless. |
| **Razorpay SDK** | **YELLOW** | High | The Node SDK may rely on `https` or `crypto`. Signature verification moved to `node:crypto`. |
| **Signature Verification**| **GREEN** | Low | Transitioned from Node `crypto` to `node:crypto` with `nodejs_compat` enabled. |
| **Image Uploads** | **GREEN** | Low | Firebase Storage remains the backend node; `fetch`-based uploads are safe. |
| **Authentication** | **GREEN** | Low | Persistence and redirects handled by Firebase Client Auth. |

---

## 3. High Risk Functional Nodes

### A. Razorpay Order Creation (`src/actions/payments.ts`)
- **Issue:** The `razorpay` npm package is a Node-native library. While `nodejs_compat` is enabled, internal dependencies on `https` (instead of `fetch`) can cause runtime exceptions in some Edge environments.
- **Verification Required:** Confirm `razorpay.orders.create` executes without "Module not found: https" errors.
- **Fallback:** Use standard `fetch` to `api.razorpay.com/v1/orders`.

### B. Biometric Buffer Processing (`src/actions/verification.ts`)
- **Issue:** Uses `Buffer` for base64 conversion of storage bytes.
- **Verification Required:** `Buffer` is supported via `nodejs_compat`, but must be verified for memory overhead during high-volume AI assessment.

---

## 4. Environment Variable Strategy

### PUBLIC (Browser)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### SECRET (Cloudflare Vault)
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`
- `FIREBASE_CONFIG` (Internal node for server init)

---

## 5. Build Validation Result
- **Command:** `npm run pages:build`
- **Output:** SUCCESS (Generated `.next` with Edge Function mapping)
- **Tooling:** `@cloudflare/next-on-pages` v1.13.7

---

## 6. Final Verdict
**GO FOR STAGING VALIDATION**

The architecture is clean, but the Razorpay SDK remains the only "black box" Node dependency. Staging tests must focus on the payment order creation flow.

---
*Audit Finalized: March 2024*
