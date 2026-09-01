# Cloud Integration Status Matrix

This document provides the verified integration and validation status across all supported cloud providers in the **AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments**.

---

## 1. Provider Integration Results

| Provider | Authentication | API Access | Event Collection | Normalization | Pipeline Execution | Overall Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AWS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | `CONNECTED` |
| **Azure** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | `CONNECTED` |
| **GCP** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | `CONNECTED` |
| **OCI** | **PASS** | **PASS** (Demo) | **PASS** | **PASS** | **PASS** | `DEMO MODE` |

---

## 2. Core Processing Pipeline Verification

| Pipeline Component | Test Description | Result |
| :--- | :--- | :--- |
| **Module 1 (Collection & Validation)** | Validates Pydantic schema across `aws`, `azure`, `gcp`, `oci` and isolates malformed event errors cleanly. | **PASS** |
| **Module 2 (Preprocessing & Features)** | Extracts 6 numerical/binary feature vectors from provider-specific sensitive assets and geolocations. | **PASS** |
| **Module 3 (ML Threat Detection)** | Random Forest Classifier classifies `normal`, `brute_force`, and `unauthorized_access` with confidence scoring. | **PASS** |
| **Risk Scoring Engine** | Computes 0–100 integer score and assigns `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` severity with explainable reasons. | **PASS** |
| **Compliance Mapping** | Maps detected threats to NIST CSF 2.0, CIS Controls v8, and ISO/IEC 27001:2022 with actionable mitigation steps. | **PASS** |
| **Admin Audit Trail** | Logs administrative actions, plan upgrades, model training, and cloud synchronization events. | **PASS** |
| **Database Storage** | SQLite / PostgreSQL stores alerts, risk scores, severity tiers, compliance, and audit records. | **PASS** |
| **Real-Time Dashboard** | React console displays top metrics ribbon, cloud status cards, live event stream, and 1-click demo scenarios. | **PASS** |
| **Deterministic Demo Suite** | 1-Click presentation scenarios for AWS, Azure, GCP, and OCI flowing through the entire ML pipeline. | **PASS** |
| **Security & Zero Leakage** | All credentials isolated in git-ignored `.env` and `credentials/` folder with zero exposure in logs or UI. | **PASS** |

---

## 3. Automated Test Suite Metrics

```
Tests Executed: 27
Passed: 27
Failed: 0
Execution Time: ~10.47s

Test Suites:
- tests/test_cloud_adapters.py   (11 tests - PASS)
- tests/test_pipeline.py         (5 tests - PASS)
- tests/test_endpoints.py        (11 tests - PASS)
```

---

## 4. Provider Verification Evidence

- **AWS**: Authenticated via AWS STS (`GetCallerIdentity`) as `arn:aws:iam::830460570633:user/cloud-security-student-aws` in region `ap-south-1`.
- **Azure**: Authenticated via Microsoft Identity Platform / Entra ID (`consumers` tenant) with Service Principal App registration.
- **GCP**: Authenticated via Google Service Account `cloud-security-reader@cloud-security-student-gcp.iam.gserviceaccount.com` on project `cloud-security-student-gcp`.
- **OCI**: Verified Oracle Cloud Infrastructure adapter running in deterministic Demo Mode generating canonical Oracle Cloud Guard events.
