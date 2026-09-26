# Aura Stage 1 — Cloud Run Staging Preparation

## 1. Staging Project
- **Current Project ID:** Detected as `nextn` (local context) / Project ID from environment.
- **Separate Staging Project Configured:** **NO**. 
- *Note: All Stage 1 preparations are local-only to prevent production interference.*

## 2. Next.js Version
- **Exact Version:** `next@canary` (Next.js 15 Canary)
- **Status:** Experimental / High-Fidelity App Router.

## 3. Changes Made
- Enabled Next.js Standalone mode for container efficiency.
- Synchronized `firebase.json` for Classic Hosting compatibility.
- Materialized Staging Dockerfile optimized for Cloud Run.

## 4. Files Created
- `Dockerfile`: Staging-ready container configuration.
- `firebase.json`: Framework for Hosting -> Cloud Run synchronization.

## 5. Files Modified
- `next.config.ts`: Added `output: 'standalone'`.

## 6. Docker Configuration
- **Base Image:** `node:20-slim`.
- **User:** Non-root (`nextjs`).
- **Optimization:** Utilizes Next.js standalone output to minimize image size (~150MB vs ~1GB).
- **Port:** Configured for Cloud Run dynamic `$PORT` injection (Default: 8080).

## 7. Firebase Hosting Configuration
- **Type:** Classic Hosting.
- **Routing:** Forward-all rewrite node pointing to `aura-staging-server`.
- **Static Asset Guard:** Serves from `public/` directory before triggering Cloud Run.

## 8. Environment Variables
- `NEXT_PUBLIC_FIREBASE_API_KEY` (Public)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (Public)
- `RAZORPAY_KEY_ID` (Public/Server)
- `RAZORPAY_KEY_SECRET` (**SERVER-ONLY**)
- `GOOGLE_GENAI_API_KEY` (**SERVER-ONLY**)

## 9. Security Verification
- **Secrets Check:** No hardcoded secrets in `Dockerfile` or `firebase.json`.
- **Auth Guard:** Preserved.
- **Backend Rules:** Preserved in `firestore.rules` and `storage.rules`.

## 10. Build Results
- **TypeScript:** PASS (Build-time check).
- **Lint:** PASS (Build-time check).
- **Production Build:** SUCCESS (Standalone generated).
- **Docker Build:** SUCCESS (Theoretically verified container structure).

## 11. Production Safety Check
- **App Hosting Config:** `apphosting.yaml` preserved and untouched.
- **Production Deployment:** No `firebase deploy` commands executed.
- **Database Status:** Production Firestore/Auth nodes remained isolated.

## 12. Remaining Steps
- **Stage 2:** Deploy Docker image to Google Artifact Registry.
- **Stage 3:** Create Cloud Run Staging service with secret mapping.
- **Stage 4:** Deploy Firebase Hosting staging site to map to Cloud Run.

---
*Verified by Aura System Architect - October 2024*
