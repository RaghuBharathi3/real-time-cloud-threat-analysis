# 03. Core Security and Machine Learning Modules

## Purpose
This document provides implementation specifications for the three core pipeline modules located in `backend/app/modules/`.

---

## 1. Module 1: Real-Time Event Collection and Validation
- **File**: `backend/app/modules/module1_event_collection.py`
- **Function**: Validates incoming event dictionaries against the canonical security schema and isolates errors in batch operations.

### Validation Rules
- `event_id`: Non-empty string identifier.
- `timestamp`: ISO 8601 string format (`YYYY-MM-DDTHH:MM:SSZ` or with offset).
- `cloud_provider`: Restricted to `aws`, `azure`, `gcp`, or `oci`.
- `user_id`: Target principal or service account identifier.
- `event_type`: Restricted to `login`, `resource_access`, or `api_call`.
- `ip_address`: Valid IPv4 address string validated via regex.
- `location`: ISO 2-letter country code or `Unknown`.
- `failed_attempts`: Integer greater than or equal to 0.
- `resource`: Target cloud resource name or ARN.
- `request_frequency`: Integer greater than or equal to 1.

### Batch Processing
The function `validate_batch_events(raw_events)` returns a tuple of `(valid_events, invalid_records)`. If one log in a batch is malformed, it is recorded in `invalid_records` with an error reason while all valid events proceed without interruption.

---

## 2. Module 2: Data Preprocessing and Feature Engineering
- **File**: `backend/app/modules/module2_preprocessing.py`
- **Function**: Transforms validated events into structured numerical feature vectors for machine learning inference.

### Feature Extraction Definitions
1. `failed_attempts`: Direct numerical integer count of failed authentication attempts.
2. `request_frequency`: Request velocity count per minute.
3. `is_login`: Binary flag (1 if `event_type == "login"`, else 0).
4. `is_sensitive_resource`: Binary flag (1 if the resource matches sensitive multi-cloud assets such as `s3_bucket_finance`, `azure_keyvault`, `gcp_kms`, `oci_vault`, or sensitive keyword substrings, else 0).
5. `is_unusual_location`: Binary flag (1 if location is in the anomalous origin list `["CN", "RU", "KP", "IR", "SY", "UNKNOWN"]`, else 0).
6. `is_api_or_resource_access`: Binary flag (1 if `event_type` is `resource_access` or `api_call`, else 0).

---

## 3. Module 3: Threat Detection and Diagnostics
- **File**: `backend/app/modules/module3_threat_detection.py`
- **Function**: Executes Random Forest classification, computes the 0 to 100 risk score, generates explainable diagnostic reasons, and provides regulatory compliance mappings.

### Classification Categories
- `normal`: Routine authorized activity.
- `brute_force`: Repeated failed login attempts indicating credential attacks.
- `unauthorized_access`: Suspicious access against sensitive cloud assets or from anomalous geolocations.

### Output Structure
```json
{
  "threat_status": "Suspicious",
  "threat_type": "Possible Brute-Force Activity",
  "confidence": 0.95,
  "risk_score": 91,
  "severity": "CRITICAL",
  "reason": [
    "Multiple failed authentication attempts detected (9)",
    "High probability of automated credential stuffing or password spray"
  ],
  "compliance": {
    "actionable_recommendation": "Credential attack detected: enforce Multi-Factor Authentication (MFA) and lock affected IAM principal.",
    "framework_mappings": {
      "nist_csf": "PR.AA-01 | DE.CM-01",
      "cis_controls": "CIS 5.4 | CIS 6.2",
      "iso_27001": "A.9.4.2 | A.12.6.1"
    }
  }
}
```
