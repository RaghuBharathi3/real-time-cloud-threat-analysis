# 01. Project Overview

## Purpose
This project implements an automated multi-cloud security analysis framework designed to ingest, normalize, and evaluate audit logs from heterogeneous cloud platforms (AWS, Microsoft Azure, Google Cloud Platform, and Oracle Cloud Infrastructure). The platform uses machine learning classification to detect suspicious activities, calculates explainable risk scores, and outputs actionable remediation recommendations mapped to established cybersecurity compliance frameworks.

## Scope
The project covers:
1. Multi-cloud log normalization using a unified Canonical Event Schema.
2. Ingestion validation and error-isolated batch processing (Module 1).
3. Feature engineering across 6 numerical and categorical dimensions (Module 2).
4. Threat classification using a trained Random Forest model (Module 3).
5. Explainable risk scoring on a 0 to 100 scale with severity tier classification.
6. Automated compliance mapping for NIST CSF 2.0, CIS Controls v8, and ISO/IEC 27001:2022.
7. Local-first execution with an interactive web-based Security Operations Center (SOC) console.

Out of scope for this prototype:
- Live automatic IAM policy revocation or resource termination in target clouds.
- Production multi-region Kafka or Redis streaming infrastructure.

## System Capabilities and Implementation Status

| Component | Status | Description |
| :--- | :--- | :--- |
| Module 1: Event Collection and Validation | IMPLEMENTED | Schema validation, type checking, and batch error isolation using Pydantic. |
| Module 2: Preprocessing and Features | IMPLEMENTED | Extracts 6 numerical and binary features from cloud security events. |
| Module 3: Threat Classification | IMPLEMENTED | Random Forest classifier trained on multi-cloud security events (>95% accuracy). |
| Risk Scoring Engine | IMPLEMENTED | Computes explainable 0 to 100 integer scores and assigns LOW, MEDIUM, HIGH, CRITICAL tiers. |
| Compliance Recommendation Engine | IMPLEMENTED | Maps threat verdicts to NIST CSF 2.0, CIS Controls v8, and ISO/IEC 27001:2022. |
| AWS Cloud Adapter | IMPLEMENTED | Live STS caller identity validation and CloudTrail log normalization. |
| Azure Cloud Adapter | IMPLEMENTED | Live Microsoft Entra ID token acquisition and Activity Log normalization. |
| GCP Cloud Adapter | IMPLEMENTED | Live Service Account authentication and Cloud Audit Log normalization. |
| OCI Cloud Adapter | DEMO | Deterministic Oracle Cloud Guard audit stream simulator. |
| Operations Console UI | IMPLEMENTED | React 18 and Vite frontend with live telemetry table and deep event inspector. |
| User Session and RBAC | IMPLEMENTED | Local role-based access control supporting ADMIN, ANALYST, and USER tiers. |
| Billing Pipeline | DEMO | Cryptographically verified local checkout and HMAC-SHA256 webhook simulator. |
| Supabase Auth Integration | OPTIONAL | Local database session management used to preserve offline reliability. |
| Vercel Deployment | OPTIONAL | Configured for local-first execution via Windows batch scripts. |

## Technology Stack

| Layer | Technology | Function |
| :--- | :--- | :--- |
| Backend Framework | Python 3.10+, FastAPI, Uvicorn | REST API and pipeline orchestration |
| Data Validation | Pydantic v2 | Canonical Event Schema enforcement |
| Machine Learning | Scikit-Learn, Pandas, NumPy, Joblib | Random Forest training and inference |
| Database | SQLite, SQLAlchemy ORM | Alert storage, audit logging, and user state |
| Cloud SDKs | Boto3, Azure-Identity, Google-Auth | Provider authentication and log retrieval |
| Frontend UI | React 18, Vite, Tailwind CSS, Lucide Icons | Real-time operations console |
| Testing and QA | Pytest, AnyIO, Starlette TestClient | Unit and integration testing |
| Automation | Windows Batch, PowerShell | One-click service management |
