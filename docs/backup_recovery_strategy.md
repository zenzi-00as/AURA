
# Aura Backup & Recovery Strategy 🛡️

**Project:** Aura (Premium LGBTQ+ Social Discovery)
**Scope:** Firestore, Storage, Authentication, and Payment Metadata
**Status:** ARCHITECTED (Native Google Cloud Integration)

---

## 1. Executive Summary
Aura utilizes a multi-node backup strategy leveraging native Google Cloud Platform (GCP) and Firebase services. This ensures that user identity, private communications, and financial records are protected against accidental deletion, corruption, or infrastructure failure.

---

## 2. Data Sources & Mechanisms

| Data Node | mechanism | Frequency | Recovery Method |
| :--- | :--- | :--- | :--- |
| **Firestore** | Google Cloud Managed Export | Daily (Recommended) | `gcloud firestore import` |
| **Storage** | GCS Bucket Versioning | Continuous | Object Version Restore |
| **Authentication**| Firebase CLI Export | Weekly/On Demand | `firebase auth:import` |
| **Payments** | Firestore Purchase Logs | Real-time | Restore via Firestore Export |

---

## 3. Implementation Details

### A. Cloud Firestore (Daily Managed Export)
Firestore backups are stored in a dedicated GCS bucket: `gs://aura-backups-[PROJECT_ID]`.
- **Command (Manual):** `gcloud firestore export gs://aura-backups-[PROJECT_ID]`
- **Scheduling:** Use Google Cloud Scheduler + Cloud Functions (Requires Billing Account).

### B. Firebase Storage (Versioning)
Enable **Object Versioning** on the Storage bucket to protect member media (profile photos, verifications).
- **Command:** `gsutil versioning set on gs://[PROJECT_ID].appspot.com`

### C. Authentication (Account Export)
Auth data is separate from Firestore. We export user metadata without sensitive credentials.
- **Command:** `firebase auth:export aura_users.json --format=json`

---

## 4. Disaster Recovery Scenarios

### Scenario A: Accidental User Deletion
- **Action:** Locate the most recent Firestore export in GCS.
- **Procedure:** Import only the specific `users` collection to a staging environment, extract the required document, and restore it manually to production.

### Scenario B: Storage Corruption (Media Loss)
- **Action:** Use GCS Object Versioning.
- **Procedure:** Roll back the affected paths in `profilePhotos/` or `verifications/` to their previous known good state.

### Scenario C: Complete Data Corruption
- **Action:** Full Firestore Import.
- **Procedure:** Wipe the target database (Admin only) and run `gcloud firestore import`. **WARNING:** This overwrites all current data.

---

## 5. Security & Privacy
- **Isolation:** Backups are stored in GCS buckets with restricted IAM permissions.
- **Access:** Only `Owner` or `Storage Admin` roles may access backup data.
- **Member Privacy:** Backups are encrypted at rest by Google Cloud.

---

## 6. Manual Console Actions Required
1. **Create Backup Bucket:** Create a GCS bucket named `aura-backups-[PROJECT_ID]`.
2. **Enable Billing:** Ensure the GCP project has a billing account to support Managed Exports.
3. **IAM Permissions:** Grant the "Cloud Datastore Import Export Admin" role to the Firestore service account.

---
*Verified by Aura System Architect - October 2024*
