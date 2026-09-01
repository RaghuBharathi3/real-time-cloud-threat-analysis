# 16. Demo Mode and Deterministic Presentation Scenarios

## Purpose
This document specifies the Demo Mode architecture and the 5 built-in deterministic evaluation scenarios.

---

## 1. Demo Mode Configuration

When `DEMO_MODE=true` is set in `.env`:
- External cloud API calls are bypassed.
- Deterministic multi-cloud security telemetry is generated locally.
- All events pass through the identical validation, feature engineering, ML inference, and risk scoring pipeline.

---

## 2. Deterministic Presentation Scenarios

The platform includes 5 deterministic scenarios accessible via `POST /api/v1/pipeline/demo-scenario/{scenario_name}`:

### 1. AWS Brute Force Attack (`aws_brute_force`)
- **Cloud Provider**: AWS
- **Target Resource**: `ec2_admin_portal`
- **Parameters**: 9 failed logins, request frequency 15, IP `198.51.100.42` (Location: `RU`).
- **Classification**: `Possible Brute-Force Activity` (Confidence: 0.95)
- **Risk Score**: 91 / 100 (`CRITICAL`)
- **Compliance Mapping**: NIST CSF `PR.AA-01`, CIS Controls `5.4`, ISO/IEC 27001 `A.9.4.2`.

### 2. Azure KeyVault Breach Attempt (`azure_keyvault`)
- **Cloud Provider**: Azure
- **Target Resource**: `azure_keyvault`
- **Parameters**: Sensitive cryptographic vault access from foreign location (`CN`).
- **Classification**: `Possible Unauthorized Resource Access` (Confidence: 0.88)
- **Risk Score**: 82 / 100 (`CRITICAL`)
- **Compliance Mapping**: NIST CSF `PR.AC-04`, CIS Controls `3.11`, ISO/IEC 27001 `A.9.4.1`.

### 3. GCP Storage Burst (`gcp_storage_burst`)
- **Cloud Provider**: GCP
- **Target Resource**: `gcp_kms`
- **Parameters**: Abnormal API call burst velocity (35 requests/minute).
- **Classification**: `Possible Unauthorized Resource Access` (Confidence: 0.82)
- **Risk Score**: 76 / 100 (`HIGH`)
- **Compliance Mapping**: NIST CSF `RS.AN-01`, CIS Controls `6.8`, ISO/IEC 27001 `A.13.1.1`.

### 4. OCI Normal Compute Access (`oci_normal`)
- **Cloud Provider**: OCI
- **Target Resource**: `oci_object_store`
- **Parameters**: Routine authorized request from internal developer IP.
- **Classification**: `Normal Event` (Confidence: 0.98)
- **Risk Score**: 18 / 100 (`LOW`)
- **Compliance Mapping**: NIST CSF `DE.AE-01`, CIS Controls `8.2`, ISO/IEC 27001 `A.12.4.1`.

### 5. AWS Normal S3 Read (`aws_normal`)
- **Cloud Provider**: AWS
- **Target Resource**: `s3_public_assets`
- **Parameters**: Routine asset retrieval.
- **Classification**: `Normal Event` (Confidence: 0.99)
- **Risk Score**: 10 / 100 (`LOW`)
- **Compliance Mapping**: NIST CSF `DE.AE-01`, CIS Controls `8.2`, ISO/IEC 27001 `A.12.4.1`.
