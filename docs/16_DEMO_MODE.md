# 16. Demo Mode & Deterministic Scenarios

This document explains Demo Mode configuration and the 1-click deterministic presentation scenarios.

---

## 1. Demo Mode Configuration

Set `DEMO_MODE=true` in `.env` to enable offline demonstration mode:
- Bypasses external cloud API calls.
- Operates 100% locally with synthetic multi-cloud security telemetry.
- All events pass through the **exact same** Module 1, Module 2, Module 3, and Risk Engine pipeline.

---

## 2. Deterministic Presentation Scenarios

The platform includes 5 built-in 1-click scenarios accessible directly from the dashboard header or via `POST /api/v1/pipeline/demo-scenario/{scenario_name}`:

### Scenario 1: AWS Brute Force Attack (`aws_brute_force`)
- **Cloud Provider**: AWS
- **Resource**: `ec2_admin_portal`
- **Characteristics**: 9 failed logins, request frequency 15, IP `198.51.100.42` (Location: `RU`).
- **Expected Verdict**: `Possible Brute-Force Activity`
- **Expected Risk**: `91` (**CRITICAL**)
- **Compliance Mapping**: NIST CSF `PR.AA-01`, CIS `5.4`, ISO `A.9.4.2`.

### Scenario 2: Azure KeyVault Breach Attempt (`azure_keyvault`)
- **Cloud Provider**: Azure
- **Resource**: `azure_keyvault`
- **Characteristics**: Sensitive cryptographic vault access from anomalous location (`CN`).
- **Expected Verdict**: `Possible Unauthorized Resource Access`
- **Expected Risk**: `82` (**CRITICAL**)
- **Compliance Mapping**: NIST CSF `PR.AC-04`, CIS `3.11`, ISO `A.9.4.1`.

### Scenario 3: GCP Storage Data Burst (`gcp_storage_burst`)
- **Cloud Provider**: GCP
- **Resource**: `gcp_kms`
- **Characteristics**: Abnormal API call burst velocity (35 req/min).
- **Expected Verdict**: `Possible Unauthorized Resource Access`
- **Expected Risk**: `76` (**HIGH**)
- **Compliance Mapping**: NIST CSF `RS.AN-01`, CIS `6.8`, ISO `A.13.1.1`.

### Scenario 4: OCI Standard Compute Access (`oci_normal`)
- **Cloud Provider**: OCI
- **Resource**: `oci_object_store`
- **Characteristics**: Standard baseline access from authorized location.
- **Expected Verdict**: `Normal Event`
- **Expected Risk**: `18` (**LOW**)
- **Compliance Mapping**: NIST CSF `DE.AE-01`, CIS `8.2`, ISO `A.12.4.1`.

### Scenario 5: AWS Normal S3 Read (`aws_normal`)
- **Cloud Provider**: AWS
- **Resource**: `s3_public_assets`
- **Characteristics**: Baseline read request from authorized developer.
- **Expected Verdict**: `Normal Event`
- **Expected Risk**: `10` (**LOW**)
- **Compliance Mapping**: NIST CSF `DE.AE-01`, CIS `8.2`, ISO `A.12.4.1`.
