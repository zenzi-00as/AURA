
# Aura Classic Firebase Hosting + Cloud Run Compatibility Audit 🛡️

**Project:** Aura (Premium LGBTQ+ Social Discovery)
**Scope:** Feasibility of Classic Firebase Hosting + Cloud Run Architecture
**Status:** AUDIT COMPLETE

---

## 1. Executive Summary
**READY WITH CONDITIONS**

Aura is technically compatible with a deployment strategy utilizing **Classic Firebase Hosting + Cloud Run**. The application's reliance on Next.js 15 App Router and Server Actions requires a Node.js server environment, which Cloud Run provides. Classic Firebase Hosting can act as a high-speed CDN for static assets and a gateway for dynamic requests.

---

## 2. Current Architecture
Aura is currently architected as a high-fidelity Next.js 15 application using:
- **App Router:** For nested layouts and server-side logic.
- **Server Actions:** For secure operations (Account deletion, Interaction limits, Payment verification, AI triggers).
- **Genkit (Gemini 1.5 Flash):** For biometric verification and support automation.
- **Firebase Client SDK:** For real-time Firestore synchronization (Chat, Notifications).
- **Razorpay Node.js SDK:** For server-side signature validation.

---

## 3. Compatibility Matrix

| Feature | Current Aura Usage | Firebase Hosting | Cloud Run | Result | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Static Assets** | Images, CSS, Fonts | Serving Directly | N/A | **COMPATIBLE** | Hosting handles these at the edge. |
| **Server Actions** | Interactions, Payments | Gateway Only | Execution Node | **COMPATIBLE** | Requires Node.js runtime. |
| **Genkit / Gemini** | Biometrics, Support | Gateway Only | Execution Node | **COMPATIBLE** | Requires server-only secrets. |
| **Real-time Sync** | Chat, Notifications | Serving Client JS | N/A | **COMPATIBLE** | Uses Firebase Client SDK directly. |
| **Next.js SSR** | Dashboard entry | Gateway Only | Execution Node | **COMPATIBLE** | Cloud Run supports dynamic rendering. |
| **Middleware** | Auth Guards | Gateway Only | Execution Node | **COMPATIBLE** | Runs within the Next.js server. |

---

## 4. Server-Side Requirements
The following Aura features definitively require **Cloud Run** (or a similar Node.js environment):
- **Server Actions:** All files in `src/actions/` use `'use server'`.
- **Razorpay Verification:** `verifyRazorpayPayment` uses the `crypto` module and private secrets.
- **Genkit Flows:** AI processing must occur in a secure, server-side environment.
- **Environment Logic:** Verification of `RAZORPAY_KEY_SECRET` and `GEMINI_API_KEY`.

---

## 5. Firebase Hosting Requirements
Classic Firebase Hosting would serve as the entry point:
- **Static Assets:** Serving everything in the `.next/static` folder.
- **Public Assets:** Serving icons and placeholder images from the `public/` directory.
- **Gateway:** Routing all dynamic paths and POST requests (Server Actions) to Cloud Run.

---

## 6. Required Routing Concept
To synchronize these services, a `firebase.json` configuration would theoretically require rewrites:
1. **Static First:** Attempt to serve files from the `public` directory.
2. **Cloud Run Fallback:** Rewrite all remaining requests (`"source": "**"`) to the Cloud Run service ID.
3. **Header Sync:** Ensure `Cache-Control` headers are respected to prevent caching dynamic Server Action responses.

---

## 7. Security Compatibility
The current security model remains **unchanged and protected**:
- **Secrets:** `RAZORPAY_KEY_SECRET` and `GEMINI_API_KEY` remain strictly server-side within Cloud Run environment variables or Secret Manager.
- **Firestore/Storage Rules:** Remains governed by `firestore.rules` and `storage.rules`, as the client SDK handles these interactions directly from the browser.
- **Identity:** UID validation in Server Actions is preserved.

---

## 8. Environment Variables

| Variable Name | Classification | Current Usage |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser-safe | Client SDK Init |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`| Browser-safe | Client SDK Init |
| `RAZORPAY_KEY_ID` | Browser-safe | Razorpay UI Init |
| `RAZORPAY_KEY_SECRET` | **Must remain server-only** | Payment Verification |
| `GOOGLE_GENAI_API_KEY` | **Must remain server-only** | AI Flow Execution |

---

## 9. Build/Test Results
- **Production Build:** Theoretically compatible via `next build` with `output: 'standalone'` enabled in `next.config.ts`.
- **TypeScript:** Project uses strict typing; build-time checks are required.
- **Lint:** Standard Next.js linting applies.

---

## 10. Risks
- **Cold Starts:** Cloud Run instances may experience latency on initial requests, affecting Aura's "instant" aesthetic.
- **Timeouts:** Long-running AI flows (like video generation, if added) may hit Cloud Run request timeouts (default 5 min).
- **Sticky Sessions:** Not required for Aura, as it uses stateless JWT-based Firebase Auth.
- **Next.js 15 Compatibility:** Standard standalone builds are verified for Next.js 15.

---

## 11. Required Changes (Theoretical Analysis)
*Note: No changes have been implemented.*

### A. Required
- Enable `output: 'standalone'` in `next.config.ts`.
- Create a `Dockerfile` to package the Aura server.
- Configure `firebase.json` with a Cloud Run rewrite node.

### B. Recommended
- Use Google Cloud Secret Manager for `RAZORPAY_KEY_SECRET`.
- Configure Cloud Run "Minimum Instances" to 1 to eliminate cold starts for the Discovery Stage.

---

## 12. Migration Risk
**MEDIUM**

The risk is classified as Medium because Aura uses **Next.js 15 (Canary)**. While standalone mode is stable, the specific interaction between App Router Server Actions and Firebase Hosting rewrites requires precise configuration to ensure headers like `x-nextjs-data` are handled correctly.

---

## 13. Rollback Safety
Aura's current deployment remains definitively untouched. Testing a Cloud Run architecture can be performed on a separate Firebase "Site" or a staging Cloud Run URL without impacting the primary Aura production node.

---

## 14. Final Verdict

Can the current Aura project theoretically run using **Firebase Hosting (classic) + Cloud Run** without changing its application functionality?

**YES, WITH CONDITIONS**

**Conditions:**
1. The application must be packaged as a **Docker container**.
2. Next.js must be configured for **standalone output**.
3. **Environment variables** (Secrets) must be correctly mapped in the Cloud Run service configuration.
4. **Firebase Hosting rewrites** must be configured to forward all dynamic traffic to the Cloud Run endpoint.

---
*Audit Finalized: March 2024*
