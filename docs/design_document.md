# System Design Document
## AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments

---

## 1. High-Level System Architecture

The framework is structured as a multi-tier, decoupled microservices system. This design separates client UI representation, API gatekeeping, identity management, and machine learning inference workloads.

The backend contains two services:
1. **Application & Billing Service (Node.js/Express Mock)**: Handles user registration, JWT generation, administrative configurations, database interactions, and billing upgrades.
2. **Machine Learning & Inference Service (Python/FastAPI)**: Executes validation checks (Pydantic), feature engineering (Module 2), Random Forest classification (Module 3), risk calculations, and compliance mappings.

### System Architecture Diagram
```text
                         ┌──────────────────────────┐
                         │       USERS / ADMIN      │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ React / Next.js Frontend │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ Secure API Gateway       │
                         └────────────┬─────────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              ▼                       ▼                      ▼
        Supabase Auth             Node.js API           Billing API
              │                       │                      │
              ▼                       ▼                      ▼
            JWT/RBAC             PostgreSQL              Razorpay
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                 Security Data              ML/Risk Service
                                                   │
                                                   ▼
                                             Python/FastAPI
                                                   │
                              ┌────────────────────┼──────────────┐
                              ▼                    ▼              ▼
                           ML Model           Rule Engine     Compliance
                              │                    │              │
                              └────────────────────┼──────────────┘
                                                   ▼
                                             Risk Engine
                                                   │
                                                   ▼
                                            Recommendations
```

---

## 2. Multi-Cloud Integration Layer

To support multiple cloud platforms without introducing provider-specific dependencies into the machine learning models, the system implements a **Cloud Adapter Interface**.

```text
 AWS                AZURE               GCP                 OCI
  │                   │                  │                   │
  ▼                   ▼                  ▼                   ▼
CloudTrail        Activity Logs       Audit Logs          OCI Audit
Security Hub      Entra ID            Security Findings  Cloud Guard
  │                   │                  │                   │
  └───────────────────┴──────────────────┴───────────────────┘
                              │
                              ▼
                    Cloud Adapter Interface
                              │
                              ▼
                    Canonical Event Schema
                              │
                              ▼
                     Security Processing
```

### Adapter Specifications:
* **AWS Adapter**: Parses CloudTrail events, extracting fields like `sourceIPAddress` and `userIdentity.arn`.
* **Azure Adapter**: Translates activity logs and maps Entra ID authentication events.
* **GCP Adapter**: Normalizes Google Cloud Audit logs, mapping `principalEmail` and resource operations.
* **OCI Adapter**: Interfaces with OCI Audit and Cloud Guard to capture configuration vulnerabilities.

---

## 3. Database Schema Design (SQLite / PostgreSQL)

For development and student submissions, the database layout is maintained using standard SQL relational schemas.

### 3.1 `system_users` Table
Stores user registration profiles, active roles, and billing tier permissions:
```sql
CREATE TABLE system_users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) UNIQUE NOT NULL,
    role VARCHAR(32) DEFAULT 'USER', -- USER, ANALYST, ADMIN
    is_pro INTEGER DEFAULT 0, -- 0 = Free, 1 = Pro
    subscription_expires_at VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 `security_alerts` Table
Stores the normalized logs along with feature vectors, machine learning classification verdicts, and recommendations:
```sql
CREATE TABLE security_alerts (
    event_id VARCHAR(64) PRIMARY KEY,
    timestamp VARCHAR(64) NOT NULL,
    cloud_provider VARCHAR(32) NOT NULL, -- aws, azure, gcp, oci
    account_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    location VARCHAR(64) DEFAULT 'Unknown',
    resource VARCHAR(256) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    request_frequency INTEGER DEFAULT 1,
    
    -- Feature engineered values (Module 2)
    is_sensitive_resource INTEGER DEFAULT 0,
    is_unusual_location INTEGER DEFAULT 0,
    
    -- ML Classifier Output (Module 3)
    threat_status VARCHAR(64) NOT NULL, -- Normal, Suspicious
    threat_type VARCHAR(128) NOT NULL, -- e.g., Possible Brute-Force Activity
    confidence REAL DEFAULT 0.0,
    reasons TEXT DEFAULT '[]', -- JSON string containing reasons
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Role-Based Access Control (RBAC) & Row Level Security

The framework implements strict role separations to prevent unauthorized operations:

```text
Admin
 ├── Users
 ├── Billing
 ├── Policies
 ├── Audit Logs
 └── Platform Configuration

Analyst
 ├── Findings
 ├── Events
 ├── Incidents
 └── Reports

User
 ├── Own Cloud Accounts
 ├── Own Findings
 └── Own Reports
```

### 4.1 Role Definitions & Permissions:
1. **USER**:
   * Access to their own connected cloud accounts and associated findings.
   * Generate basic compliance reports.
   * View the billing checkout panel.
2. **ANALYST**:
   * Inherits `USER` permissions.
   * Access to view and search all tenant alerts, findings, and events.
   * Inspect preprocessed features and ML metrics.
3. **ADMIN**:
   * Inherits `ANALYST` permissions.
   * Edit tenant policies and delete alerts.
   * Trigger classifier retraining.
   * Access to system configuration dashboards.

### 4.2 Row Level Security (RLS) Configuration
When deployed on Supabase/PostgreSQL, Row Level Security must be enabled:
```sql
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy to restrict reads to the active user's tenant organization
CREATE POLICY user_tenant_alerts ON security_alerts
    FOR SELECT
    TO authenticated
    USING (account_id IN (
        SELECT account_id FROM tenant_memberships WHERE user_id = auth.uid()
    ));
```

---

## 5. Free vs. Pro Tier Separation

Subscription checks are enforced at the API gateway layer to prevent client-side bypasses:

```text
               API REQUEST (Azure Log Event)
                            │
                            ▼
              JWT Authentication Verification
                            │
                            ▼
            Fetch User subscription status
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
       is_pro == 0                    is_pro == 1
             │                             │
             ▼                             ▼
   Check provider filter            Allow processing
   If provider != 'aws'             and database logging
   Reject: 403 Forbidden
```

### Tier Feature Matrix:
* **Free Tier**: Restricted to the `aws` provider. Processing an event with another provider returns a `403 Forbidden` response:
  ```json
  {
    "detail": "Multi-cloud adapters require Pro subscription. Upgrade at the Billing tab."
  }
  ```
* **Pro Tier**: Unlocks all adapters (`aws`, `azure`, `gcp`, `oci`) and enables advanced anomaly detection features.

---

## 6. Secure Billing Pipeline

For low-budget or zero-budget student deployments, the payment pipeline supports both live **Razorpay Integration** and a local **Mock Billing Simulation**.

### Webhook Verification Flow:
```text
User
 ↓
Select Pro Plan
 ↓
Checkout Request to API
 ↓
Payment Gateway Callback
 ↓
Mock Webhook Triggers
 ↓
Signature Verification (SHA-256 validation of payment ID)
 ↓
Update system_users set is_pro = 1
 ↓
Entitlement unlocked instantly
```

### 6.1 Webhook Authenticity
Webhooks from the billing provider must contain a verification signature header (`X-Mock-Signature`). The server computes the signature using HMAC-SHA256 and compares it against the header before upgrading subscription states:
```python
def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## 7. Secure API Design (OWASP Defenses)

API security configurations are aligned with the **OWASP API Security Top 10**:
* **Broken Object Level Authorization (API1)**: Enforce RLS policy checks to prevent users from accessing alerts belonging to other accounts by editing the `event_id` in request payloads.
* **Broken Authentication (API2)**: Delegate credentials management and secure token storage to Supabase Auth, preventing custom hashing vulnerabilities.
* **Unrestricted Resource Consumption (API4)**: Implement rate limiting middleware (e.g., maximum of 100 API requests per minute per IP address).
* **Broken Function Level Authorization (API5)**: Run role checks on the backend before triggering model training APIs (e.g., verifying `role == 'ADMIN'`).
* **Security Misconfiguration (API8)**: Configure CORS rules to restrict connections to approved frontend origins, and strip stack traces from server error responses.

---

## 8. Technology Stack Selection

| Layer | Technology Choice | License / Cost | Student-Friendly Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + Vite | MIT (Free) | Fast build compilation and low resource footprint. |
| **Styles** | Vanilla CSS | Open | Full layout design control without build configuration overhead. |
| **Authentication** | Supabase Auth | Free Tier | Pre-built registration flows, social logins, and secure JWT handling. |
| **Application Database** | Supabase PostgreSQL | Free Tier | Includes PostgreSQL RLS, JSON query operators, and pgvector tools. |
| **Backend API Gateway** | Python FastAPI / Node | MIT (Free) | Exposes asynchronous routers and integrates validation. |
| **ML Inference** | Scikit-Learn (Random Forest) | BSD (Free) | CPU-only model execution with fast inference speeds (<5ms). |
| **Billing Integration** | Mock Billing API | Free | Replicates payment callback webhooks without merchant account setup fees. |
| **Hosting & Deployment** | Vercel + Render | Free Tiers | Automated deployment triggered directly by git push events. |
