# Cloud Provider Credential Checklist

This document details the exact credential requirements for connecting multi-cloud provider log streams to the platform. 

---

## 1. Provider Credentials Matrix

| Provider | Required Field | Format / Type | Storage Mechanism | Minimum Required Scope |
| :--- | :--- | :--- | :--- | :--- |
| **AWS** | `AWS_ACCESS_KEY_ID` | String (20 char uppercase) | AWS Secrets Manager / Parameter Store | Read-only access to `SecurityHub` and `CloudTrail` streams |
| | `AWS_SECRET_ACCESS_KEY` | String (40 char) | AWS Secrets Manager / Parameter Store | |
| | `AWS_REGION` | String (e.g. `us-east-1`) | Environment variable | |
| **Azure** | `AZURE_CLIENT_ID` | UUID (Service Principal ID) | Azure Key Vault | Reader role on the target Subscription |
| | `AZURE_TENANT_ID` | UUID | Azure Key Vault | |
| | `AZURE_SUBSCRIPTION_ID`| UUID | Azure Key Vault | |
| | `AZURE_CLIENT_SECRET` | String | Azure Key Vault | |
| **GCP** | `GOOGLE_PROJECT_ID` | String | Environment variable | Security Reviewer on Google Cloud SCC |
| | `GOOGLE_APPLICATION_CREDENTIALS` | Path to Service Account JSON key | GCP Secret Manager / Mounted File | |
| **OCI** | `OCI_TENANCY_OCID` | OCID string | Oracle Cloud Infrastructure Vault | Inspect/Read permissions on Cloud Guard |
| | `OCI_USER_OCID` | OCID string | Oracle Cloud Infrastructure Vault | |
| | `OCI_FINGERPRINT` | Hex MD5 fingerprint | Oracle Cloud Infrastructure Vault | |
| | `OCI_PRIVATE_KEY_PATH` | Path to API Key (.pem certificate) | Oracle Cloud Infrastructure Vault / File | |
| | `OCI_REGION` | OCI Region name (e.g. `us-ashburn-1`) | Environment variable | |

---

## 2. Configuration Guidelines

### 2.1 Local Developer Environment (`.env`)
1. Create a local `.env` file from the `.env.example` template.
2. If `DEMO_MODE=true`, you can leave cloud variables blank.
3. If testing live connectors locally, set `DEMO_MODE=false` and provide paths to certificate keys:
   * **GCP**: Store the Service Account key as `gcp-creds.json` (root directory, git-ignored) and configure:
     `GOOGLE_APPLICATION_CREDENTIALS=gcp-creds.json`
   * **OCI**: Store the private key as `oci_key.pem` (root directory, git-ignored) and configure:
     `OCI_PRIVATE_KEY_PATH=oci_key.pem`

### 2.2 Production Secret Storage
* **Do NOT store private key paths or service account JSON files as plaintext environment variables in production.**
* Instead:
  1. Mount the credentials file dynamically inside your Docker container or server instance.
  2. Use cloud-native secret manager integrations (like AWS Parameter Store or Azure Key Vault secrets) to fetch values directly during container bootstrap.
