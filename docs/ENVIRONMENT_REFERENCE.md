# Environment Variables Reference

This document serves as the standard reference manual for all configuration parameters utilized by the platform.

---

## 1. Environment Reference Matrix

| Variable Name | Purpose | Required? | Exposure | Where to Obtain |
| :--- | :--- | :--- | :--- | :--- |
| **`DEMO_MODE`** | Switches between mock sandbox (true) and production checks (false). | Optional (Defaults to `true`) | Public | Developer setting. |
| **`DATABASE_URL`** | PostgreSQL database connection URI string. | Required in Prod | Server-Only | Supabase DB Settings -> Connection string. |
| **`SUPABASE_URL`** | Base URL API endpoint for the Supabase instance. | Required in Prod | Public | Supabase Project Settings -> API. |
| **`SUPABASE_ANON_KEY`** | Client-safe API key for public requests. | Required in Prod | Public | Supabase Project Settings -> API. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Bypass RBAC administrative secret key. | Required in Prod | Highly Sensitive | Supabase Project Settings -> API. |
| **`SUPABASE_JWT_SECRET`** | Secret key used to sign and decode user tokens. | Required in Prod | Highly Sensitive | Supabase Project Settings -> API. |
| **`RAZORPAY_KEY_ID`** | Public payment identifier key. | Required in Prod | Public | Razorpay Dashboard -> API Keys. |
| **`RAZORPAY_KEY_SECRET`** | Secret key for initiating orders. | Required in Prod | Highly Sensitive | Razorpay Dashboard -> API Keys. |
| **`RAZORPAY_WEBHOOK_SECRET`**| HMAC key for validating webhook signatures. | Required in Prod | Highly Sensitive | Razorpay Dashboard -> Webhook setup. |
| **`AWS_ACCESS_KEY_ID`** | Access key identifier for AWS services. | Required in Prod | Highly Sensitive | AWS Console -> IAM user credentials. |
| **`AWS_SECRET_ACCESS_KEY`** | Secret access key for IAM authentication. | Required in Prod | Highly Sensitive | AWS Console -> IAM user credentials. |
| **`AWS_REGION`** | AWS Region name (e.g. `us-east-1`). | Required in Prod | Public | AWS Console. |
| **`AZURE_CLIENT_ID`** | Service Principal Client (Application) ID. | Required in Prod | Highly Sensitive | Azure Portal -> App Registrations. |
| **`AZURE_TENANT_ID`** | Directory Tenant ID for Azure AD. | Required in Prod | Highly Sensitive | Azure Portal -> Entra ID. |
| **`AZURE_SUBSCRIPTION_ID`**| Target Subscription ID for access logs. | Required in Prod | Public | Azure Portal -> Subscriptions. |
| **`AZURE_CLIENT_SECRET`** | Service Principal Client Secret. | Required in Prod | Highly Sensitive | Azure Portal -> App Registrations Certificates/Secrets. |
| **`GOOGLE_PROJECT_ID`** | GCP Project Identifier. | Required in Prod | Public | Google Cloud Console. |
| **`GOOGLE_APPLICATION_CREDENTIALS`** | Local server file path to the service account JSON key file. | Required in Prod | Highly Sensitive | Google Cloud Console -> IAM -> Service Accounts -> Keys. |
| **`OCI_TENANCY_OCID`** | Tenancy Identifier OCID for Oracle Cloud. | Required in Prod | Highly Sensitive | OCI Console -> Profile -> Tenancy. |
| **`OCI_USER_OCID`** | User Identifier OCID for API access. | Required in Prod | Highly Sensitive | OCI Console -> Identity -> Users. |
| **`OCI_FINGERPRINT`** | Fingerprint of the OCI API PEM key. | Required in Prod | Highly Sensitive | OCI Console -> User Settings -> API Keys. |
| **`OCI_PRIVATE_KEY_PATH`** | Local server file path to the OCI API private key (.pem format). | Required in Prod | Highly Sensitive | Generated during OCI API Key registration. |
| **`OCI_REGION`** | OCI active region name (e.g. `us-ashburn-1`). | Required in Prod | Public | OCI Console. |
