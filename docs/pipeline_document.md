# Pipeline and System Engineering Document
## AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments

---

## 1. Executive Summary & Purpose

The **AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments** is a unified system engineering architecture designed to continuously ingest, normalize, evaluate, and remediate security events across heterogeneous public cloud infrastructures. 

Modern enterprises deploy services across multiple Cloud Service Providers (CSPs), including:
* **Amazon Web Services (AWS)**
* **Microsoft Azure**
* **Google Cloud Platform (GCP)**
* **Oracle Cloud Infrastructure (OCI)**

Each CSP operates isolated compliance standards, logging formats, schema designs, and severity metrics. This fragmentation leads to alert fatigue and hampers real-time threat response. 

This platform bridges this gap by introducing:
1. **Cloud Connector Layer**: Translates CSP-specific logging streams into a single **Canonical Security Event Schema**.
2. **Deterministic & Statistical Analysis**: Evaluates events using a hybrid logic engine (Pydantic schema validation, feature engineering, and a supervised Random Forest classifier).
3. **Multi-Framework Compliance Engine**: Maps risk findings to industry frameworks, including the NIST Cybersecurity Framework (CSF) 2.0, NIST SP 800-53, CIS Controls v8.1, and ISO/IEC 27001:2022.
4. **Subscription-Based Core Engine**: Enforces Free vs. Pro licensing boundaries on the server-side, supported by a secure Mock Billing validation system.

---

## 2. End-to-End Ingestion & Processing Pipeline

The following workflow diagram illustrates the flow of security findings and audit logs from source cloud resources through validation, machine learning, compliance mapping, and final dashboard rendering.

```text
                    MULTI-CLOUD ENVIRONMENTS
 ┌────────────┬────────────┬────────────┬────────────┐
 │    AWS     │   Azure    │    GCP     │    OCI     │
 └─────┬──────┴─────┬──────┴─────┬──────┴─────┬──────┘
       │            │            │            │
       └────────────┴────────────┴────────────┘
                            │
                            ▼
                  CLOUD CONNECTOR LAYER
                            │
                            ▼
                 EVENT / DATA INGESTION
                            │
                            ▼
                  NORMALIZATION LAYER
                            │
                            ▼
               VALIDATION & PREPROCESSING (Pydantic)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Vulnerability   Configuration   Security
           Data           Data          Events
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    FEATURE ENGINEERING
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Rule Engine   ML Model (RF)   Compliance
              │             │            Engine
              └─────────────┼────────────┘
                            ▼
                     RISK SCORING
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
          Risk Explanation     Compliance Gap
                  │                   │
                  └─────────┬─────────┘
                            ▼
                  RECOMMENDATION ENGINE
                            │
                            ▼
                  SECURITY DASHBOARD (React Console)
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
             Reports     Alerts     Analytics
```

### Stage 1: Data Ingestion (Cloud Connector Layer)
The Connector Layer ingests high-velocity, semi-structured JSON telemetry from multiple CSP logging pipelines:
* **AWS Connector**: Pulls API logs from **AWS CloudTrail** and compliance alerts from **AWS Security Hub**.
* **Microsoft Azure Connector**: Captures diagnostic infrastructure metrics from **Azure Activity Logs** and identity monitoring logs from Microsoft Entra ID.
* **GCP Connector**: Aggregates operations data via **Google Cloud Audit Logs** and security findings from GCP Security Command Center.
* **OCI Connector**: Collects configuration change notifications from **OCI Audit** and security posture assessments from **Oracle Cloud Guard**.

### Stage 2: Ingestion-Time Schema Validation
Incoming events are routed to a FastAPI validation handler. Using a strict Pydantic model configuration, the schema validation engine validates:
1. **Formatting Standards**: Timestamp formatting is checked against the **ISO 8601** pattern (`YYYY-MM-DDTHH:MM:SS`).
2. **Networking Structure**: Source IP addresses are validated against strict standard **IPv4 CIDR formats**.
3. **Data Integrity**: Checks for mandatory security parameters, rejecting empty payloads or routing corrupted events to a dead-letter queue.

### Stage 3: Normalization & Canonization
To prevent downstream dependencies on provider-specific naming conventions, the Normalization layer maps heterogeneous keys (e.g., AWS `userIdentity` block vs. GCP `authenticationInfo`) to the **Canonical Security Event Schema**. This ensures the machine learning classifier receives uniform inputs regardless of the originating cloud platform.

### Stage 4: Feature Engineering & Preprocessing
The canonical event model is transformed into numeric and binary indicators:
* **Null Handling**: Defaults missing location fields to `"Unknown"`, failed logins to `0`, and request frequencies to `1`.
* **Resource Classification**: Evaluates target paths against a set of highly sensitive cloud assets (e.g., finance databases, KMS keys).
* **Anomalous Geography**: Matches origin country codes against a high-risk registry (`CN`, `RU`, `KP`).
* **Binary Encoding**: Extracts classification vectors: `is_login`, `is_sensitive_resource`, `is_unusual_location`, `is_api_or_resource_access`.

### Stage 5: Hybrid Detection and Machine Learning
The feature vector is passed simultaneously through:
1. **Supervised Random Forest Classifier**: Computes the threat class (`normal`, `brute_force`, `unauthorized_access`) and returns the model confidence probability.
2. **Stateful Rule Engine**: Cross-references findings against threshold limits (e.g., counting consecutive failed logins or request frequency metrics).
3. **Anomalous Action Engine**: Identifies outlier telemetry patterns using an unsupervised forest density evaluation.

### Stage 6: Explainable Risk Scoring
The results are aggregated into a composite **Security Risk Score (0–100)**:
$$\text{Risk Score} = w_1(\text{Model Probability}) + w_2(\text{Failed Attempts}) + w_3(\text{Sensitive Asset Flag}) + w_4(\text{Unusual Location Flag})$$
Weights are dynamically loaded from backend configurations, enabling security teams to tune parameters without code modifications.

---

## 3. Canonical Security Event Schema

All inbound CSP events are normalized into the standard schema detailed below:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CloudSecurityEvent",
  "type": "object",
  "properties": {
    "event_id": {
      "type": "string",
      "description": "Unique cryptographic or system UUID generated at ingestion"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 formatted timestamp indicating when the action occurred"
    },
    "cloud_provider": {
      "type": "string",
      "enum": ["aws", "azure", "gcp", "oci"],
      "description": "Origin cloud provider flag"
    },
    "account_id": {
      "type": "string",
      "description": "Identifier of the target tenant or cloud subscription account"
    },
    "service": {
      "type": "string",
      "description": "Target cloud service namespace (e.g., s3, iam, keyvault)"
    },
    "actor": {
      "type": "object",
      "properties": {
        "user_id": { "type": "string" },
        "role": { "type": "string" },
        "identity_type": { "type": "string", "enum": ["IAMUser", "AssumedRole", "ServiceAccount"] }
      },
      "required": ["user_id"]
    },
    "source": {
      "type": "object",
      "properties": {
        "ip_address": { "type": "string" },
        "location": { "type": "string", "description": "Resolved 2-letter country code" }
      },
      "required": ["ip_address"]
    },
    "action": {
      "type": "object",
      "properties": {
        "category": { "type": "string", "enum": ["login", "resource_access", "api_call"] },
        "operation": { "type": "string" }
      },
      "required": ["category", "operation"]
    },
    "resource": {
      "type": "object",
      "properties": {
        "resource_id": { "type": "string" },
        "resource_type": { "type": "string" },
        "sensitivity": { "type": "integer", "minimum": 0, "maximum": 1 }
      },
      "required": ["resource_id", "sensitivity"]
    },
    "failed_attempts": {
      "type": "integer",
      "minimum": 0
    },
    "request_frequency": {
      "type": "integer",
      "minimum": 1
    }
  },
  "required": ["event_id", "timestamp", "cloud_provider", "account_id", "actor", "source", "action", "resource"]
}
```

---

## 4. Machine Learning & Detection Classifier

The system deploys an interpretable **Random Forest Classifier** with the following system configuration:
* **Estimators**: 50 Decision Trees.
* **Criterion**: Gini impurity split.
* **Random State**: Seed 42 to ensure exact reproducibility across pipeline runs.

### Training & Evaluation Details
The classifier is trained on synthetic security log distributions reflecting real-world compromise behaviors:
1. **Brute-Force Login**: Characterized by high `failed_attempts` (5–12) targeting the `cloud_console` login endpoint.
2. **Unauthorized Resource Access**: Characterized by access requests to high-sensitivity resources (`s3_bucket_finance`, `kms_keys`) from unusual locations (`CN`, `RU`, `KP`) or high `request_frequency` rates.

### Performance Verification
Evaluation metrics calculated over 150 validation event vectors show:
* **Test Validation Accuracy**: 100.0% (`1.0`)
* **Macro F1-Score**: 100.0% (`1.0`)
* **Precision/Recall**: 1.0 (Zero false-positive / false-negative classifications).

### Classifier Feature Importances
* **Request Frequency**: 35.53%
* **Failed Attempts**: 23.45%
* **Unusual Geographic Location**: 17.54%
* **Sensitive Resource Access**: 13.73%
* **Is Login Event**: 5.59%
* **Is API or Resource Access**: 4.15%

---

## 5. Security & Governance Engine

### 5.1 Compliance Mapping Engine
For every risk event generated by the classifier, the framework references compliance databases to map the anomaly to standard control controls:
* **NIST Cybersecurity Framework (CSF) 2.0**: Maps failures to functions, primarily the **Protect (PR)** (access control controls) and **Detect (DE)** (security monitoring processes) functions.
* **NIST SP 800-53**: Maps events to security controls, such as **AC-2** (Account Management) and **SI-4** (Information System Monitoring).
* **CIS Controls v8.1**: Maps events to CIS Safeguards, such as **CIS Control 3** (Data Protection) and **CIS Control 6** (Access Control Management).
* **ISO/IEC 27001:2022**: Maps findings to Annex A controls, specifically **Control A.5.15** (Access control) and **Control A.8.16** (Monitoring activities).

### 5.2 Remediation Recommendations
Remediations are constructed using structured templates:
1. **Severity Classification**: Maps findings to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` based on threat likelihood and asset sensitivity.
2. **Remediation Script**: Details the exact commands or manual operations required to isolate the compromised asset.
3. **Priority**: Assigns action windows (e.g., Immediate containment vs. standard patch window).

---

## 6. Access Control, Separation of Tiers, & Billing

### 6.1 Authentication & Database Row Level Security (RLS)
The identity layer utilizes **Supabase Auth** for registration, session tokens (JWT), and MFA hooks.
* **Server-Side Authorization**: Node.js/Express (or FastAPI) middlewares intercept authorization headers, verify the token's validity, extract the user's role payload, and block access to unauthorized API endpoints.
* **Database Row Level Security (RLS)**: Prevents data leaks by ensuring users can only read records belonging to their tenant organization ID:
  ```sql
  CREATE POLICY tenant_alert_access ON security_alerts
    FOR SELECT
    USING (auth.uid() = tenant_owner_id);
  ```

### 6.2 Service Tier Separation
To ensure economic sustainability on low-cost student deployment tiers, capabilities are separated:

| Capability | Free Tier | Pro Tier |
| :--- | :--- | :--- |
| **Provider Mappings** | AWS Only | AWS + Azure + GCP + OCI |
| **Event Limit** | 100 scans per day | Unlimited scans |
| **Security Telemetry** | Basic Static Logs | Continuous streaming validation |
| **Analysis Scope** | Standard RF Label | Advanced anomaly detection + pgvector RAG |
| **Compliance Reports** | Basic Risk Score | PDF reports (NIST/CIS/ISO) |
| **Billing Limit** | Enforced on API level | Enforced on API level |

### 6.3 Payment & Webhook Verification Pipeline
Subscription upgrades are processed through a checkout flow:
1. The user requests an order on the Billing tab.
2. The system invokes the mock billing gateway and displays the payment checkout UI.
3. Upon simulated checkout confirmation, the billing service sends a signature-verified webhook.
4. The server validates the webhook signature and updates the target database tenant's field `is_pro` to `1`, granting immediate access.
