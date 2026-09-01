# 08. Microsoft Azure Setup Guide

This guide details the setup for authenticating against Microsoft Entra ID and the Azure Resource Manager / Graph APIs.

---

## 1. Prerequisites
- Active Azure Subscription or Microsoft Entra ID Tenant
- Permission to register Applications in Microsoft Entra ID (`portal.azure.com`).

---

## 2. Configuration Steps

### Step 1: Register an App in Microsoft Entra ID
1. Navigate to **Microsoft Entra ID** $\rightarrow$ **App registrations** $\rightarrow$ **New registration**.
2. Name: `CloudSecurityPlatform`.
3. Supported account types: Select your tenant type (Single tenant or Multitenant / Personal Microsoft accounts).
4. Register the application.

### Step 2: Obtain Tenant and Client IDs
Copy the following identifiers from the **Overview** page:
- **Application (client) ID**
- **Directory (tenant) ID**

### Step 3: Create a Client Secret
1. Navigate to **Certificates & secrets** $\rightarrow$ **Client secrets** $\rightarrow$ **New client secret**.
2. Set an expiration period and click **Add**.
3. Copy the **Value** string immediately.

### Step 4: Configure Environment Variables
Add the following entries to `.env`:

```ini
AZURE_CLIENT_ID=<YOUR_AZURE_CLIENT_ID>
AZURE_TENANT_ID=<YOUR_AZURE_TENANT_ID>
AZURE_SUBSCRIPTION_ID=<YOUR_AZURE_SUBSCRIPTION_ID_OPTIONAL>
AZURE_CLIENT_SECRET=<YOUR_AZURE_CLIENT_SECRET>
```

---

## 3. Testing the Connection

Run the diagnostic CLI:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 AZURE    [PASS]   CONNECTED       Authenticated successfully with Microsoft Entra ID / Graph.
```

---

## 4. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `AADSTS7000215: Invalid client secret` | Client secret has expired or was mistyped. | Generate a new secret in Entra ID and update `.env`. |
| `AADSTS9002346: Use /consumers endpoint` | App is registered for Personal Microsoft Accounts. | Handled automatically by the built-in AzureAdapter fallback. |
| `AuthorizationFailed (ARM)` | Service principal lacks Reader role on subscription. | Assign `Reader` role on target Subscription or Resource Group. |
