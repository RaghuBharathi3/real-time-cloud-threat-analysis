# 01. Project Overview

## 1. Project Title & Metadata
- **Project Title**: AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments
- **Domain**: Cloud Security, Machine Learning Intrusion Detection, DevSecOps
- **Project Type**: Academic Prototype & Research Framework

---

## 2. Objective & Problem Statement
Modern enterprise infrastructures are increasingly deployed across disparate cloud providers (**AWS, Microsoft Azure, Google Cloud Platform, and Oracle Cloud Infrastructure**). Each provider maintains proprietary audit log formats, telemetry schemas, and access control models (e.g., AWS CloudTrail, Azure Activity Logs, GCP Cloud Audit Logs, and OCI Cloud Guard). 

This fragmentation introduces critical operational challenges:
1. **Siloed Threat Visibility**: Security Operation Centers (SOC) struggle to cross-correlate anomalous actions spanning multiple cloud boundaries.
2. **Inconsistent Risk Quantification**: Lack of a unified scoring baseline leads to subjective alert prioritization.
3. **Delayed Incident Remediation**: Without automated framework alignment (NIST, CIS, ISO), analysts spend excessive time determining regulatory impact.

---

## 3. Proposed Solution
This project implements an end-to-end, multi-cloud security analysis pipeline that:
1. **Ingests and Normalizes Multi-Cloud Logs**: Ingests heterogeneous audit events into a strict **Canonical Event Schema**.
2. **Applies Machine Learning Classification**: Uses a trained **Random Forest** classifier to detect anomalous activity (`normal`, `brute_force`, `unauthorized_access`).
3. **Quantifies Real-Time Risk**: Calculates a deterministic, explainable **Risk Score (0–100)** and assigns severity levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
4. **Maps Compliance Controls**: Automatically outputs actionable remediation mapped to **NIST CSF 2.0**, **CIS Controls v8**, and **ISO/IEC 27001:2022**.
5. **Presents an Operational Dashboard**: Provides real-time event streaming, cloud connector status, feature inspection, and diagnostic audit logs.

---

## 4. Implementation Status Overview

| Capability | Status | Description |
| :--- | :--- | :--- |
| **Module 1 (Event Ingestion & Schema)** | **IMPLEMENTED** | Validates schema, timestamp, IP, and isolates batch errors. |
| **Module 2 (Preprocessing & Features)** | **IMPLEMENTED** | Extracts 6 numerical/categorical features from cloud events. |
| **Module 3 (ML Threat Classifier)** | **IMPLEMENTED** | Random Forest model trained on security event dataset (>95% accuracy). |
| **Risk Scoring Engine** | **IMPLEMENTED** | Computes 0–100 risk score and assigns severity tiers. |
| **Compliance Recommendations** | **IMPLEMENTED** | Maps threat verdicts to NIST CSF, CIS Controls, and ISO 27001. |
| **AWS Cloud Adapter** | **IMPLEMENTED** | Live STS identity & CloudTrail normalization. |
| **Azure Cloud Adapter** | **IMPLEMENTED** | Live Microsoft Entra ID / Graph token authentication. |
| **GCP Cloud Adapter** | **IMPLEMENTED** | Live Service Account authentication & Audit log normalizer. |
| **OCI Cloud Adapter** | **DEMO** | Deterministic Oracle Cloud Guard stream simulator. |
| **Local Database & Audit Logs** | **IMPLEMENTED** | SQLite with automated migrations & admin audit trail. |
| **Real-Time Security Dashboard** | **IMPLEMENTED** | React 18 + Vite Operations Console with 1-click demo suite. |
| **Role-Based Access Control (RBAC)**| **IMPLEMENTED** | Session switching across `ADMIN`, `ANALYST`, and `USER`. |
| **Free vs. Pro Gating** | **IMPLEMENTED** | Multi-cloud access gated server-side for Pro tier users. |
| **Razorpay Payment Gateway** | **OPTIONAL / DEMO** | Local cryptographic HMAC checkout webhook simulator. |
| **Supabase Cloud Auth** | **OPTIONAL** | Local database-backed session management used for reliability. |
| **Vercel Cloud Deployment** | **OPTIONAL** | Local-first architecture; runs via one-click Windows launcher. |

---

## 5. Technology Stack Summary

- **Backend API**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy
- **Machine Learning**: Scikit-Learn (Random Forest), Pandas, NumPy, Joblib
- **Cloud SDKs**: `boto3` (AWS), `azure-identity` (Azure), `google-auth` (GCP)
- **Frontend Console**: React 18, Vite, Tailwind CSS, Lucide React, Vanilla CSS Tokens
- **Database**: SQLite / PostgreSQL compatible
- **Automation & CLI**: Windows Batch, PowerShell, Pytest
