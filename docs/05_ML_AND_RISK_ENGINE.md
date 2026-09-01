# 05. Machine Learning and Risk Scoring Engine

## Purpose
This document details the Random Forest threat classification model, the deterministic risk scoring algorithm, and the compliance framework mapping methodology.

---

## 1. Machine Learning Model

- **Algorithm**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
- **Hyperparameters**: `n_estimators=50`, `random_state=42`
- **Training Data**: `data/raw/security_events.csv` (1,200 labeled events)
- **Evaluation Data**: `data/raw/security_events_eval.csv` (300 labeled events)
- **Saved Binaries**: `backend/models/threat_detector.joblib`

### Feature Dimensions
1. `failed_attempts` (Numeric)
2. `request_frequency` (Numeric)
3. `is_login` (Binary)
4. `is_sensitive_resource` (Binary)
5. `is_unusual_location` (Binary)
6. `is_api_or_resource_access` (Binary)

### Performance Metrics
- **Accuracy**: >95%
- **Macro F1 Score**: >0.90
- **Target Classes**: `normal`, `brute_force`, `unauthorized_access`

---

## 2. Risk Scoring Engine

The risk engine generates an explainable integer score from 0 to 100 based on machine learning probability, asset sensitivity, and origin anomaly.

### Severity Boundaries
- `0 to 29`: **LOW** (Standard routine activity)
- `30 to 59`: **MEDIUM** (Minor deviations or elevated request rates)
- `60 to 79`: **HIGH** (Suspicious activity on sensitive resources or foreign IPs)
- `80 to 100`: **CRITICAL** (Multi-attempt credential attacks or severe policy breaches)

### Scoring Formulations

1. **Normal Events**:
   $$\text{Score} = \min(29, \max(5, 10 + \min(15, 5 \times \text{failed}) + 10 \times \mathbb{I}_{\text{freq}>10} + 5 \times \mathbb{I}_{\text{unusual}}))$$

2. **Brute Force Events**:
   $$\text{Score} = \min(100, \max(60, 65 + \lfloor 20 \times \text{Confidence} \rfloor + \min(15, 2 \times \text{failed})))$$

3. **Unauthorized Access Events**:
   $$\text{Score} = \min(100, \max(60, 60 + \lfloor 20 \times \text{Confidence} \rfloor + 10 \times \mathbb{I}_{\text{sensitive}} + 5 \times \mathbb{I}_{\text{unusual}} + \min(5, \lfloor\text{freq}/5\rfloor)))$$

---

## 3. Compliance Framework Mapping Engine

Threat classifications are automatically mapped to corresponding controls in major security standards:

| Threat Category | NIST CSF 2.0 Controls | CIS Controls v8 | ISO/IEC 27001:2022 | Actionable Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **Brute Force** | PR.AA-01 (Identity Mgmt)<br>DE.CM-01 (Continuous Monitoring) | CIS 5.4 (Enforce MFA)<br>CIS 6.2 (Access Monitoring) | A.9.4.2 (Secure Log-on)<br>A.12.6.1 (Vulnerability Mgmt) | Enforce MFA, trigger immediate password reset, and block source IP. |
| **Unauthorized Access** | PR.AC-04 (Least Privilege)<br>RS.AN-01 (Incident Analysis) | CIS 3.11 (Data Protection)<br>CIS 6.8 (Privileged Access) | A.9.4.1 (Access Restriction)<br>A.13.1.1 (Network Controls) | Revoke abnormal IAM session, quarantine host, and rotate cryptographic keys. |
| **Normal Event** | DE.AE-01 (Baseline Telemetry) | CIS 8.2 (Audit Retention) | A.12.4.1 (Event Logging) | Maintain baseline audit log retention policies. |
