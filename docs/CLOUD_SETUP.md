# Multi-Cloud Credential Setup and IAM Permissions

## Purpose
This document summarizes the required parameters and minimum read-only permissions for configuring AWS, Azure, GCP, and OCI.

---

## 1. Provider Parameters and Permissions

### 1.1 Amazon Web Services (AWS)
- **Parameters**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`
- **Required IAM Permissions**:
  - `sts:GetCallerIdentity` (Identity verification)
  - `cloudtrail:LookupEvents` (Audit log ingestion)
- **Recommended Managed Policy**: `SecurityAudit`

---

### 1.2 Microsoft Azure
- **Parameters**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_SECRET`
- **Required Microsoft Entra ID Scopes**:
  - Microsoft Graph: `User.Read`, `AuditLog.Read.All`
  - Azure ARM: `Reader` role on subscription
- **Endpoint**: Supports standard enterprise tenants and `/consumers` personal Microsoft accounts.

---

### 1.3 Google Cloud Platform (GCP)
- **Parameters**: `GOOGLE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (JSON key path)
- **Required IAM Roles**:
  - `roles/logging.viewer` (Cloud Logging API access)
  - `roles/viewer` (Project metadata inspection)
- **Storage**: Place the key under `credentials/gcp-service-account.json` (git-ignored).

---

### 1.4 Oracle Cloud Infrastructure (OCI)
- **Parameters**: `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY_PATH`, `OCI_REGION`
- **Required Permissions**: Read-only access to Audit events and Cloud Guard.
- **Demo Mode**: If unconfigured, the system automatically runs the verified OCI Demo Mode adapter.

---

## 2. Credential Security Policy
- Never commit access keys, client secrets, private keys, or service account JSON files to version control.
- `.gitignore` excludes all credential files and `.env` files from Git commits.
