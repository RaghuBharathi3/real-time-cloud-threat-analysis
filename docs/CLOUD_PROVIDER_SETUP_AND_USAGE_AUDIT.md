# Cloud Provider Setup and Usage Audit

This audit evaluates the multi-cloud security platform codebase, cloud adapters, environment variables, API endpoints, and frontend configuration to provide the exact setup requirements for development, testing, and university demonstrations.

---

## 1. Project Configuration

### 1. What cloud providers are actually implemented?
- **AWS**: Implemented via `boto3` SDK (`backend/app/adapters/aws_adapter.py`).
- **Azure**: Implemented via `azure-identity` SDK (`backend/app/adapters/azure_adapter.py`).
- **Google Cloud (GCP)**: Implemented via `google-auth` SDK (`backend/app/adapters/gcp_adapter.py`).
- **OCI**: Implemented with deterministic Oracle Cloud Guard telemetry adapter (`backend/app/adapters/oci_adapter.py`).

### 2. Which providers support real API connections?
- **AWS**: Connects to AWS Security Token Service (`sts:GetCallerIdentity`) and AWS CloudTrail (`cloudtrail:LookupEvents`).
- **Azure**: Connects to Microsoft Identity Platform / Entra ID and Azure Resource Manager to validate service principal OAuth2 tokens.
- **Google Cloud (GCP)**: Connects to Google OAuth2 token endpoint using a Service Account JSON private key to verify cryptographic signatures and permissions.

### 3. Which providers currently support Demo Mode?
All four providers (AWS, Azure, GCP, OCI) support Demo Mode. If cloud credentials are not supplied, the adapter automatically generates deterministic telemetry matching the Canonical Event Schema.

### 4. Which providers are fully implemented, partially implemented, not configured, or only planned?
- **AWS**: Fully Implemented (Live STS identity validation + CloudTrail lookup + synthetic fallback).
- **Azure**: Fully Implemented (Live Entra ID token acquisition across ARM and Graph scopes + Activity Log normalizer).
- **GCP**: Fully Implemented (Live Service Account cryptographic validation + Cloud Audit log normalizer).
- **OCI**: Partially Implemented / Demo Mode (OCI schema normalizer and deterministic Cloud Guard stream).

### 5. What exact environment variables does the current code require for each provider?
- **AWS**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (optional: `AWS_ACCOUNT_ID`).
- **Azure**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` (optional: `AZURE_SUBSCRIPTION_ID`).
- **GCP**: `GOOGLE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (local file path to Service Account JSON).
- **OCI**: `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY_PATH`, `OCI_REGION`.

### 6. Are any required environment variables missing from `.env.example`?
No. All variables used across `backend/app/config.py` and the adapters are present in `.env.example`.

### 7. Are there any variables in `.env.example` that the current code does not actually use?
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Decoupled supporting authentication variables; the project uses local SQLite session management.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: Decoupled; local cryptographic HMAC-SHA256 mock checkout is used for local subscription testing.

### 8. Does the application start successfully without any cloud credentials when Demo Mode is enabled?
Yes. When `DEMO_MODE=true` (or when credentials are blank), the application boots cleanly on ports 8000 and 5173, initializes SQLite tables, loads the trained Random Forest model, and processes synthetic multi-cloud security telemetry.

### 9. What should `DEMO_MODE` be set to for the easiest initial setup?
Set `DEMO_MODE=true` in `.env`.

### 10. Is there a provider-specific enable/disable setting?
No individual boolean flags are required. The adapter system checks credential presence on startup:
- If credentials for a provider are present in `.env`, that provider runs in Live / Connected Mode.
- If credentials are empty or missing, that provider operates in Demo Mode.

---

## 2. AWS Setup

### 1. What AWS APIs/services does the project currently call?
- **AWS Security Token Service (STS)**: `sts:GetCallerIdentity` to verify IAM credentials, Account ID, and caller ARN.
- **AWS CloudTrail**: `cloudtrail:LookupEvents` to query recent management events (with graceful fallback to canonical telemetry if CloudTrail logging is not active).

### 2. What permissions does the AWS adapter actually require?
- `sts:GetCallerIdentity`
- `cloudtrail:LookupEvents` (optional for log queries)

### 3. Which AWS credentials are required by the current implementation?
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```
`AWS_ACCOUNT_ID` is optional (the adapter auto-detects the Account ID via `sts:GetCallerIdentity`).

### 4. Is an AWS Session Token also required?
No. Long-lived IAM user access keys do not require a session token.

### 5. Does the application support IAM roles or only access keys?
The adapter uses standard `boto3.Session`, which supports IAM access keys directly. (If running on an EC2 instance or ECS container with an attached instance profile, boto3 automatically uses the IAM role if key variables are unset).

### 6. What AWS region should I use?
Use `ap-south-1` (Mumbai) or `us-east-1` (N. Virginia), matching the region where your IAM user was created.

### 7. Where do I find the AWS Account ID?
In the AWS Management Console, click on your account name in the top-right corner; the 12-digit Account ID is displayed.

### 8. Where do I create the IAM identity required by this project?
AWS Console -> **IAM** -> **Users** -> **Create user** (e.g., `cloud-security-reader`) -> **Security credentials** tab -> **Create access key** -> Select **Command Line Interface (CLI)**.

### 9. What is the minimum practical read-only IAM policy required by the actual implementation?
Attach the AWS managed policy:
`arn:aws:iam::aws:policy/SecurityAudit`
Or create an inline policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "cloudtrail:LookupEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 10. Do I need CloudTrail, Security Hub, CloudWatch, GuardDuty, EC2, S3, or any other AWS service enabled?
No additional services need to be configured. The STS identity check validates connectivity without needing active CloudWatch or GuardDuty instances.

### 11. Which of those services are actually used by the current code versus merely useful for future development?
- **Actually Used**: STS (`sts:GetCallerIdentity`), CloudTrail (`cloudtrail:LookupEvents`).
- **Future Expansion**: GuardDuty, Security Hub, S3 audit buckets.

### 12. Do I need to create any AWS resources before connecting the project?
No. Creating an IAM user and generating an Access Key pair is sufficient.

### 13. What exact values do I put into `.env`?
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

### 14. Which AWS values are secrets and must never be shown, committed, or placed in the frontend?
- `AWS_SECRET_ACCESS_KEY` is a critical secret.
- `AWS_ACCESS_KEY_ID` is sensitive.
Both must remain in `.env` and are filtered out of API responses.

### 15. How do I test the AWS connection from this project?
1. Through the web UI: Navigate to **Cloud Providers** -> Click **Test Connection** on the AWS card.
2. Through the API: `POST http://127.0.0.1:8000/api/v1/cloud/test-connection/aws`.

### 16. What should the application display when AWS is successfully connected?
```json
{
  "provider": "aws",
  "status": "CONNECTED",
  "account_id": "123456789012",
  "region": "ap-south-1",
  "arn": "arn:aws:iam::123456789012:user/cloud-security-reader",
  "details": "Authenticated successfully as arn:aws:iam::123456789012:user/cloud-security-reader"
}
```

### 17. What should I do if AWS returns AccessDenied?
Verify the IAM user has `sts:GetCallerIdentity` permission (enabled by default for all IAM users) and that the access key is active in the AWS IAM Console.

---

## 3. Azure Setup

### 1. What Azure services/APIs does the current project actually access?
- **Microsoft Identity Platform (Entra ID)**: Token acquisition endpoint (`https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`).
- **Azure Resource Manager / Microsoft Graph**: Evaluates tokens against `https://management.azure.com/.default` and `https://graph.microsoft.com/.default`.

### 2. Does the project use a Microsoft Entra service principal?
Yes. It uses the OAuth2 Client Credentials flow via `ClientSecretCredential`.

### 3. Which of these variables are actually required?
```env
AZURE_CLIENT_ID=your_app_client_id
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_SUBSCRIPTION_ID=your_subscription_id
```
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`: REQUIRED for authentication.
- `AZURE_SUBSCRIPTION_ID`: Optional identifier.

### 4. Are any additional Azure variables required?
No.

### 5. Where do I find these values?
1. In the Azure Portal (`portal.azure.com`), search for **Microsoft Entra ID** (formerly Azure Active Directory).
2. Go to **App registrations** -> Select or create your app.
   - **Client ID**: Listed as **Application (client) ID**.
   - **Tenant ID**: Listed as **Directory (tenant) ID**.
3. Under **Certificates & secrets** -> **Client secrets** -> Click **New client secret** -> Copy the **Value** column (this is `AZURE_CLIENT_SECRET`).
4. Under **Subscriptions**, copy your **Subscription ID**.

### 6. Does the project require an App Registration?
Yes. Creating an App Registration generates the Client ID and Client Secret.

### 7. Does it require a service principal?
Creating an App Registration automatically creates the corresponding Service Principal in your tenant.

### 8. What Azure RBAC role does the application actually need?
`Reader` (Read-only role).

### 9. Can I use the Reader role for this project?
Yes. The `Reader` role is sufficient for reading activity telemetry.

### 10. At what scope should I assign the role?
- **Subscription level** (Recommended for full multi-resource inspection) or
- **Resource Group level** (Sufficient for localized prototype testing).

### 11. Which option is safest and sufficient for this project?
Resource Group level is safest. Subscription level is also acceptable for academic sandbox environments.

### 12. Do I need to enable any Azure APIs or resource providers?
No special resource providers need to be enabled; standard Entra token validation works out-of-the-box.

### 13. Do I need an Azure for Students account, or can I use an existing Azure subscription?
Any Azure subscription (Azure for Students, Free Trial, or Pay-As-You-Go) will work.

### 14. How do I test the Azure connection from the application?
1. In the UI: Navigate to **Cloud Providers** -> Click **Test Connection** on the Azure card.
2. In the API: `POST http://127.0.0.1:8000/api/v1/cloud/test-connection/azure`.

### 15. What happens if the client secret is expired or invalid?
The adapter captures `ClientAuthenticationError` and returns `status: "INVALID"` with details indicating that credential authentication failed. The server will not crash.

### 16. Which Azure credentials must never be exposed?
`AZURE_CLIENT_SECRET` is a secret key and must never be exposed or committed.

---

## 4. Google Cloud Setup

### 1. What Google Cloud APIs/services does the current implementation use?
- **Google OAuth2 Token Service**: Token validation and cryptographic signature verification.
- **Google Cloud Logging API** (Optional for reading live audit logs): `https://www.googleapis.com/auth/logging.read`.

### 2. Does it require a service account?
Yes. The adapter authenticates using a Google Cloud Service Account.

### 3. Which variables are actually required?
```env
GOOGLE_PROJECT_ID=cloud-security-student-gcp
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
```

### 4. Is `GOOGLE_PROJECT_ID` the Project ID or Project Number?
It is the **Project ID** (the lowercase string identifier, e.g., `cloud-security-student-gcp`), NOT the numerical project number.

### 5. What exact format should `GOOGLE_APPLICATION_CREDENTIALS` contain?
A relative or absolute file path to the downloaded Service Account JSON key file on disk (e.g., `credentials/gcp-service-account.json`).

### 6. Does the project expect a JSON service-account key file?
Yes. The file contains the RSA private key and service account email for offline and online OAuth2 JWT signing.

### 7. Where should that JSON file be stored locally?
Inside the `credentials/` folder in the project root directory.

### 8. What should the project directory structure look like?
```text
cloud/
├── backend/
├── frontend/
├── credentials/
│   ├── .gitkeep
│   └── gcp-service-account.json
├── docs/
├── scripts/
├── .env
└── .env.example
```
*(The `credentials/*.json` pattern is explicitly included in `.gitignore` to prevent accidental commit).*

### 9. What IAM role does the service account actually require?
`roles/logging.viewer` (Logs Viewer) or `roles/viewer` (Viewer).

### 10. Which APIs must be enabled?
- **Cloud Logging API** (`logging.googleapis.com`)

### 11. How do I create the service account?
1. In Google Cloud Console (`console.cloud.google.com`), select your Project.
2. Go to **IAM & Admin** -> **Service Accounts** -> Click **Create Service Account**.
3. Name: `cloud-security-reader` -> Click **Create and Continue**.
4. Grant role: **Logging** -> **Logs Viewer**.
5. Click **Done**.

### 12. How do I create/download the JSON credentials?
1. In the Service Accounts table, click on the service account you created.
2. Go to the **Keys** tab -> Click **Add Key** -> **Create new key**.
3. Key type: **JSON** -> Click **Create**.
4. Save the downloaded file to `credentials/gcp-service-account.json`.

### 13. Which fields from the JSON should NOT be copied into `.env`?
Do NOT copy the contents of the JSON file into `.env`. Only specify the **file path** (`credentials/gcp-service-account.json`) in `.env`.

### 14. How does the application locate the JSON file?
The adapter reads `settings.get("GOOGLE_APPLICATION_CREDENTIALS")`, resolves `os.path.abspath()`, and verifies file existence via `os.path.exists()`.

### 15. How do I test the GCP connection?
1. In the UI: Navigate to **Cloud Providers** -> Click **Test Connection** on the GCP card.
2. In the API: `POST http://127.0.0.1:8000/api/v1/cloud/test-connection/gcp`.

### 16. What should happen if the service account lacks permissions?
If the JSON key is valid, token validation will succeed. If Cloud Logging API is disabled, the adapter falls back to canonical GCP audit telemetry without breaking the pipeline.

### 17. Is there a way to use Application Default Credentials instead of a service-account key?
If `GOOGLE_APPLICATION_CREDENTIALS` is unset, standard `google.auth.default()` will check gcloud CLI credentials if installed. For isolated grading and portability, pointing to `credentials/gcp-service-account.json` is recommended.

---

## 5. Oracle Cloud Infrastructure (OCI)

### 1. Is OCI actually implemented?
Yes, as a dedicated adapter in `backend/app/adapters/oci_adapter.py` with canonical schema normalization for Oracle Cloud Guard and OCI Audit events.

### 2. Can it connect to OCI using real credentials?
It parses OCI configuration fields, but operates primarily in **verified Demo Mode** because full live OCI tenancy keys require complex RSA signing setups.

### 3. If yes, what exact credentials are required?
`OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY_PATH`, `OCI_REGION`.

### 4. If it is incomplete, should I leave OCI in Demo Mode?
**Yes. Leave OCI in Demo Mode.**

### 5. Is OCI required for demonstrating the project?
No. The platform is designed so that OCI provides deterministic Cloud Guard events alongside live AWS, Azure, and GCP adapters.

### 6. Summary for Demonstration
You can demonstrate live AWS, Azure, and GCP connections while keeping OCI in Demo Mode.

---

## 6. What Should I Use for the Demonstration?

### 1. Which cloud provider should I configure first?
**AWS**. It is the fastest to set up and validates via STS in under 1 second.

### 2. Which provider is easiest to configure?
**AWS** (requires only 2 keys and a region).

### 3. Which provider is most reliable for a university demonstration?
**AWS + Azure + GCP** (with OCI in Demo Mode).

### 4. Which providers can remain in Demo Mode?
All four providers can remain in Demo Mode if no cloud accounts are available. During presentation, keeping OCI in Demo Mode while connecting 1, 2, or 3 providers live is standard.

### 5. Can I demonstrate the complete ML pipeline without connecting any real cloud provider?
**Yes.** The system contains 5 deterministic multi-cloud scenarios (`aws_brute_force`, `azure_keyvault`, `gcp_storage_burst`, `oci_normal`, `aws_normal`) that pass through the full 5-stage ML pipeline.

### 6. Can I demonstrate the project with only one real cloud provider and the remaining providers in Demo Mode?
**Yes.** The system uses a hybrid architecture: every adapter checks its own connectivity independently.

### 7. Recommended Demonstration Configuration:
```text
AWS      -> LIVE (Configured via IAM Access Key)
Azure    -> LIVE (Configured via Entra ID Service Principal)
GCP      -> LIVE (Configured via Service Account JSON)
OCI      -> DEMO MODE (Deterministic Oracle Cloud Guard stream)
```

---

## 7. Demo Mode

### 1. How do I enable Demo Mode?
In `.env`, set:
```env
DEMO_MODE=true
```

### 2. Does Demo Mode require cloud credentials?
No. Zero external accounts, API keys, or credit cards are required.

### 3. How do I generate demo events?
- **From the UI Header**: Use the **Run Test Scenario...** dropdown.
- **From the Overview Screen**: Click on any of the 4 scenario buttons under **Deterministic Test Scenarios**.
- **Via REST API**: Send a `POST` request to `/api/v1/pipeline/demo-scenario/{scenario_name}`.

### 4. What types of events are available?
1. `aws_brute_force`: Multiple consecutive failed IAM login attempts (Critical Risk: 96/100).
2. `azure_keyvault`: Unauthorized secret access from anomalous geolocation (Critical Risk: 96/100).
3. `gcp_storage_burst`: High-velocity object reads across sensitive KMS-encrypted assets (High Risk: 87/100).
4. `oci_normal`: Routine authorized compute object reads (Low Risk: 10/100).
5. `aws_normal`: Standard read telemetry within baseline thresholds (Low Risk: 10/100).

### 5. Do demo events pass through all pipeline stages?
**Yes.** Every event undergoes:
1. **Module 1**: Pydantic schema validation (`SecurityEvent`).
2. **Module 2**: Feature extraction (6-dimensional feature vector).
3. **Module 3**: Random Forest ML model inference.
4. **Risk Calculation**: 0 to 100 deterministic risk formulation.
5. **Compliance Mapping**: NIST CSF 2.0, CIS Controls v8, ISO 27001 mappings.
6. **Persistence**: Saved to SQLite database (`cloud_security.db`).

### 6. How do I verify that the ML model is actually processing the demo events?
1. Open the **Security Events** tab in the console.
2. Click on the ingested event to open the **Deep Event Inspector**.
3. View the **Module 2 Features** tab to see the 6 engineered features.
4. View the **Explainability** tab to inspect the Random Forest classification verdict, confidence percentage, and diagnostic reasoning.

### 7. How do I switch from Demo Mode to real cloud data?
Set `DEMO_MODE=false` in `.env`, provide credentials, and click **Test All Connectors** on the **Cloud Providers** tab.

### 8. Can I use Demo Mode for a professor presentation without connecting all four providers?
Yes. The platform was designed specifically for academic defense and live evaluation.

---

## 8. Exact `.env` Setup

```env
# ==============================================================================
# AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments
# Configuration (.env)
# ==============================================================================

# Core Operating Mode [REQUIRED]
DEMO_MODE=true
DATABASE_URL=sqlite:///backend/app/cloud_security.db

# Amazon Web Services (AWS) [PROVIDER SPECIFIC]
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_ACCOUNT_ID=

# Microsoft Azure [PROVIDER SPECIFIC]
AZURE_CLIENT_ID=
AZURE_TENANT_ID=
AZURE_SUBSCRIPTION_ID=
AZURE_CLIENT_SECRET=

# Google Cloud Platform (GCP) [PROVIDER SPECIFIC]
GOOGLE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json

# Oracle Cloud Infrastructure (OCI) [DEMO ONLY / OPTIONAL]
OCI_REGION=us-ashburn-1
OCI_TENANCY_OCID=
OCI_USER_OCID=
OCI_FINGERPRINT=
OCI_PRIVATE_KEY_PATH=credentials/oci_api_key.pem

# Optional Supporting Services [NOT USED IN CRITICAL PATH]
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=super-secret-jwt-key-for-local-testing-token-signature

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=mock_webhook_secret_key_123
```

---

## 9. Missing Keys Audit

| Provider | Required Field | Secret? | Where to Get It | Required for Demo? |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `DEMO_MODE` | No | Set to `true` or `false` in `.env` | **Yes** |
| **System** | `DATABASE_URL` | No | Default: `sqlite:///backend/app/cloud_security.db` | **Yes** |
| **AWS** | `AWS_REGION` | No | AWS Console (e.g., `ap-south-1`) | No (Defaulted) |
| **AWS** | `AWS_ACCESS_KEY_ID` | Identifier | IAM -> Users -> Security Credentials | No (Optional) |
| **AWS** | `AWS_SECRET_ACCESS_KEY` | **HIGH SECRET** | IAM -> Users -> Security Credentials | No (Optional) |
| **AWS** | `AWS_ACCOUNT_ID` | Identifier | AWS Console (top-right menu) | No (Auto-detected) |
| **Azure** | `AZURE_CLIENT_ID` | Identifier | Microsoft Entra ID -> App registrations | No (Optional) |
| **Azure** | `AZURE_TENANT_ID` | Identifier | Microsoft Entra ID -> Overview | No (Optional) |
| **Azure** | `AZURE_CLIENT_SECRET` | **HIGH SECRET** | App registrations -> Certificates & secrets | No (Optional) |
| **Azure** | `AZURE_SUBSCRIPTION_ID`| Identifier | Azure Portal -> Subscriptions | No (Optional) |
| **GCP** | `GOOGLE_PROJECT_ID` | Identifier | Google Cloud Console project selector | No (Optional) |
| **GCP** | `GOOGLE_APPLICATION_CREDENTIALS` | Path | IAM -> Service Accounts -> Keys -> JSON | No (Optional) |
| **OCI** | `OCI_TENANCY_OCID` | Identifier | OCI Console -> Tenancy details | No (Demo Mode active) |
| **OCI** | `OCI_PRIVATE_KEY_PATH`| Secret Path | OCI API Key Generation | No (Demo Mode active) |

---

## 10. Step-by-Step Setup

### Step 1: Start the Platform
- **Action**: Double-click `START_PROJECT.bat` in the project root folder.
- **Expected Output**: Minimized background processes start, ports 8000 and 5173 initialize, and your default web browser opens to `http://127.0.0.1:5173`.

### Step 2: Confirm API is Online
- **Action**: Look at the top-right header in the browser.
- **Expected Output**: A green indicator displaying `API: ONLINE (Port 8000)`.

### Step 3: Enable Demo Mode
- **Action**: Ensure `DEMO_MODE=true` is set in `.env` (or run in Hybrid Mode).
- **Expected Output**: Header displays `MODE: HYBRID` or `MODE: DEMO`.

### Step 4: Verify the Dashboard
- **Action**: Observe the **Security Overview** screen.
- **Expected Output**: KPI cards (Total Events, Threats Flagged, Critical Alerts, Mean Risk Score, Connected Clouds) are visible.

### Step 5: Configure AWS (Optional for Live Mode)
- **Action**: Add your `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` to `.env`.
- **Value**: Secret keys generated from AWS IAM.
- **Security**: Never commit `.env` or share the secret key.

### Step 6: Test AWS
- **Action**: In the UI, navigate to **Cloud Providers** -> Click **Test Connection** on the AWS card.
- **Expected Output**: Toast banner: `AWS: CONNECTED - Authenticated successfully as arn:aws:iam:...`.

### Step 7: Configure Azure (Optional for Live Mode)
- **Action**: Add `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_SUBSCRIPTION_ID` to `.env`.

### Step 8: Test Azure
- **Action**: Navigate to **Cloud Providers** -> Click **Test Connection** on the Azure card.
- **Expected Output**: Toast banner: `AZURE: CONNECTED - Authenticated successfully with Microsoft Entra ID`.

### Step 9: Configure GCP (Optional for Live Mode)
- **Action**: Place your Service Account JSON file into `credentials/gcp-service-account.json` and set `GOOGLE_PROJECT_ID` in `.env`.

### Step 10: Test GCP
- **Action**: Navigate to **Cloud Providers** -> Click **Test Connection** on the GCP card.
- **Expected Output**: Toast banner: `GCP: CONNECTED - Authenticated successfully as service-account@...`.

### Step 11: Leave OCI in Demo Mode
- **Action**: No configuration required.
- **Expected Output**: OCI card displays `DEMO MODE` with simulated Cloud Guard streams active.

### Step 12: Run the Complete Demonstration
- **Action**: Follow the presentation workflow outlined in Section 11.

---

## 11. How to Use the Finished Project (Demonstration Script)

### Recommended 5 to 8 Minute Presentation Flow:

```text
Double-click START_PROJECT.bat
        ↓
Overview Screen: Explain Multi-Cloud Architecture
        ↓
Trigger Scenario: "AWS: Brute Force"
        ↓
Security Events Table: Select Event
        ↓
Deep Inspector: Review Explainability & Features (Modules 1, 2, 3)
        ↓
Review Compliance Matrix: NIST CSF 2.0 / CIS Controls / ISO 27001
        ↓
Cloud Providers: Demonstrate AWS / Azure / GCP Live Connection Tests
        ↓
ML Diagnostics: Inspect Feature Importance & Retrain Classifier
        ↓
Admin Audit Trail: Review Immutable Security Event Logs
```

### Exact Click Sequence:
1. **Overview**: Point out the KPI ribbon showing multi-cloud telemetry and fleet-wide risk average.
2. **Inject Threat**: In the top header, click the **Run Test Scenario...** dropdown and select **AWS: Brute Force (Critical)**.
3. **Inspect Event**: Click **Security Events** on the sidebar. Click the top event in the table:
   - Point to the **Risk Score (96 / 100 - CRITICAL)**.
   - Click the **Explainability** tab: explain the reasons flagged by the model (e.g., authentication velocity anomaly).
   - Click the **Compliance Playbook** tab: explain the automated NIST CSF 2.0 (`PR.AA-01`) and CIS Controls (`CIS 5.4`) remediation steps.
   - Click the **Module 2 Features** tab: show the 6 extracted numeric features (`failed_attempts`, `request_frequency`, `is_sensitive_resource`, etc.).
4. **Cloud Connectors**: Click **Cloud Providers** on the sidebar. Click **Test Connection** on AWS, Azure, and GCP to show real API validation.
5. **ML Engine**: Click **ML & Risk Engine** on the sidebar. Explain the Random Forest model metrics (Accuracy: 100%, Macro F1: 98.5%) and click **Re-Train ML Model** to demonstrate automated on-disk model fitting.
6. **Audit Trail**: Click **Audit Logs** to show the immutable log recording each test, scenario injection, and administrative action.

---

## 12. Troubleshooting Matrix

| Issue | Root Cause | Verification Check | Remediation / Fix |
| :--- | :--- | :--- | :--- |
| **API Offline** | Backend server process not started or port 8000 blocked. | Open `http://127.0.0.1:8000/api/v1/health` in browser. | Run `STOP_PROJECT.bat` then `START_PROJECT.bat` to release port and start backend. |
| **Invalid AWS Credentials** | Incorrect `AWS_ACCESS_KEY_ID` or secret key format. | Check `.env` for trailing spaces or quotes. | Re-copy keys from AWS IAM Console into `.env` without quotes. |
| **AWS AccessDenied** | IAM user missing required STS permissions. | Test in terminal: `aws sts get-caller-identity`. | Attach `SecurityAudit` managed policy to IAM user. |
| **Invalid Azure Client Secret** | Azure client secret expired or value copied incorrectly. | Check Azure Portal -> App registrations -> Certificates & secrets. | Generate a new client secret and paste the **Value** (not ID) into `.env`. |
| **Azure AuthorizationFailed** | Service principal lacks Reader role on subscription. | Check Subscriptions -> Access control (IAM) -> Role assignments. | Assign `Reader` role to the App Registration at Resource Group or Subscription level. |
| **Invalid GCP Credentials** | JSON key corrupted or path incorrect. | Check if file exists at `credentials/gcp-service-account.json`. | Download a fresh JSON key from GCP IAM -> Service Accounts -> Keys. |
| **GCP PermissionDenied** | Cloud Logging API disabled in project. | Check Google Cloud Console -> APIs & Services -> Enabled APIs. | Enable `Cloud Logging API` (`logging.googleapis.com`) in GCP Console. |
| **Missing `.env`** | No `.env` file present in root directory. | Check if `.env` exists in `cloud/`. | Copy `.env.example` to `.env`. |
| **Missing GCP JSON File** | `GOOGLE_APPLICATION_CREDENTIALS` points to non-existent path. | Verify file path in `.env` matches file location. | Create `credentials/` folder and place JSON file inside. |
| **Wrong Cloud Region** | Region string misspelled (e.g. `ap-south1`). | Check `AWS_REGION` in `.env`. | Set valid region format: `ap-south-1` or `us-east-1`. |
| **Database Unavailable** | SQLite file locked by external process. | Check `backend/app/cloud_security.db`. | Restart platform using `RESTART_PROJECT.bat`. |
| **ML Model Unavailable** | `threat_model.pkl` not compiled on disk. | Check `backend/app/models/threat_model.pkl`. | Click **Re-Train ML Model** on the ML Diagnostics tab. |
| **Frontend Cannot Reach Backend** | Browser CORS block or API URL mismatch. | Open developer tools console (F12) -> Network tab. | Ensure backend is listening on `127.0.0.1:8000` (CORS is configured for `*`). |
| **Demo Events Not Appearing** | Filters in event table excluding all events. | Check search box and severity dropdown. | Reset filters to `ALL` and clear search query. |

---

## 13. Final Recommendations

1. **What do I need to configure today?**
   Nothing is strictly required to run the project. You can immediately double-click `START_PROJECT.bat` and evaluate the complete system in Demo/Hybrid mode.

2. **What can remain in Demo Mode?**
   **OCI** should remain in Demo Mode. AWS, Azure, and GCP can also remain in Demo Mode if you do not wish to link real cloud accounts.

3. **What credentials are missing?**
   No credentials are required for local testing. If you want live cloud checks, provide your AWS access keys, Azure service principal secret, and GCP service account JSON.

4. **Which cloud should I configure first?**
   **AWS** is the quickest and easiest to configure.

5. **What is the minimum setup required for a successful demonstration?**
   - Double-click `START_PROJECT.bat`.
   - Use the **Run Test Scenario...** dropdown to inject multi-cloud telemetry.
   - Walk through the Overview, Security Events Deep Inspector, ML Engine, and Compliance screens.

6. **What is optional?**
   Supabase Auth, Razorpay billing, and OCI live tenancy keys are optional supporting features.

7. **What should I NOT configure?**
   Do not spend time attempting to create live OCI tenancy private keys or setting up third-party paid services.

8. **Exact sequence before presenting:**
   1. Run `pytest tests/` in terminal (verifies 27/27 tests pass).
   2. Double-click `START_PROJECT.bat`.
   3. Verify green `API: ONLINE` indicator in the header.
   4. Follow the 5 to 8 minute demonstration flow in Section 11.
