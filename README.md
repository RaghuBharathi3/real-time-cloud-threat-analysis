# AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments

An intelligent multi-cloud security operations platform that ingests, validates, and normalizes audit telemetry across **AWS, Microsoft Azure, Google Cloud Platform (GCP), and Oracle Cloud Infrastructure (OCI)**, evaluates threats using a trained **Random Forest** machine learning classifier, computes deterministic **Risk Scores (0–100)**, and outputs automated compliance recommendations (**NIST CSF 2.0, CIS Controls v8, ISO/IEC 27001:2022**).

---

## ⚡ Quick Start (One-Click)

The entire platform runs 100% self-contained on Windows with zero external blocking dependencies:

1. **Start Platform**: Double-click [**`START_PROJECT.bat`**](file:///c:/Users/Windows/Documents/cloud/START_PROJECT.bat)
   - Verifies Python 3.10+ and Node.js 18+
   - Resolves port conflicts on `8000` and `5173`
   - Starts Backend API (`http://127.0.0.1:8000`) and Frontend Console (`http://127.0.0.1:5173`)
   - Performs automated health checks and opens default web browser
2. **Stop Platform**: Double-click [**`STOP_PROJECT.bat`**](file:///c:/Users/Windows/Documents/cloud/STOP_PROJECT.bat)
3. **Restart Platform**: Double-click [**`RESTART_PROJECT.bat`**](file:///c:/Users/Windows/Documents/cloud/RESTART_PROJECT.bat)

---

## 🏗️ System Architecture

```
AWS / Azure / GCP / OCI Audit Telemetry
                   │
                   ▼
       [Uniform Cloud Adapters]
                   │
                   ▼
     [Canonical Event Schema (Pydantic)]
                   │
                   ▼
  [Module 1: Ingestion & Validation]
                   │
                   ▼
 [Module 2: Feature Engineering (6-Dim)]
                   │
                   ▼
 [Module 3: Random Forest ML Classifier]
                   │
                   ▼
   [Risk Scoring Engine: 0–100 Score]
   [LOW / MEDIUM / HIGH / CRITICAL]
                   │
                   ▼
 [Compliance Mapping: NIST / CIS / ISO]
                   │
                   ▼
  [Database & System Administration Log]
                   │
                   ▼
[Real-Time Security Operations Dashboard]
```

---

## 📂 Complete Documentation Index (`docs/`)

The project documentation is organized into 27 structured references:

### System & Architecture
1. [**01. Project Overview**](file:///c:/Users/Windows/Documents/cloud/docs/01_PROJECT_OVERVIEW.md) — Problem statement, scope, and implementation status.
2. [**02. System Architecture**](file:///c:/Users/Windows/Documents/cloud/docs/02_SYSTEM_ARCHITECTURE.md) — Detailed pipeline architecture and Mermaid diagrams.
3. [**03. Core Modules**](file:///c:/Users/Windows/Documents/cloud/docs/03_CORE_MODULES.md) — Deep-dive into Modules 1, 2, and 3.
4. [**04. Data Pipeline**](file:///c:/Users/Windows/Documents/cloud/docs/04_DATA_PIPELINE.md) — Canonical event schema and normalization rules.
5. [**05. ML & Risk Engine**](file:///c:/Users/Windows/Documents/cloud/docs/05_ML_AND_RISK_ENGINE.md) — Random Forest classifier, risk scoring, and compliance mappings.
6. [**06. Multi-Cloud Architecture**](file:///c:/Users/Windows/Documents/cloud/docs/06_MULTI_CLOUD_ARCHITECTURE.md) — Common adapter interface and provider states.

### Cloud Integration Guides
7. [**07. AWS Setup Guide**](file:///c:/Users/Windows/Documents/cloud/docs/07_AWS_SETUP.md) — IAM permissions, STS identity, and CloudTrail setup.
8. [**08. Azure Setup Guide**](file:///c:/Users/Windows/Documents/cloud/docs/08_AZURE_SETUP.md) — Microsoft Entra ID and Activity Log integration.
9. [**09. GCP Setup Guide**](file:///c:/Users/Windows/Documents/cloud/docs/09_GCP_SETUP.md) — Service account key placement and Audit Log setup.
10. [**10. OCI Setup & Demo Guide**](file:///c:/Users/Windows/Documents/cloud/docs/10_OCI_SETUP.md) — Oracle Cloud Infrastructure and Demo Mode.

### Security, Auth & Tiers
11. [**11. Credential Security**](file:///c:/Users/Windows/Documents/cloud/docs/11_CREDENTIAL_SECURITY.md) — Secrets classification, `.gitignore` rules, and zero-leakage controls.
12. [**12. Authentication & RBAC**](file:///c:/Users/Windows/Documents/cloud/docs/12_AUTHENTICATION_AND_RBAC.md) — User roles (`ADMIN`, `ANALYST`, `USER`) and route protection.
13. [**13. Free vs. Pro Features**](file:///c:/Users/Windows/Documents/cloud/docs/13_FREE_PRO_FEATURES.md) — Capability breakdown and server-side tier gating.
14. [**14. Billing Architecture**](file:///c:/Users/Windows/Documents/cloud/docs/14_BILLING.md) — Webhook verification and mock checkout pipeline.

### Operations & Diagnostics
15. [**15. Real-Time Processing**](file:///c:/Users/Windows/Documents/cloud/docs/15_REAL_TIME_PROCESSING.md) — Continuous simulation vs. live cloud sync.
16. [**16. Demo Mode & Scenarios**](file:///c:/Users/Windows/Documents/cloud/docs/16_DEMO_MODE.md) — 5 deterministic 1-click presentation scenarios.
17. [**17. Dashboard & UI Guide**](file:///c:/Users/Windows/Documents/cloud/docs/17_DASHBOARD_AND_UI.md) — Frontend layout, metrics ribbon, and deep inspector.
18. [**18. REST API Reference**](file:///c:/Users/Windows/Documents/cloud/docs/18_API_DOCUMENTATION.md) — Endpoints, request schemas, and responses.
19. [**19. Database Reference**](file:///c:/Users/Windows/Documents/cloud/docs/19_DATABASE.md) — Entity relationships, SQLite models, and migrations.
20. [**20. Security Posture**](file:///c:/Users/Windows/Documents/cloud/docs/20_SECURITY.md) — Defensive controls, least privilege, and limitations.

### Verification & Operations
21. [**21. Testing & Validation**](file:///c:/Users/Windows/Documents/cloud/docs/21_TESTING_AND_VALIDATION.md) — 27 automated tests report and test coverage.
22. [**22. Git & GitHub Guidelines**](file:///c:/Users/Windows/Documents/cloud/docs/22_GIT_AND_GITHUB.md) — Pre-commit security checklist and commit hygiene.
23. [**23. Deployment Guide**](file:///c:/Users/Windows/Documents/cloud/docs/23_DEPLOYMENT.md) — Local vs. containerized production deployment.
24. [**24. Run & Operations Guide**](file:///c:/Users/Windows/Documents/cloud/docs/24_RUN_GUIDE.md) — Detailed operational instructions.
25. [**25. Troubleshooting Guide**](file:///c:/Users/Windows/Documents/cloud/docs/25_TROUBLESHOOTING.md) — Common errors, port conflicts, and resolutions.
26. [**26. Implementation Status**](file:///c:/Users/Windows/Documents/cloud/docs/26_IMPLEMENTATION_STATUS.md) — Definitive single source of truth matrix.
27. [**27. Presentation Guide**](file:///c:/Users/Windows/Documents/cloud/docs/27_PRESENTATION_GUIDE.md) — 5–8 minute professor demonstration script.

---

## 🧪 Testing

Run the automated test suite:
```bash
pytest tests/
```
All **27 unit and integration tests** pass with 100% success rate.
