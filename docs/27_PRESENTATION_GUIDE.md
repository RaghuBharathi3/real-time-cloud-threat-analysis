# 27. Project Demonstration and Viva Evaluation Guide

## Purpose
This document provides a structured 5 to 8 minute demonstration workflow and presentation script for academic project evaluation and viva examination.

---

## 1. Setup and Preparation
1. Double-click `START_PROJECT.bat`.
2. Wait for the terminal message confirming the backend and frontend are ready.
3. The web browser will open automatically to `http://127.0.0.1:5173`.

---

## 2. Structured Presentation Script

### Stage 1: Problem Statement and Architecture Overview (1 Minute)
- **Action**: Direct attention to the top header and the multi-cloud status cards.
- **Talking Points**:
  - Multi-cloud architectures create fragmented telemetry across AWS, Azure, GCP, and OCI.
  - This framework normalizes disparate audit logs into a unified 10-field Canonical Event Schema.
  - Telemetry is evaluated using machine learning classification, deterministic risk scoring, and compliance framework mappings.

---

### Stage 2: 1-Click Threat Ingestion and Detection (2 Minutes)
- **Action**: Click the `AWS: Brute Force (Critical)` button in the demo scenario bar.
- **Talking Points**:
  - The event enters the pipeline via the AWS Adapter, passes Pydantic schema validation, and extracts a 6-dimensional feature vector.
  - In the Live Event Stream, select the new event to display the Deep Event Inspector:
    - **Module 1**: Canonical Ingest Schema.
    - **Module 2**: Feature Vector (`failed_attempts=9`, `is_login=1`, `is_sensitive=1`).
    - **Module 3**: Random Forest prediction (`Possible Brute-Force Activity`, 95% confidence).
    - **Risk Engine**: Explainable risk score of 91/100 (`CRITICAL`).
    - **Compliance Recommendations**: Actionable guidance mapped to NIST CSF 2.0 (`PR.AA-01`), CIS Controls v8 (`CIS 5.4`), and ISO/IEC 27001:2022 (`A.9.4.2`).

---

### Stage 3: Multi-Cloud Normalization (2 Minutes)
- **Action**: Click `Azure: KeyVault Breach (High)` and `GCP: Storage Burst (High)`.
- **Talking Points**:
  - Highlight that events from different clouds (Azure KeyVault and GCP Cloud KMS) are normalized into the same canonical format.
  - The machine learning classifier correctly detects unauthorized access patterns regardless of the originating cloud provider.

---

### Stage 4: RBAC, Simulation, and Audit Trail (2 Minutes)
- **Action**:
  1. Toggle **SIMULATE STREAM** to show real-time ingestion from benchmark evaluation datasets.
  2. Switch the active session from `admin_secops` to `guest_user` (Free Tier) to demonstrate server-side access gating when attempting multi-cloud log sync.
  3. Switch back to `admin_secops` and navigate to the **Admin Audit Logs** tab.
- **Talking Points**:
  - Demonstrates role-based access control and tier enforcement.
  - Shows the immutable audit trail recording all administrative actions, connection tests, and model retraining events.

---

### Stage 5: Summary and Conclusion (1 Minute)
- **Talking Points**:
  - Summarize the pipeline: normalization, machine learning classification, risk scoring, and compliance mapping.
  - Note test validation: 27 automated unit and integration tests passing with 100% success rate.
