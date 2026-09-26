# Aura Stage 2C — Cloud Run Staging Readiness Report 🛡️

**Date:** March 2024
**Staging Project:** `aura-staging-37c73`
**Production Project:** `nextn`

## 1. Target Verification
- **Staging Alias:** Verified as `aura-staging-37c73` in `.firebaserc`.
- **Production Safety:** `nextn` remains the default deployment target, ensuring production isolation.

## 2. Billing Check
- **Status:** UNKNOWN (Requires Console Verification).
- **Requirement:** Cloud Run deployment requires the target project to be on the **Blaze (Pay as you go)** billing plan to support container orchestration. 
- **Action:** Ensure `aura-staging-37c73` has a valid billing account attached before proceeding.

## 3. Cloud Run API Status
The following APIs must be manually enabled in the Google Cloud Console for the staging project:
- `run.googleapis.com` (Cloud Run)
- `artifactregistry.googleapis.com` (Artifact Registry)
- `cloudbuild.googleapis.com` (Cloud Build)

## 4. Deployment File Verification
- **Next.js Standalone:** ENABLED in `next.config.ts`.
- **Dockerfile:** Structurally optimized for `server.js` execution on PORT 8080.
- **Firebase.json:** Configured to rewrite dynamic traffic to `aura-staging-server` in `us-central1`.
- **Package.json:** Build scripts are synchronized with standalone output requirements.

## 5. Environment Variable Readiness
The application is architected to receive the following mandatory nodes:
- **Client Nodes:** `NEXT_PUBLIC_FIREBASE_*` (Must be configured for staging values).
- **Server Nodes:** `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY` (MUST be injected into the Cloud Run service settings manually).

## 6. Security & Production Safety
- **Isolation:** No production secrets are hardcoded or shared with the staging configuration.
- **Rules:** `firestore.rules` and `firestore.indexes.json` are prepared for the staging mirror.
- **Production Status:** `nextn` remains definitively untouched.

## 7. Build Readiness
- **Standalone Artifact:** The project successfully generates the `.next/standalone` directory required for container footprint efficiency.

## 8. Manual Actions Required
1. **Upgrade Billing:** Transition `aura-staging-37c73` to the Blaze plan.
2. **Enable APIs:** Activate Cloud Run and Artifact Registry APIs in the staging project.
3. **Inject Secrets:** Manually add server-side secrets to the Cloud Run service environment during the deployment stage.

---
**Final Status:** STAGE 2C BLOCKED (Pending Billing & API Verification)

**Condition:** BILLING UPGRADE REQUIRED — MANUAL ACTION