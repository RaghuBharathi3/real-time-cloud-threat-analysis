# Real Telemetry Ingestion, Rate Limiting, and Multi-Cloud Integration Guide

This document specifies the technical architecture, implementation details, permission requirements, rate limiting subsystem, deduplication engine, and operational runbook for live multi-cloud telemetry ingestion across Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and Oracle Cloud Infrastructure (OCI).

---

## 1. End-to-End Telemetry Pipeline

Real cloud security events traverse the same strict verification, preprocessing, and machine learning pipeline as simulated events. The system never bypasses pipeline stages for live telemetry.

```
+-------------------------------------------------------------------------+
|                          Live Cloud Providers                           |
|       (AWS CloudTrail / Azure Activity Log / GCP Cloud Logging)         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         Provider Adapters                               |
|   (AWSAdapter / AzureAdapter / GCPAdapter / OCIAdapter [Demo Mode])     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                      Canonical Normalization                            |
|        (Translates provider payload into Canonical Event Schema)        |
|             (Tags telemetry explicitly with source_mode="REAL")         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                  Module 1: Event Schema Validation                      |
|          (Pydantic SecurityEvent model verification and type enforcement)|
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|              Module 2: Preprocessing & Feature Extraction               |
|      (Extracts 6-dimensional feature vector: failed_attempts,           |
|       request_frequency, is_login, is_sensitive, is_unusual, location) |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|              Module 3: Machine Learning Threat Detection                |
|      (Random Forest Classifier with 50 estimators, accuracy > 95%)      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                   Deterministic Risk Engine                             |
|          (Computes composite risk score: 0 to 100 & Severity Tier)      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                 Compliance Mapping Engine                               |
|        (Maps detection to NIST CSF 2.0, CIS Controls v8, ISO 27001)     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                  Idempotent Database Persistence                        |
|       (Deduplicates event_id; inserts new alert into SQLite/Postgres)   |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                    FastAPI Endpoints & UI Console                       |
|           (Filterable Alert Grid + Deep Diagnostics Inspector)          |
+-------------------------------------------------------------------------+
```

---

## 2. Cloud Provider Adapter Implementation Details

### A. Amazon Web Services (AWS)
- **Adapter File**: `backend/app/adapters/aws_adapter.py`
- **SDK & Client**: `boto3.Session`, `sts.client`, `cloudtrail.client`.
- **Authentication**: Validates identity via `sts.get_caller_identity()` returning account ID and user ARN.
- **Log Collection**: Calls `cloudtrail.lookup_events(StartTime=..., MaxResults=...)` where `StartTime` is calculated using the configurable lookback window (`COLLECTION_LOOKBACK_MINUTES`, default 60 minutes).
- **Normalization**:
  - Event ID: `EventId` or `AWS-{EventName}-{EventTime}-{Username}`.
  - Principal: `Username` or `userIdentity.principalId` / `userIdentity.arn`.
  - Source IP: Extracted from `CloudTrailEvent.sourceIPAddress`.
  - Action / Resource: `EventName` mapped to `login`, `resource_access`, or `api_call`.
- **Permission Diagnostics**: If `AccessDeniedException` occurs, sets status to `INSUFFICIENT_PERMISSIONS` and reports missing `cloudtrail:LookupEvents` IAM permission.

### B. Microsoft Azure
- **Adapter File**: `backend/app/adapters/azure_adapter.py`
- **SDK & Client**: `azure-identity` (`ClientSecretCredential`) and Azure Monitor Management REST API.
- **Authentication**: Acquires OAuth2 bearer token against `https://management.azure.com/.default`.
- **Log Collection**: Queries Azure Monitor Activity Log REST API:
  ```http
  GET https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter=eventTimestamp ge '{start_time}'
  Authorization: Bearer {token}
  ```
- **Normalization**:
  - Event ID: `id` or `correlationId`.
  - Principal: `caller` or `claims.name`.
  - Target: `resourceId` / `operationName.value`.
  - Source IP: `callerIpAddress`.
- **Permission Diagnostics**: Accurately handles App Registration tenant types. If configured under Personal Microsoft Accounts (`/consumers`), reports the requirement for an organizational App Registration with `Reader` role on the subscription.

### C. Google Cloud Platform (GCP)
- **Adapter File**: `backend/app/adapters/gcp_adapter.py`
- **SDK & Client**: `google.oauth2.service_account.Credentials`, Google Cloud Logging v2 REST API.
- **Authentication**: Loads service account credentials from `credentials/gcp-service-account.json`.
- **Log Collection**: Executes HTTP POST against Google Cloud Logging:
  ```http
  POST https://logging.googleapis.com/v2/entries:list
  Authorization: Bearer {token}
  Content-Type: application/json

  {
    "resourceNames": ["projects/{project_id}"],
    "pageSize": 10,
    "orderBy": "timestamp desc",
    "filter": "timestamp >= \"{start_time}\""
  }
  ```
- **Normalization**:
  - Event ID: `insertId` or deterministic hash.
  - Principal: `protoPayload.authenticationInfo.principalEmail`.
  - Method / Action: `protoPayload.methodName`.
  - Source IP: `protoPayload.requestMetadata.callerIp`.
- **Idle State Handling**: If no logs occurred in the lookback window, reports `"Cloud Logging active: 0 audit logs found in last Xm (Project idle)"` without error.

### D. Oracle Cloud Infrastructure (OCI)
- **Adapter File**: `backend/app/adapters/oci_adapter.py`
- **Operating Mode**: Explicitly designated as `DEMO MODE`.
- **Pipeline Function**: Normalizes deterministic Oracle Cloud Guard and Object Storage audit events into the Canonical Event Schema with `source_mode="DEMO"`.

---

## 3. Server-Side Sliding-Window Rate Limiter

To protect backend APIs from request flooding, brute-force polling, and computational exhaustion during ML retraining, a thread-safe sliding-window rate limiter is implemented in `backend/app/core/rate_limiter.py`.

### Rate Limit Quota Table

| Category | Endpoint Scope | Quota (Requests / Window) | Exceeded Response |
|---|---|---|---|
| `auth` | `/api/v1/billing/*` | 10 requests / 60 seconds | HTTP 429 Too Many Requests |
| `cloud_test` | `/api/v1/cloud/test-connection/*` | 20 requests / 60 seconds | HTTP 429 Too Many Requests |
| `cloud_sync` | `/api/v1/cloud/sync/*` | 20 requests / 60 seconds | HTTP 429 Too Many Requests |
| `pipeline` | `/api/v1/pipeline/*` | 60 requests / 60 seconds | HTTP 429 Too Many Requests |
| `ml_train` | `/api/v1/model/train` | 5 requests / 60 seconds | HTTP 429 Too Many Requests |
| `admin` | `/api/v1/admin/audit-logs` | 30 requests / 60 seconds | HTTP 429 Too Many Requests |
| `general` | Default / General Reads | 120 requests / 60 seconds | HTTP 429 Too Many Requests |

### HTTP 429 Response Format

When a rate limit is exceeded, the server returns an HTTP 429 status code with standard rate limit headers:

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 48
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 48
Content-Type: application/json

{
  "detail": "Rate limit exceeded for ML_TRAIN operations. Please wait 48 seconds before retrying."
}
```

---

## 4. Idempotency and Duplicate Event Prevention

Cloud logging APIs often return the same historical event records across overlapping polling intervals. To prevent duplicate alerts in the database:

1. **Deterministic Identity**: Each canonical event has a unique `event_id` provided directly by the cloud provider (e.g., CloudTrail `EventId`, Azure `correlationId`, GCP `insertId`) or derived deterministically from `(provider, timestamp, user, action, resource)`.
2. **Pre-Insert Verification**:
   ```python
   existing = db.query(SecurityAlert).filter(SecurityAlert.event_id == validated.event_id).first()
   if not existing:
       db.add(db_alert)
       db.commit()
       new_inserted += 1
   else:
       skipped_duplicates += 1
   ```
3. **Synchronization Metrics**: `/api/v1/cloud/sync/{provider}` reports `synced_count`, `new_inserted_count`, and `skipped_duplicates_count` in the response payload.

---

## 5. Source Mode Tagging (`REAL` vs `DEMO`)

Every security event ingested into the platform is labeled with its operating provenance:

| Attribute | `source_mode="REAL"` | `source_mode="DEMO"` |
|---|---|---|
| **Origin** | AWS CloudTrail, Azure Activity Log, or GCP Cloud Logging | Synthetic 1-click test scenarios or CSV evaluation data |
| **Database Value** | `REAL` | `DEMO` |
| **UI Badge** | Green border / text badge (`REAL`) | Neutral slate badge (`DEMO`) |
| **Inspector Display** | `Source: REAL TELEMETRY` | `Source: SYNTHETIC DEMO SCENARIO` |
| **Filter Options** | `Real Telemetry Only` | `Demo Scenarios Only` |

---

## 6. Live Diagnostic Verification Matrix

| Provider | Credentials | Authentication | API Service | Permissions | Events | Pipeline Processing | System Status |
|---|---|---|---|---|---|---|---|
| **AWS** | Configured in `.env` | PASS (`arn:aws:iam::830460570633:user/cloud-security-student-aws`) | `cloudtrail:LookupEvents` | INSUFFICIENT PERMISSIONS (Missing `cloudtrail:LookupEvents`) | 0 (AccessDenied) | Operational (Modules 1–3 + Risk Engine) | `INSUFFICIENT_PERMISSIONS` |
| **Azure** | Configured in `.env` | PASS (`ClientSecretCredential` on `/consumers`) | Azure Monitor Activity Log REST | INSUFFICIENT PERMISSIONS (App Registration is Personal Account type; requires Organizational Entra ID with `Reader` role on subscription) | 0 (AADSTS9002332) | Operational (Modules 1–3 + Risk Engine) | `INSUFFICIENT_PERMISSIONS` |
| **GCP** | Configured (`credentials/gcp-service-account.json`) | PASS (`cloud-security-reader@cloud-security-student-gcp.iam.gserviceaccount.com`) | Google Cloud Logging v2 (`entries:list`) | PASS (`roles/logging.viewer`) | ZERO EVENTS (Project idle; 0 logs in lookback window) | Operational (Modules 1–3 + Risk Engine) | `CONNECTED` |
| **OCI** | Not Configured | N/A | Mock Stream | N/A | Synthetic Demo Events | Operational (Modules 1–3 + Risk Engine) | `DEMO MODE` |

---

## 7. Cloud Console Setup Guide

Follow these step-by-step instructions to configure required permissions and generate legitimate test telemetry in your cloud accounts.

### AWS (Amazon Web Services)
1. **Sign in to AWS Console**: Navigate to IAM -> Users -> Select `cloud-security-student-aws`.
2. **Attach Required Read-Only Policy**:
   - Click **Add permissions** -> **Attach policies directly**.
   - Attach the AWS Managed Policy **`SecurityAudit`** (or create an inline policy with `cloudtrail:LookupEvents`, `cloudtrail:DescribeTrails`, and `sts:GetCallerIdentity`).
3. **Generate Legitimate Test Activity**:
   - Navigate to **Amazon S3** -> Click **Create bucket** -> Name: `audit-test-bucket-830460570633` -> Create.
   - Immediately click **Delete** on the created bucket.
4. **Verify in Cloud Console**:
   - Navigate to **CloudTrail** -> **Event history** -> Verify `CreateBucket` and `DeleteBucket` appear in the list.
5. **Sync in Application**:
   - Open the application frontend -> Navigate to **Cloud Providers** -> Click **Sync CloudTrail Logs** -> The real event will be ingested and classified with the `REAL` badge.

### Microsoft Azure
1. **Sign in to Azure Portal**: Navigate to **Microsoft Entra ID** -> **App registrations**.
2. **Register Organizational Application**:
   - Click **New registration** -> Select **Supported account types**: `"Accounts in this organizational directory only (Single tenant)"`.
   - Generate a **Client Secret** under Certificates & secrets.
3. **Assign Subscription RBAC Role**:
   - Navigate to **Subscriptions** -> Select `cloud-security-student-azure`.
   - Click **Access control (IAM)** -> **Add role assignment**.
   - Select **`Reader`** role -> Assign access to your App Registration Service Principal.
4. **Update `.env`**:
   - Set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_SUBSCRIPTION_ID`.
5. **Generate Legitimate Test Activity**:
   - Navigate to **Resource groups** -> Create `rg-security-test` -> Delete the resource group.
6. **Sync in Application**:
   - Click **Sync Activity Log** in the Cloud Providers view.

### Google Cloud Platform (GCP)
1. **Sign in to Google Cloud Console**: Select project `cloud-security-student-gcp`.
2. **Enable Required API**:
   - Navigate to **APIs & Services** -> Enable **Cloud Logging API**.
3. **Verify IAM Role**:
   - Navigate to **IAM & Admin** -> Verify `cloud-security-reader@cloud-security-student-gcp.iam.gserviceaccount.com` has the role **`Logs Viewer`** (`roles/logging.viewer`).
4. **Generate Legitimate Test Activity**:
   - Navigate to **Cloud Storage** -> Create bucket `gcp-audit-test-student` -> Delete bucket.
5. **Sync in Application**:
   - Click **Sync Audit Logs** in the Cloud Providers view.

---

## 8. Operational Procedure

1. **Launch Platform**: Double-click `START_PROJECT.bat` in the root directory.
2. **Verify System Health**: Ensure top-left header displays `API: ONLINE`.
3. **Verify Demo Pipeline**: Select **Run Test Scenario...** -> **AWS: Brute Force (Critical)** in the top bar to verify that validation, feature extraction, ML classification, and risk scoring execute properly.
4. **Test Connectors**: Navigate to **Cloud Providers** -> Click **Test All Connectors** to execute identity checks.
5. **Execute Live Sync**: Select the desired lookback window (e.g., `Last 1 hour`) -> Click **Sync CloudTrail Logs** or **Sync Audit Logs**.
6. **Inspect Telemetry**: Navigate to **Security Events** -> Filter by **Source: Real Telemetry Only** -> Click any row to inspect feature vectors, explainability reasons, and compliance mappings.
