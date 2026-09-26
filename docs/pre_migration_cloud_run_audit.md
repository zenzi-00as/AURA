# Aura Pre-Migration Cloud Run Audit 🛡️

**Project:** Aura (Premium LGBTQ+ Social Discovery)
**Scope:** Final Feasibility & Configuration Analysis for Classic Hosting + Cloud Run
**Status:** INSPECTION COMPLETE

---

## 1. Exact Dependency Versions
Based on the current `package.json` node:
- **next**: `canary` (Next.js 15 Node)
- **react**: `^19.0.0`
- **react-dom**: `^19.0.0`
- **firebase**: `^11.9.1`
- **firebase-admin**: NOT INSTALLED (Server Actions currently utilize client SDK `firebase` package)
- **genkit**: `^1.28.0`
- **@genkit-ai/google-genai**: `^1.28.0`
- **typescript**: `^5`

## 2. Next.js Stability Status
The currently installed Next.js version is **canary**. It is **NOT** a stable production release, which necessitates careful testing of the standalone output node.

## 3. Current next.config Status
**Standalone output is NOT currently enabled.**
The configuration is presently optimized for image optimization and build-error bypass protocols.

## 4. Current Firebase Hosting Configuration
A `firebase.json` file is **not detected**. The project is currently managed exclusively via **Firebase App Hosting** configuration nodes.

## 5. Current App Hosting Configuration
The project contains `apphosting.yaml` configured with `maxInstances: 1`. Classic Firebase Hosting and Cloud Run can be tested in a separate staging site without destroying or interfering with this existing App Hosting deployment.

## 6. Server-Side Requirements
| Feature | File/Location | Requires Node Server? | Cloud Run Compatible? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Server Actions** | `src/actions/*.ts` | YES | YES | Handles atomic interactions & payments. |
| **Genkit Flows** | `src/ai/flows/*.ts` | YES | YES | AI biometric & support agent logic. |
| **Razorpay Sync** | `src/actions/payments.ts` | YES | YES | Signature verification via `crypto`. |
| **Env Validation** | `src/lib/env-validation.ts` | YES | YES | Secure retrieval of server-only secrets. |
| **Middleware** | `middleware.ts` (N/A) | NO | YES | Not currently implemented in Aura. |

## 7. Environment Variable Classification
| Variable Name | Classification | Required in Cloud Run? |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | PUBLIC | YES |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`| PUBLIC | YES |
| `RAZORPAY_KEY_ID` | PUBLIC | YES |
| `RAZORPAY_KEY_SECRET` | **SERVER-ONLY** | YES (CRITICAL) |
| `GOOGLE_GENAI_API_KEY` | **SERVER-ONLY** | YES (CRITICAL) |

## 8. Cloud Run Requirements
- **Runtime**: Node.js 20+
- **Standalone Requirement**: `output: 'standalone'` must be enabled in `next.config.ts`.
- **PORT Behavior**: Application must listen on the port provided by the `PORT` env var (Cloud Run standard).
- **Filesystem**: Stateless. No persistent local storage assumed.
- **Memory**: 1GB minimum recommended for Genkit/AI flow stability.

## 9. Firebase Hosting Routing Requirements
Theoretical rewrites required in `firebase.json`:
1. Static assets (`/_next/static/**`, `/public/**`) served by Hosting CDN.
2. All other traffic (`{"source": "**", "run": {"serviceId": "aura-server"}}`) routed to Cloud Run.

## 10. Razorpay Compatibility
**COMPATIBLE.** Secure payment processing in `src/actions/payments.ts` relies on server-side `crypto` and `razorpay` SDKs. Cloud Run provides the secure environment necessary to protect `RAZORPAY_KEY_SECRET`.

## 11. Genkit/Gemini Compatibility
**COMPATIBLE.** AI processing remains strictly server-side in Aura. Cloud Run supports the execution of Genkit flows and protects the `GOOGLE_GENAI_API_KEY` from client exposure.

## 12. Security Preservation
The proposed architecture **preserves all current security controls**:
- Firestore & Storage rules remain governed by Firebase backend.
- UID validation in Server Actions remains hardware-locked.
- Admin privileges (`isAdmin` check) are preserved server-side.

## 13. Staging Isolation
Staging can be definitively isolated by:
1. Creating a new **Site** in Firebase Hosting.
2. Deploying a **Staging Cloud Run service**.
3. Mapping the Site to the Staging service.
This allows for zero-risk validation while **Aura Production (App Hosting)** remains active.

## 14. Required Future Changes
- **REQUIRED**: Enable `output: 'standalone'` in `next.config.ts`.
- **REQUIRED**: Materialize `Dockerfile` for Cloud Run packaging.
- **RECOMMENDED**: Map secrets via Google Cloud Secret Manager.

## 15. Migration Risk
**MEDIUM**
The risk is centralized on the **Next.js 15 Canary** standalone build stability and the routing of Server Action headers through the Firebase Hosting gateway.

## 16. Final Pre-Migration Verdict
**READY FOR STAGING IMPLEMENTATION**

---
*Audit Finalized: October 2024*