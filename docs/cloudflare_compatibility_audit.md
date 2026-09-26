# Aura Cloudflare Compatibility Audit 🛡️

**Project:** Aura (Premium LGBTQ+ Social Discovery)
**Target:** Cloudflare Pages (Edge Runtime)
**Status:** READY FOR PREPARATION

---

## 1. Executive Summary
Aura is technically compatible with Cloudflare Pages. The existing use of Next.js 15 App Router and the decision to use the Firebase Client SDK in Server Actions (instead of the Node-heavy Admin SDK) significantly lowers the migration risk.

---

## 2. Compatibility Matrix

| Feature | Status | Risk | Mitigation |
| :--- | :--- | :--- | :--- |
| **Next.js 15 App Router** | SAFE | Low | Ensure `@cloudflare/next-on-pages` is utilized. |
| **Firebase Client SDK** | SAFE | Low | Verified compatible with Edge environments. |
| **Genkit / Gemini** | SAFE | Medium | Ensure `fetch` is used (default in Genkit). |
| **Razorpay SDK** | REQUIRES CODE CHANGE | High | The Node SDK may fail on Edge. Direct REST calls recommended. |
| **Signature Verification**| REQUIRES CODE CHANGE | Medium | Transition from Node `crypto` to `node:crypto`. |
| **Image Uploads** | SAFE | Low | Firebase Storage remains the backend node. |
| **Authentication** | SAFE | Low | Persistence and redirects remain handled by Firebase Auth. |

---

## 3. High Risk Functional Nodes

### A. Razorpay Verification (`src/actions/payments.ts`)
- **Issue:** Uses standard Node `crypto` and the `razorpay` package.
- **Solution:** Use `node:crypto` compatibility flag in Cloudflare or manual signature verification via WebCrypto.
- **Risk:** High (Payment synchronization failure).

### B. Account Deletion (`src/actions/account.ts`)
- **Issue:** Recursive storage deletion.
- **Solution:** Ensure the list/delete promises don't time out during Edge execution (10s limit on free Workers).
- **Risk:** Medium.

---

## 4. Environment Variable Strategy

### PUBLIC (Browser)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### SECRET (Cloudflare Vault)
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`
- `FIREBASE_CONFIG` (If needed for server-side init)

---

## 5. Final Verdict
**READY FOR PREPARATION**

No architectural rewrites are required. The migration focuses on environment synchronization and Edge-compatible crypto imports.

---
*Audit Finalized: March 2024*
