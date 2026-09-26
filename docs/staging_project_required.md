# Aura Staging Project Required 🛡️

**Date:** October 2024
**Current Production Project:** `nextn`
**Dedicated Staging Project:** NOT FOUND

## 1. Why Staging Isolation is Required
Aura operates on a high-fidelity, production-hardened infrastructure. To ensure the transition to **Classic Firebase Hosting + Cloud Run** does not compromise production data or security, a completely decoupled environment is mandatory.

Isolation prevents:
- Test interactions from appearing in production Discovery Stages.
- Development auth users from being synchronized with production identities.
- Experimental Firestore rule changes from affecting production security.
- Staging payment tests from interfering with production Razorpay logs.

## 2. Required Next Steps
The system owner must manually initialize a separate Firebase project to proceed with Stage 2.

1. **Create Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g., `aura-staging-xyz`).
2. **Enable Services:**
   - **Authentication:** Enable Email/Password provider.
   - **Firestore:** Initialize in Native Mode with the same region as production.
   - **Storage:** Initialize a default bucket.
   - **Hosting:** Initialize the default site.
3. **Register App:** Register a Web App in the staging project to generate a staging `firebaseConfig`.
4. **Link Workspace:** Add the staging project alias locally using `firebase use --add`.

## 3. Staging-Specific Configuration
Once the project is created, the staging environment will require:
- **Razorpay:** TEST MODE credentials only.
- **Gemini:** A separate API key for staging AI flows.
- **Rules:** Mirror production `firestore.rules` and `storage.rules`.

---
*Verified by Aura System Architect - October 2024*
