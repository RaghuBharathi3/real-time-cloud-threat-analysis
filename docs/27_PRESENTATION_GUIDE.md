# 27. Academic Presentation & Evaluation Guide

This guide provides a structured 5–8 minute demonstration script and presentation workflow for professors and academic evaluators.

---

## 1. Quick Presentation Checklist
1. Double-click `START_PROJECT.bat`.
2. Wait for `MULTI-CLOUD SECURITY PLATFORM READY` terminal notice.
3. Web browser opens automatically to `http://127.0.0.1:5173`.

---

## 2. 5–8 Minute Presentation Script

### Stage 1: Introduction & Multi-Cloud Health (1 Minute)
- **What to Click**: Point out top banner and **Top Metrics Ribbon**.
- **What to Say**:
  > *"Good morning/afternoon. Today I am presenting our AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments. Our system addresses the challenge of siloed visibility across heterogeneous clouds by normalizing telemetry from AWS, Azure, GCP, and OCI into a single canonical event schema, evaluating risks with machine learning, and mapping threats directly to compliance frameworks."*
- **What to Observe**: Active adapters showing `CONNECTED` for AWS, Azure, GCP and `DEMO MODE` for OCI.

---

### Stage 2: 1-Click Multi-Cloud Threat Ingestion (2 Minutes)
- **What to Click**: Click `AWS: Brute Force (Critical)` from the top demo bar.
- **What to Say**:
  > *"Here we trigger an AWS authentication attack. The event is ingested through our uniform AWS Adapter, normalized, and processed by our three core pipeline modules."*
- **What to Observe**:
  - Event appears in the **Live Event Log Stream** with a Red `CRITICAL (91)` badge.
  - Click the event to open the **Deep Event Inspector**:
    - **Module 1**: Canonical Ingest Schema.
    - **Module 2**: Feature Vector (`failed_attempts=9`, `is_login=1`, `is_sensitive=1`).
    - **Module 3**: Random Forest prediction (`Possible Brute-Force Activity`, 95% Confidence).
    - **Risk Engine**: Explainable risk score of `91 / 100` (`CRITICAL`).
    - **Compliance Recommendations**: Actionable remediation mapped to **NIST CSF 2.0 (PR.AA-01)**, **CIS Controls v8 (CIS 5.4)**, and **ISO/IEC 27001:2022 (A.9.4.2)**.

---

### Stage 3: Multi-Cloud Normalization Demonstration (2 Minutes)
- **What to Click**: Click `Azure: KeyVault Breach (High)` and `GCP: Storage Burst (High)`.
- **What to Say**:
  > *"Notice how events originating from different cloud architectures—such as Azure KeyVault and GCP Cloud KMS—are seamlessly transformed into compatible feature representations, yielding consistent risk ratings and tailored mitigation recommendations."*
- **What to Observe**: Distinct cloud provider badges with corresponding risk and compliance breakdowns.

---

### Stage 4: RBAC, Continuous Simulation & Admin Audit Trail (2 Minutes)
- **What to Click**:
  1. Click **SIMULATE STREAM** to show real-time ingestion from benchmark evaluation datasets.
  2. Switch session from `ADMIN_SECOPS` to `GUEST_USER (Free)` to show server-side tier restriction when attempting to sync secondary clouds.
  3. Switch back to `ADMIN_SECOPS` and open the **Admin Audit Logs** tab.
- **What to Say**:
  > *"The system enforces server-side Role-Based Access Control and maintains an immutable audit trail of all administrative logins, cloud syncs, and retraining events."*
- **What to Observe**: Live scrolling audit table and tier enforcement notices.

---

### Stage 5: Conclusion & Q&A (1 Minute)
- **What to Say**:
  > *"In conclusion, our platform demonstrates a complete, end-to-end multi-cloud security evaluation pipeline that is scalable, explainable, and aligned with industry compliance standards. Thank you, and I am now ready for your questions."*
