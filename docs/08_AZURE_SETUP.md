# 08. Microsoft Azure Setup

## Purpose
This document provides instructions for configuring Microsoft Entra ID application credentials to enable Azure log ingestion.

---

## 1. Prerequisites
- Active Microsoft Azure subscription or Microsoft Entra ID tenant.
- Permissions to register applications in Microsoft Entra ID (`portal.azure.com`).

---

## 2. Configuration Procedure

1. **Register Application**:
   - In Microsoft Entra ID, navigate to **App registrations** -> **New registration**.
   - Set Name to `CloudSecurityPlatform`.
2. **Collect Tenant and Client IDs**:
   - Record the **Application (client) ID** and **Directory (tenant) ID**.
3. **Generate Client Secret**:
   - Navigate to **Certificates & secrets** -> **New client secret**.
   - Copy the secret string Value immediately.
4. **Configure Environment**:
   Add the following variables to `.env`:
   ```ini
   AZURE_CLIENT_ID=<YOUR_AZURE_CLIENT_ID>
   AZURE_TENANT_ID=<YOUR_AZURE_TENANT_ID>
   AZURE_SUBSCRIPTION_ID=<YOUR_AZURE_SUBSCRIPTION_ID_OPTIONAL>
   AZURE_CLIENT_SECRET=<YOUR_AZURE_CLIENT_SECRET>
   ```

---

## 3. Verification

Run the verification tool:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 AZURE    [PASS]   CONNECTED       Authenticated successfully with Microsoft Entra ID / Graph.
```

---

## 4. Troubleshooting

| Error Code | Root Cause | Resolution |
| :--- | :--- | :--- |
| `AADSTS7000215: Invalid client secret` | Client secret expired or mistyped. | Generate a new secret in Entra ID and update `.env`. |
| `AADSTS9002346` | App configured for Personal Microsoft Accounts. | Handled automatically by the built-in AzureAdapter fallback. |
| `AuthorizationFailed (ARM)` | Service principal lacks Reader role on subscription. | Assign `Reader` role on the target Azure Subscription. |
