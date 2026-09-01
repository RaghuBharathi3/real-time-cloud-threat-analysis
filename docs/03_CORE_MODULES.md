# 03. Core Security & Machine Learning Modules

The platform is structured around three core sequential modules that process security telemetry from raw ingest to ML evaluation.

---

## 1. Module 1: Real-Time Event Collection & Validation

- **Location**: `backend/app/modules/module1_event_collection.py`
- **Purpose**: Ingests security event dictionaries from cloud adapters, validates strict schema rules, rejects malformed payloads, and isolates errors in batch streams.

### Input Schema (`SecurityEvent`):
- `event_id`: Unique identifier (String)
- `timestamp`: ISO 8601 string (Regex validated)
- `cloud_provider`: Allowed set `{"aws", "azure", "gcp", "oci"}`
- `user_id`: Target user/principal identifier
- `event_type`: Allowed set `{"login", "resource_access", "api_call"}`
- `ip_address`: Valid IPv4 regex pattern
- `location`: ISO Country code or "Unknown"
- `failed_attempts`: Integer $\ge 0$
- `resource`: Cloud resource name string
- `request_frequency`: Integer $\ge 1$

### Error Isolation:
`validate_batch_events(raw_events)` partitions incoming batches into `(valid_events, rejected_events_with_reasons)` ensuring a single malformed log does not crash the ingestion pipeline.

---

## 2. Module 2: Data Preprocessing & Feature Engineering

- **Location**: `backend/app/modules/module2_preprocessing.py`
- **Purpose**: Converts validated canonical security events into numerical/binary feature vectors compatible with the Scikit-Learn Random Forest model.

### Feature Extraction Vector:
1. `failed_attempts`: Numerical count of failed login attempts.
2. `request_frequency`: Requests per minute velocity.
3. `is_login`: Binary flag (1 if `event_type == "login"`, else 0).
4. `is_sensitive_resource`: Binary flag (1 if resource matches known sensitive assets across AWS, Azure, GCP, or OCI, e.g. `s3_bucket_finance`, `azure_keyvault`, `gcp_kms`, `oci_vault`, or sensitive keywords).
5. `is_unusual_location`: Binary flag (1 if location is in anomalous origin list `{"CN", "RU", "KP", "IR", "SY", "UNKNOWN"}`).
6. `is_api_or_resource_access`: Binary flag (1 if `event_type` in `["resource_access", "api_call"]`, else 0).

---

## 3. Module 3: ML Threat Classification & Diagnostics

- **Location**: `backend/app/modules/module3_threat_detection.py`
- **Purpose**: Runs inference against the trained Random Forest Classifier, computes the Risk Score (0–100), outputs diagnostic reasoning, and generates compliance framework recommendations.

### Threat Categories:
- `normal`: Standard baseline operational telemetry.
- `brute_force`: Repeated failed authentication attempts.
- `unauthorized_access`: Suspicious access against sensitive cloud resources or from anomalous geolocations.

### Output Structure:
```json
{
  "threat_status": "Suspicious",
  "threat_type": "Possible Brute-Force Activity",
  "confidence": 0.95,
  "risk_score": 91,
  "severity": "CRITICAL",
  "reason": [
    "Multiple failed authentication attempts detected (9)",
    "High probability of automated credential stuffing / password spray"
  ],
  "compliance": {
    "actionable_recommendation": "Credential attack detected: enforce Multi-Factor Authentication (MFA)...",
    "framework_mappings": {
      "nist_csf": "PR.AA-01 | DE.CM-01",
      "cis_controls": "CIS 5.4 | CIS 6.2",
      "iso_27001": "A.9.4.2 | A.12.6.1"
    }
  }
}
```
