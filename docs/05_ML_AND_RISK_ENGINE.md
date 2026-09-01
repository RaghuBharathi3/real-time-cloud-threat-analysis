# 05. Machine Learning & Risk Scoring Engine

## 1. Machine Learning Model Architecture

- **Algorithm**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
- **Hyperparameters**: `n_estimators=50`, `random_state=42`
- **Trained Artifacts**: `backend/models/threat_detector.joblib`, `backend/models/model_metrics.joblib`
- **Training Dataset**: `data/raw/security_events.csv`
- **Evaluation Dataset**: `data/raw/security_events_eval.csv`

> [!NOTE]
> **Academic Disclaimer**: The ML model is trained and validated on a synthetic multi-cloud security benchmark dataset representing realistic attack patterns (brute force, credential spray, data exfiltration, and unauthorized key access). It is designed for academic evaluation and research prototyping.

---

## 2. Feature Importance & Model Performance

The Random Forest model achieves high classification separation across the 6 engineered features:

| Feature Name | Feature Type | Description |
| :--- | :--- | :--- |
| `failed_attempts` | Numerical | Number of failed authentication attempts |
| `request_frequency` | Numerical | Request frequency per minute |
| `is_login` | Binary (0/1) | Whether event is an authentication attempt |
| `is_sensitive_resource` | Binary (0/1) | Whether resource is high-value / sensitive asset |
| `is_unusual_location` | Binary (0/1) | Whether geographic origin is anomalous |
| `is_api_or_resource_access`| Binary (0/1) | Whether event involves API calls / data access |

### Performance Metrics:
- **Validation Accuracy**: $>95\%$
- **Macro F1 Score**: $>0.90$
- **Target Classes**: `normal`, `brute_force`, `unauthorized_access`

---

## 3. Risk Scoring Engine Methodology

The Risk Engine calculates an explainable integer score from **0 to 100** by synthesizing ML confidence, target asset sensitivity, and anomalous geographic velocity.

### Risk Tier Boundaries:
- `0 – 29` : **LOW** (Standard baseline activity)
- `30 – 59` : **MEDIUM** (Minor deviations or elevated request velocity)
- `60 – 79` : **HIGH** (Suspicious access on sensitive resources or foreign IP origin)
- `80 – 100` : **CRITICAL** (Multi-attempt credential brute-force or high-severity exploit)

### Calculation Formula:
1. **Normal Events**:
   $$\text{Score} = \min(29, \max(5, 10 + \min(15, 5 \times \text{failed}) + 10 \times \mathbb{I}_{\text{freq}>10} + 5 \times \mathbb{I}_{\text{unusual}}))$$
2. **Brute Force Events**:
   $$\text{Score} = \min(100, \max(60, 65 + \lfloor 20 \times \text{Confidence} \rfloor + \min(15, 2 \times \text{failed})))$$
3. **Unauthorized Access Events**:
   $$\text{Score} = \min(100, \max(60, 60 + \lfloor 20 \times \text{Confidence} \rfloor + 10 \times \mathbb{I}_{\text{sensitive}} + 5 \times \mathbb{I}_{\text{unusual}} + \min(5, \lfloor\text{freq}/5\rfloor)))$$

---

## 4. Compliance Framework Mapping Engine

For every detected threat, the compliance engine automatically outputs regulatory mappings and actionable remediation:

| Threat Class | NIST CSF 2.0 Mapping | CIS Controls v8 Mapping | ISO/IEC 27001:2022 Mapping | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Brute Force** | `PR.AA-01` (Identity Mgmt)<br>`DE.CM-01` (Continuous Monitoring) | `CIS 5.4` (Enforce MFA)<br>`CIS 6.2` (Access Control Monitoring) | `A.9.4.2` (Secure Log-on)<br>`A.12.6.1` (Vulnerability Mgmt) | Enforce Multi-Factor Authentication, trigger password reset, and blacklist offending IP. |
| **Unauthorized Access** | `PR.AC-04` (Least Privilege)<br>`RS.AN-01` (Incident Analysis) | `CIS 3.11` (Data Protection)<br>`CIS 6.8` (Privileged Access) | `A.9.4.1` (Access Restriction)<br>`A.13.1.1` (Network Controls) | Review IAM role policies, quarantine originating endpoint, and rotate KMS access keys. |
| **Normal Event** | `DE.AE-01` (Baseline Telemetry) | `CIS 8.2` (Audit Log Retention) | `A.12.4.1` (Event Logging) | Standard baseline telemetry: adhere to normal audit retention policies. |
