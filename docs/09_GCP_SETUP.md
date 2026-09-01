# 09. Google Cloud Platform (GCP) Setup Guide

This guide describes how to configure a backend-only Google Cloud Service Account for Cloud Audit Log ingestion.

---

## 1. Prerequisites
- Google Cloud Project with Cloud Logging API enabled
- IAM Admin permissions to create Service Accounts and generate JSON keys.

---

## 2. Configuration Steps

### Step 1: Create a Service Account
1. In Google Cloud Console (`console.cloud.google.com`), go to **IAM & Admin** $\rightarrow$ **Service Accounts**.
2. Click **Create Service Account**.
3. Name: `cloud-security-reader`.

### Step 2: Grant Least-Privilege IAM Roles
Assign the following read-only roles:
- `Logging Viewer` (`roles/logging.viewer`)
- `Viewer` (`roles/viewer`)

### Step 3: Generate Backend Service Account Key
1. Click the created Service Account $\rightarrow$ **Keys** $\rightarrow$ **Add Key** $\rightarrow$ **Create new key**.
2. Select **JSON** format and download the file.

### Step 4: Secure Key Placement
Move the downloaded file to the backend credentials folder:
```text
credentials/gcp-service-account.json
```

> [!CAUTION]
> **Strict Security Rule**: `credentials/` is ignored by `.gitignore`. Never commit service account JSON keys or expose them to frontend bundles.

### Step 5: Configure Environment Variables
Add the following entries to `.env`:

```ini
GOOGLE_PROJECT_ID=<YOUR_GCP_PROJECT_ID>
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
```

---

## 3. Testing the Connection

Run the diagnostic verification utility:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 GCP      [PASS]   CONNECTED       Authenticated successfully as <SERVICE_ACCOUNT_EMAIL> on project <PROJECT_ID>
```

---

## 4. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `FileNotFoundError: credentials/...` | JSON key not placed in the exact specified directory. | Verify file path in `GOOGLE_APPLICATION_CREDENTIALS`. |
| `Invalid grant: account not found` | Service account was deleted in GCP console. | Re-create service account and generate a new key JSON. |
| `PermissionDenied on Logging API` | `logging.viewer` role missing on project. | Grant `Logging Viewer` role to the service account. |
