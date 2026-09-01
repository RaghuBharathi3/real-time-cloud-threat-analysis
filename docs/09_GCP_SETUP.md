# 09. Google Cloud Platform (GCP) Setup

## Purpose
This document provides instructions for configuring a Google Cloud Service Account to enable Cloud Audit Log ingestion.

---

## 1. Prerequisites
- Google Cloud Project with the Cloud Logging API enabled.
- Permissions to create Service Accounts and download JSON keys.

---

## 2. Configuration Procedure

1. **Create Service Account**:
   - In GCP Console (`console.cloud.google.com`), go to **IAM & Admin** -> **Service Accounts**.
   - Create account named `cloud-security-reader`.
2. **Assign Read-Only Roles**:
   - Grant `Logging Viewer` (`roles/logging.viewer`).
   - Grant `Viewer` (`roles/viewer`).
3. **Generate Key File**:
   - Under the service account Keys tab, select **Add Key** -> **Create new key** -> **JSON**.
4. **Secure Key Placement**:
   - Save the downloaded file to:
     ```text
     credentials/gcp-service-account.json
     ```
   - Note: The `credentials/` folder is git-ignored to prevent accidental commits.
5. **Configure Environment**:
   Add the following variables to `.env`:
   ```ini
   GOOGLE_PROJECT_ID=<YOUR_GCP_PROJECT_ID>
   GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
   ```

---

## 3. Verification

Run the verification tool:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 GCP      [PASS]   CONNECTED       Authenticated successfully as <SERVICE_ACCOUNT_EMAIL> on project <PROJECT_ID>
```

---

## 4. Troubleshooting

| Error Code | Root Cause | Resolution |
| :--- | :--- | :--- |
| `FileNotFoundError` | JSON key file missing from specified path. | Verify file path in `GOOGLE_APPLICATION_CREDENTIALS`. |
| `Invalid grant: account not found` | Service account deleted in GCP console. | Re-create service account and generate a new key. |
| `PermissionDenied on Logging API` | `logging.viewer` role missing on project. | Grant `Logging Viewer` role to the service account. |
