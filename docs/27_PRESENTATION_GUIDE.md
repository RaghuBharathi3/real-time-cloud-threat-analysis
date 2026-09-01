# 27. University Project Presentation and Viva Evaluation Guide

## Project Title
AI-based Framework for Security Risk Evaluation in Multi-Cloud Environments

---

## 1. Executive Problem Statement & Objectives

### Problem Statement
Modern enterprise infrastructure is distributed across heterogeneous cloud service providers (Amazon Web Services, Microsoft Azure, Google Cloud Platform, and Oracle Cloud Infrastructure). Each provider structures its audit and telemetry logs in distinct, proprietary formats (AWS CloudTrail, Azure Activity Logs, GCP Cloud Logging, and OCI Audit Guard). Security Operations Center (SOC) analysts face fragmented visibility, incompatible schemas, and manual correlation delays, resulting in elevated dwell time for adversary intrusions.

### Objectives
1. Design an extensible Cloud Adapter Layer that abstracts provider-specific APIs and normalizes raw telemetry into a unified 10-field Canonical Event Schema.
2. Build an automated multi-stage pipeline that validates schema integrity, extracts numerical/categorical feature vectors, and applies Machine Learning for automated threat classification.
3. Construct a deterministic, explainable Risk Scoring Engine (0 to 100) and map detections directly to international compliance frameworks (NIST CSF 2.0, CIS Controls v8, ISO/IEC 27001:2022).
4. Implement production defensive controls including thread-safe sliding-window rate limiting, duplicate event prevention (idempotency), and strict source mode tagging (`REAL` telemetry vs `DEMO` scenarios).

---

## 2. Technology Stack & Architecture

- **Backend Service**: Python 3.10+ / FastAPI / Pydantic v2 / SQLAlchemy / SQLite & PostgreSQL
- **Machine Learning Engine**: Scikit-Learn (Random Forest Classifier, 50 estimators) / NumPy / Pandas / Joblib
- **Cloud Integrations**: Boto3 (AWS CloudTrail/STS), Azure Identity & Azure Monitor REST API, Google Auth & Cloud Logging v2 REST API, OCI Cloud Guard Normalization
- **Frontend Console**: React 18 / Vite / Vanilla CSS Design System / Lucide Icons / Chart.js Canvas
- **Security & Core**: Thread-Safe Sliding Window Rate Limiter, Ingest Deduplication Engine, Automated DB Schema Migrations

```
+-------------------------------------------------------------------------+
|                  Heterogeneous Cloud Telemetry Sources                  |
|    AWS CloudTrail  |  Azure Activity Log  |  GCP Logging  |  OCI Guard  |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         Cloud Adapter Layer                             |
|          (Authenticates, Polls, and Normalizes Event Payload)           |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                   10-Field Canonical Event Schema                       |
|   (event_id, timestamp, cloud_provider, user_id, event_type,           |
|    ip_address, location, failed_attempts, resource, request_frequency)  |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                  Module 1: Ingestion & Schema Validation                |
|      (Pydantic Type Enforcement, Missing Field Rejection, Isolation)    |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|              Module 2: Feature Engineering & Preprocessing              |
|        (Extracts 6-Dimensional Numerical Vector for Classifier)         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|            Module 3: Machine Learning Threat Classification             |
|         (Random Forest Classifier -> Threat Class & Probabilities)      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|               Deterministic Risk & Compliance Engine                    |
|    (Calculates 0-100 Score, Severity Tier, NIST/CIS/ISO Playbooks)      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                     Persistence & Presentation                          |
|         (Idempotent SQLite DB -> REST API -> React 18 Dashboard)        |
+-------------------------------------------------------------------------+
```

---

## 3. Module Breakdown (Input -> Process -> Output)

### Module 1: Event Collection & Validation (`backend/app/modules/module1_event_collection.py`)
- **Input**: Raw dictionary payload from cloud adapter or simulated event.
- **Process**: Verifies types and constraints against `CanonicalEvent` model using Pydantic. Validates non-empty fields, ISO-8601 timestamps, valid cloud provider enumerations, and non-negative integer bounds.
- **Output**: Validated `CanonicalEvent` object; rejects invalid payloads with HTTP 422.

### Module 2: Preprocessing & Feature Extraction (`backend/app/modules/module2_preprocessing.py`)
- **Input**: Validated `CanonicalEvent` object.
- **Process**: Maps high-cardinality textual attributes into a 6-dimensional feature vector:
  1. `failed_attempts`: Integer count of failed authentication attempts.
  2. `request_frequency`: Integer count of requests within the rolling observation window.
  3. `is_login`: Binary flag (`1` if `event_type == 'login'`, else `0`).
  4. `is_sensitive_resource`: Binary flag (`1` if resource contains `admin`, `key`, `secret`, `vault`, `iam`, `root`, or `billing`, else `0`).
  5. `is_unusual_location`: Binary flag (`1` if location is foreign/anomalous, else `0`).
  6. `is_api_or_resource_access`: Binary flag (`1` if `event_type` is `resource_access` or `api_call`, else `0`).
- **Output**: 1x6 numerical array formatted for classifier input.

### Module 3: Threat Detection Model (`backend/app/modules/module3_threat_detection.py`)
- **Input**: 1x6 numerical feature vector.
- **Process**: Executes inference via `RandomForestClassifier.predict_proba()` against trained binary artifact (`backend/models/threat_detector.joblib`).
- **Output**: Predicted threat category (`normal`, `brute_force`, `unauthorized_access`), confidence level (0.0 to 1.0), and individual class probability distribution.

### Risk & Compliance Engine (`backend/app/modules/module3_threat_detection.py`)
- **Input**: Threat classification, confidence score, feature values, and target resource name.
- **Process**: Computes transparent integer risk score (0 to 100) using deterministic mathematical formulas, assigns severity tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), extracts explainability reason strings, and attaches NIST/CIS/ISO compliance playbooks.
- **Output**: Enriched security alert object ready for database storage and dashboard rendering.

---

## 4. Machine Learning Model Justification & Evaluation

### Why Random Forest Over Deep Learning?
1. **Tabular Feature Efficacy**: Security log telemetry consists of structured tabular data. Tree ensemble methods (Random Forest / XGBoost) consistently outperform Deep Neural Networks on tabular data with low feature dimensionality (6 features).
2. **Deterministic Inference Latency**: Random Forest inference executes in under 2 milliseconds on standard CPU hardware without GPU acceleration or heavy runtime dependencies.
3. **Resistance to Overfitting**: Bagging and bootstrap feature sampling prevent individual anomalous events from skewing decision boundaries.
4. **Feature Interpretability**: Decision paths and Gini impurity feature importances can be extracted and audited for explainable AI compliance.

### Model Parameters & Evaluation Metrics
- **Estimators**: 50 Decision Trees (`n_estimators=50`, `random_state=42`).
- **Training Set**: 1,200 curated, labeled multi-cloud telemetry records (`data/raw/security_events.csv`).
- **Test / Evaluation Set**: 300 held-out labeled multi-cloud records (`data/raw/security_events_eval.csv`).
- **Measured Accuracy**: >95.0%
- **Macro Precision**: >0.94
- **Macro Recall**: >0.93
- **Macro F1-Score**: >0.94

---

## 5. Explainable Risk Scoring Formulation

The risk engine generates an exact, reproducible integer score from 0 to 100 based on weighted security telemetry factors:

### Severity Thresholds
- `0 to 29`: **LOW** (Routine, authorized cloud operations)
- `30 to 59`: **MEDIUM** (Elevated traffic volume or non-critical anomalies)
- `60 to 79`: **HIGH** (Access to sensitive assets, elevated failures, or foreign origins)
- `80 to 100`: **CRITICAL** (Active multi-attempt credential attacks or severe privilege breaches)

### Mathematical Formulations

1. **Normal Events (`threat_status == "Normal"`)**:
   $$\text{Score} = \min(29, \max(5, 10 + \min(15, 5 \times \text{failed}) + 10 \times \mathbb{I}_{\text{freq}>10} + 5 \times \mathbb{I}_{\text{unusual}}))$$

2. **Brute Force Events (`threat_status == "Threat Detected"` & `threat_type == "Brute-Force"`)**:
   $$\text{Score} = \min(100, \max(60, 65 + \lfloor 20 \times \text{Confidence} \rfloor + \min(15, 2 \times \text{failed})))$$

3. **Unauthorized Access Events (`threat_status == "Threat Detected"` & `threat_type == "Unauthorized"`)**:
   $$\text{Score} = \min(100, \max(60, 60 + \lfloor 20 \times \text{Confidence} \rfloor + 10 \times \mathbb{I}_{\text{sensitive}} + 5 \times \mathbb{I}_{\text{unusual}} + \min(5, \lfloor\text{freq}/5\rfloor)))$$

---

## 6. Live Demonstration Scripts

### 5-Minute Demonstration Script (Academic Review)

| Time | Target Screen / Component | Demonstration Action | Viva Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | System Header & Health | Launch `START_PROJECT.bat`. Point to `API: ONLINE` indicator (latency < 10ms). | *"Our framework is fully operational locally, running a FastAPI backend and a React 18 console with SQLite database persistence and automated migrations."* |
| **0:45 - 2:00** | Top Scenario Bar & Event Stream | Click **Run Test Scenario...** -> Select **AWS: Brute Force (Critical)**. | *"An event enters the AWS Adapter, passes Module 1 validation, extracts a 6-feature vector in Module 2, and is classified by Module 3 Random Forest with 95% confidence. Notice the explainable risk score of 88 (CRITICAL) and automated NIST CSF 2.0 PR.AA-01 compliance remediation."* |
| **2:00 - 3:15** | Deep Event Inspector | Click the new row in the Security Events table to open the Inspector panel. | *"The inspector reveals all intermediate pipeline stages: raw JSON, extracted features (`failed_attempts=8`, `is_login=1`), ML class probabilities, contributing risk factors, and the source badge labeled DEMO."* |
| **3:15 - 4:15** | Cloud Providers Tab | Navigate to **Cloud Providers** -> Select Lookback `Last 1 hour` -> Click **Test All Connectors**. | *"Our Cloud Adapter Layer standardizes AWS, Azure, GCP, and OCI into a single Canonical Schema. The system handles live STS identities, Entra ID OAuth2 tokens, and GCP Service Accounts while safely handling idle cloud accounts without errors."* |
| **4:15 - 5:00** | Conclusion & Test Validation | Run `pytest tests/` in terminal. | *"The entire pipeline, cloud adapters, rate limiters, and REST endpoints are verified with 28 automated tests passing at 100%."* |

---

### 10-Minute Deep-Dive Demonstration Script (University Panel)

| Time | Target Screen / Action | Technical Demonstration | Deep-Dive Explanation |
| :--- | :--- | :--- | :--- |
| **0:00 - 1:30** | Architecture Overview | Review system architecture diagram and schema definitions. | Explain why multi-cloud security requires schema normalization and how the 10-field Canonical Schema eliminates cloud vendor lock-in. |
| **1:30 - 3:30** | Pipeline Execution | Ingest 3 distinct scenarios: AWS Brute Force, Azure KeyVault Breach, and GCP KMS Burst. | Demonstrate how different cloud provider event types are normalized into the exact same feature engineering pipeline and classified consistently. |
| **3:30 - 5:30** | Machine Learning & Risk Engine | Open ML Model tab. Retrain model live or review confusion matrix. | Explain why Random Forest was selected over deep learning, how 50 estimators calculate class probabilities, and how the deterministic risk formula prevents black-box hallucination. |
| **5:30 - 7:00** | Live Cloud Telemetry & Source Mode | Navigate to Cloud Providers. Trigger **Sync CloudTrail Logs** and **Sync Audit Logs**. | Show source mode tagging (`REAL` vs `DEMO`), duplicate event prevention (idempotency), and graceful idle account handling. |
| **7:00 - 8:30** | Security Controls & Rate Limiting | Trigger rapid sync requests or switch to `guest_user` (Free Tier) to show RBAC gating. | Demonstrate the server-side sliding-window rate limiter returning HTTP 429 (`Too Many Requests`) with `Retry-After` headers. |
| **8:30 - 10:00** | Viva Q&A and Verification | Show test suite (28/28 passed), database migration log, and zero-secret git hygiene. | Answer panel questions using the prepared viva response matrix. |

---

## 7. Comprehensive Viva Examination Q&A Matrix

### 1. What core problem does this project solve?
**Answer**: Cloud providers use disparate, proprietary logging schemas (AWS CloudTrail, Azure Activity Log, GCP Cloud Logging). This system bridges this fragmentation by abstracting cloud APIs, normalizing telemetry into a Canonical Event Schema, and applying automated machine learning threat detection with explainable risk scoring.

### 2. Why is multi-cloud security difficult?
**Answer**: Multi-cloud environments lack unified visibility. Field names, authentication mechanisms, severity definitions, and event models differ completely across providers. Correlating a brute-force attack across AWS and Azure requires unified normalization and centralized analysis.

### 3. What data does the system collect?
**Answer**: Authentication logs, resource access records, API modification calls, failed login attempts, source IP addresses, geographic origin, and target resource identifiers.

### 4. How is the data normalized?
**Answer**: Each provider adapter (`AWSAdapter`, `AzureAdapter`, `GCPAdapter`, `OCIAdapter`) extracts provider-specific fields and maps them into the 10-field `CanonicalEvent` model: `event_id`, `timestamp`, `cloud_provider`, `user_id`, `event_type`, `ip_address`, `location`, `failed_attempts`, `resource`, `request_frequency`.

### 5. Why is Machine Learning used instead of pure static rules?
**Answer**: Static rules fail when adversaries introduce subtle variations in request rates or distribute login attempts across varied IPs. Machine learning classifiers learn non-linear decision boundaries across multi-dimensional feature interactions (`failed_attempts` combined with `request_frequency` and `resource_sensitivity`) to detect novel attack patterns.

### 6. Why Random Forest and not a Deep Neural Network?
**Answer**:
1. Tabular features: Tree ensembles consistently outperform deep networks on low-dimensional tabular datasets.
2. Inference speed: Random Forest executes in < 2ms without GPU hardware.
3. Interpretability: Decision trees offer transparent feature importances and class probabilities, avoiding black-box neural opacity.

### 7. What 6 features are fed to the ML model?
**Answer**:
1. `failed_attempts` (numeric count)
2. `request_frequency` (numeric count)
3. `is_login` (binary: 1 or 0)
4. `is_sensitive_resource` (binary: 1 or 0)
5. `is_unusual_location` (binary: 1 or 0)
6. `is_api_or_resource_access` (binary: 1 or 0)

### 8. How is confidence calculated?
**Answer**: Confidence represents the maximum class probability output by `RandomForestClassifier.predict_proba()`, calculated as the fraction of decision trees in the ensemble that voted for the winning threat class.

### 9. How is the final risk score calculated?
**Answer**: A deterministic weighted equation scales the baseline threat classification by the ML confidence, number of failed attempts, resource criticality (+10 if sensitive asset), location anomaly (+5 if foreign origin), and request frequency, bounding the result between 0 and 100.

### 10. How are compliance recommendations generated?
**Answer**: Detections are mapped to pre-configured control mappings across NIST CSF 2.0 (e.g., `PR.AA-01`, `PR.AC-04`), CIS Controls v8 (e.g., `CIS 5.4`, `CIS 6.2`), and ISO/IEC 27001:2022 (e.g., `A.9.4.2`, `A.12.6.1`).

### 11. How does the system prevent duplicate events during repeated polling?
**Answer**: The system enforces idempotency by verifying whether the `event_id` already exists in the `SecurityAlert` database table prior to insert. If found, it increments `skipped_duplicates_count` and prevents duplicate rows.

### 12. How does the rate limiter protect the system?
**Answer**: A thread-safe sliding-window rate limiter monitors request counts per IP/User over a rolling 60-second window. If a client exceeds their tier quota (e.g., 5 requests/min for ML retraining or 20/min for cloud sync), the server returns HTTP 429 (`Too Many Requests`) with a `Retry-After` header.

### 13. What happens if a cloud provider is down or idle?
**Answer**: If a provider API is unreachable, the adapter catches the exception, reports an explicit error status (e.g., `INSUFFICIENT_PERMISSIONS` or `FAILED`), and leaves other cloud adapters unaffected. If the cloud account is idle (0 logs), the adapter reports an idle status without failing.

### 14. How does Demo Mode differ from Real Mode?
**Answer**:
- Real Mode queries live cloud logging APIs (CloudTrail, Activity Log, Cloud Logging) and tags ingested events with `source_mode="REAL"`.
- Demo Mode generates realistic synthetic events that pass through the exact same Module 1 validation, Module 2 feature extraction, Module 3 ML classification, and Risk Engine, tagging outputs with `source_mode="DEMO"`.

### 15. Where is the data stored?
**Answer**: In an SQLite database (`data/cloud_security.db`) locally, or PostgreSQL in containerized/production deployments, managed via SQLAlchemy ORM with automated startup migrations.

---

## 8. Known Limitations & Preempted Reviewer Questions

| Reviewer Critique | Root Cause | System Handling | Future Scope |
| :--- | :--- | :--- | :--- |
| **Dataset Size (1,500 samples)** | Curated synthetic benchmark dataset for academic research. | Rigorous train/test split (80/20) with cross-validation to prevent overfitting. | Ingest production benchmark datasets (e.g., UNSW-NB15 or real cloud honeypot telemetry). |
| **Cloud Write / Active Remediation** | Read-only security audit scope to prevent accidental production disruption. | Read-only adapter permissions (`SecurityAudit`, `roles/logging.viewer`) with automated remediation playbooks. | Integrate automated SOAR webhooks (AWS Lambda / Azure Functions) for active IP blocking and session revocation. |
| **OCI Real API Dependency** | Oracle OCI Python SDK requires complex OCI PEM private key signing configuration. | Transparent OCI Demo Mode with deterministic stream generator. | Implement native OCI REST API client with OCI API Key signing. |
| **In-Memory Rate Limiter** | Single-instance local architecture without external caching services. | Thread-safe in-memory sliding window using Python `threading.Lock`. | Integrate Redis cluster for distributed multi-worker rate limiting. |

---

## 9. Comprehensive Testing & Validation Summary

- **Total Automated Tests**: 28 passed, 0 failed (`pytest tests/`).
  - `test_cloud_adapters.py`: Adapter connection, credential validation, normalization, and lookback window parsing.
  - `test_pipeline.py`: Module 1 validation, Module 2 feature vector extraction, Module 3 Random Forest inference, and Risk Engine bounds.
  - `test_endpoints.py`: FastAPI REST routes, RBAC access gating, sliding-window rate limiting enforcement (HTTP 429), and duplicate event deduplication.
- **Frontend Compilation**: 0 errors, 0 warnings (`npm run build` in `frontend/`).
- **Secret Hygiene**: 0 secrets committed in Git history (`python scripts/scan_secrets.py`).
