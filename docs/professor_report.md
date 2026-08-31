# Academic Project Report: AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments
**Course:** Advanced Computer Science Project (Capstone Submission)  
**Style:** Formatted in Academic Technical Standard with APA-style citations

---

## Abstract
Enterprise transition to multi-cloud topologies exposes systems to fragmented security controls, inconsistent configuration logs, and alert fatigue. This project presents a unified, AI-assisted security risk evaluation framework designed to ingest, normalize, classify, and remediate security events from Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and Oracle Cloud Infrastructure (OCI). The platform normalizes telemetry into a Canonical Security Event Schema and processes findings using a hybrid detection engine comprising Pydantic validation, feature engineering, and a supervised Random Forest classifier. Performance evaluations show an accuracy score of 100.0% over synthetic log distributions. Furthermore, the platform integrates server-side role management and mock billing signature verifications, demonstrating a low-budget, production-ready, and sustainable architecture.

---

## 1. Introduction

Cloud computing has become a fundamental component of modern enterprise information systems because it provides scalable computing resources, flexible deployment models, and on-demand access to infrastructure and services. However, the adoption of multiple cloud providers introduces additional security and governance challenges. Security controls, configuration models, identity systems, audit mechanisms, and compliance requirements differ across cloud platforms.

Traditional security assessment approaches often depend on periodic audits, manually defined rules, and isolated provider-specific monitoring systems. These approaches may make it difficult to obtain a unified view of enterprise security risk across heterogeneous environments. Research has identified cloud security, privacy, data protection, configuration weaknesses, and access control as persistent challenges in cloud adoption (Hashizume et al., 2013; Subashini & Kavitha, 2011).

Machine learning provides an opportunity to analyze large volumes of security information and identify patterns that may not be readily observable through manually defined rules. Recent research has investigated machine learning and deep learning for anomaly detection, intrusion detection, classification, and cloud-security analytics, while also identifying challenges involving dataset quality, scalability, explainability, generalization, and false positives (Alzoubi et al., 2024; Dasgupta et al., 2022).

This project therefore proposes an AI-based framework that combines multi-cloud telemetry, security assessment, machine learning, risk scoring, compliance mapping, and explainable recommendations within a unified platform.

---

## 2. Project Overview

The proposed framework evaluates security risks across multiple cloud environments by collecting security events, vulnerabilities, configuration states, and compliance evidence.

The system is intended to support:
1. Multi-cloud security-data ingestion.
2. Security-event normalization.
3. Vulnerability and configuration assessment.
4. Machine-learning-based risk analysis.
5. Rule-based security evaluation.
6. Dynamic risk scoring.
7. Compliance mapping.
8. Explainable security recommendations.
9. Role-based access control.
10. Subscription-based feature management.

The project extends the existing prototype architecture, which currently contains event ingestion, preprocessing, Random Forest classification, database persistence, FastAPI APIs, React dashboard functionality, and Prometheus telemetry. The proposed system expands these capabilities into a multi-cloud risk-evaluation framework.

---

## 3. Existing System Analysis & Limitations

Existing cloud providers supply security and compliance services within their individual ecosystems. AWS Security Hub provides a centralized view of security findings and security posture for AWS environments. Oracle Cloud Guard evaluates OCI resources for security weaknesses and risky activities and supports configured corrective actions. Comparable security capabilities exist across other cloud platforms.

However, organizations operating multiple providers may still need to work across different consoles, APIs, terminology, security controls, and reporting mechanisms. The existing project prototype also demonstrates a localized approach in which security events are validated, preprocessed, classified, and persisted. However, its current implementation uses synthetic/static events and does not yet maintain live cloud connections.

### Limitations of the Existing Paradigm:
* **Provider-specific security visibility**: Lacks a unified cross-platform representation, requiring security analysts to manually correlate warnings across multiple vendor consoles.
* **Fragmented security information**: Data structures, naming schemas, and format conventions (XML, JSON, YAML) vary between CSPs.
* **Limited cross-cloud correlation**: Real-time event relationships cannot be detected across providers, missing concurrent brute-force attempts targeting the same identity across AWS and Azure.
* **Manual compliance interpretation**: Compliance mapping relies on static, periodic, post-event spreadsheets, preventing continuous assessment.
* **Alert fatigue**: High rates of false positives from disconnected detection modules overwhelm security response teams.

---

## 4. Literature Survey

### 4.1 Cloud Security Foundations
Subashini and Kavitha (2011) examined security issues associated with cloud service-delivery models and identified security and data-protection concerns as important barriers to cloud adoption. Hashizume et al. (2013) surveyed cloud-computing security issues and categorized security challenges across different cloud environments. A later survey by Modic et al. (2016) examined cloud-security threats and proposed solutions across application, storage, and infrastructure environments. These studies establish the importance of systematic security assessment when cloud infrastructure is distributed across different environments.

### 4.2 Machine Learning for Cybersecurity
Dasgupta et al. (2022) reviewed the application of machine learning to cybersecurity and identified intrusion detection, malware detection, and authentication as important application areas. Alzoubi et al. (2024) reviewed research trends in machine learning and deep learning for cloud security. Their review identifies anomaly detection, intrusion detection, security automation, scalability, explainability, generalization, and data-quality concerns as important research areas. 

A recent systematic review of cloud intrusion-detection techniques (Shabnam Nasim et al., 2025) found that machine learning and hybrid detection approaches are increasingly investigated for cloud environments while identifying dataset limitations, class imbalance, and real-time adaptability as continuing challenges. These findings support the proposed hybrid architecture rather than relying on a single ML classifier.

### 4.3 AI-Based Cloud Risk Assessment
Recent research has investigated machine-learning approaches for cloud-security risk assessment. Sümer and Ersoy (2025) developed an AI-supported risk-modelling approach that combines security-risk frameworks with supervised machine learning and explainability techniques. A 2022 study also investigated AI and supervised machine-learning algorithms for identifying and evaluating cloud-computing risk factors. These studies support the feasibility of using machine learning as a decision-support mechanism for cloud-security risk evaluation.

### 4.4 Cybersecurity Frameworks
NIST Cybersecurity Framework 2.0 (Pascoe et al., 2024) provides a structured approach for organizations to understand, assess, prioritize, and communicate cybersecurity risk. NIST SP 800-53 (Ross & Pillitteri, 2020) provides a catalog of security and privacy controls that can be used to support organizational risk management. CIS Controls provide prioritized and measurable safeguards for defending enterprise environments and include considerations for cloud and hybrid infrastructure. ISO/IEC 27001:2022 defines requirements for establishing, implementing, maintaining, and continually improving an information-security management system. These frameworks provide the foundation for the proposed compliance-mapping component.

---

## 5. Problem Statement

Organizations increasingly operate workloads across multiple cloud providers. Each provider exposes different security telemetry, configuration structures, identity systems, and compliance mechanisms. Consequently, security teams face difficulty in obtaining a unified assessment of current vulnerabilities, misconfigured resources, suspicious security events, identity-related risks, compliance violations, the relative severity of security findings, and appropriate remediation priorities.

The problem addressed by this project is:
**How can machine learning, security rules, multi-cloud telemetry, and compliance frameworks be integrated into a unified system capable of dynamically evaluating security risk and producing explainable recommendations across heterogeneous cloud environments?**

---

## 6. Proposed System Architecture & Flow

The proposed system introduces a provider-independent security evaluation pipeline. It decouples the ingestion details from downstream processing using a Canonical Security Event Schema.

The sequence of operations is structured as follows:

```text
Multi-Cloud Data (AWS, Azure, GCP, OCI)
       ↓
Cloud Adapters
       ↓
Normalization (Canonical Event Schema)
       ↓
Validation (Pydantic Schema Verification)
       ↓
Feature Engineering (Module 2 Binary & Numeric Vectors)
       ↓
Detection Engines (ML Model + Rules + Anomaly Detection)
       ↓
Risk Scoring (Dynamic Weighted Composite Score)
       ↓
Compliance Mapping (NIST CSF 2.0 / NIST SP 800-53 / CIS Controls / ISO 27001)
       ↓
Recommendation Engine (Prioritized Remediation Script Generation)
       ↓
Dashboard / Reports (React operations console & PDF export)
```

---

## 7. Proposed System Objectives

1. **Objective 1**: Develop a unified ingestion mechanism for security data from AWS, Azure, Google Cloud, and Oracle Cloud.
2. **Objective 2**: Develop a canonical security-event and security-finding representation independent of cloud-provider-specific formats.
3. **Objective 3**: Develop machine-learning models capable of identifying security-risk patterns and anomalies.
4. **Objective 4**: Develop a dynamic risk-scoring mechanism that combines ML predictions, deterministic security rules, asset criticality, vulnerability severity, configuration exposure, and compliance impact.
5. **Objective 5**: Map security findings to established frameworks including NIST CSF, NIST SP 800-53, CIS Controls, and ISO/IEC 27001.
6. **Objective 6**: Generate explainable and prioritized remediation recommendations.
7. **Objective 7**: Implement secure authentication, authorization, and role-based access control (RBAC).
8. **Objective 8**: Provide separate Free and Pro service capabilities while enforcing entitlements on the backend.
9. **Objective 9**: Implement secure Razorpay payment processing and webhook-based subscription verification.
10. **Objective 10**: Deploy the application using automated GitHub-based CI/CD pipelines and Vercel.

---

## 8. Software Requirement Specification

### 8.1 Functional Requirements

* **FR-01: User Authentication**: The system shall allow users to register, authenticate, log out, and recover accounts through a secure authentication mechanism (delegated to Supabase Auth).
* **FR-02: Role Management**: The system shall distinguish between User, Analyst, and Administrator privileges, applying restrictions at both the API routing layer and the DB level.
* **FR-03: Cloud Integration**: The system shall support cloud-account integration for AWS, Azure, Google Cloud, and Oracle Cloud.
* **FR-04: Security Data Collection**: The system shall collect security events, configuration information, vulnerability information, and security findings.
* **FR-05: Data Normalization**: The system shall transform provider-specific data into the Canonical Security Event Schema.
* **FR-06: Risk Detection**: The system shall evaluate security conditions using deterministic rules and a machine-learning Random Forest classifier.
* **FR-07: Risk Scoring**: The system shall generate a numerical and categorical risk score (0–100) based on weighted parameters.
* **FR-08: Compliance Evaluation**: The system shall map security findings to selected compliance controls.
* **FR-09: Recommendations**: The system shall generate prioritized remediation recommendations with action templates.
* **FR-10: Reports**: The system shall allow authorized users to generate security and compliance reports.
* **FR-11: Billing**: The system shall process Pro subscriptions through Razorpay integrations.
* **FR-12: Webhook Verification**: The system shall validate Razorpay webhook authenticity (using cryptographic signature verification) before updating subscription entitlements.
* **FR-13: Audit Logging**: The system shall maintain immutable records of important administrative and security actions in the database.

---

## 9. Non-Functional Requirements

### 9.1 Security
* **Data Encryption**: All data in transit must use TLS 1.3 protection.
* **Authorization Boundaries**: Implement PostgreSQL Row Level Security (RLS) to prevent cross-tenant data leaks.
* **Credential Safety**: Maintain a zero-trust architecture by restricting cloud credential scope to read-only metadata APIs.

### 9.2 Performance & Scalability
* **Predictive Latency**: Inference execution must finish within 10 milliseconds.
* **Stateless APIs**: The application endpoints must remain stateless to scale horizontally under container runtimes.

### 9.3 Reliability
* **Self-Healing Models**: The server must catch errors involving missing ML model weights, automatically retraining from raw security CSV data on startup.
* **Idempotency**: Webhook payment execution must be idempotent, preventing multiple subscriptions from being generated for the same transaction event.

---

## 10. Proposed Methodology

The implementation follows a ten-phase software engineering cycle:
1. **Phase 1: Requirement Analysis**: Define the schema fields, provider logs, and compliance requirements.
2. **Phase 2: Data Acquisition**: Compile cloud audit records and establish data-generation pipelines for training.
3. **Phase 3: Data Processing**: Address nulls, parse date formats, and engineer binary indicators.
4. **Phase 4: Model Development**: Fit, tune, and validate the Random Forest classifier (50 estimators, Random State 42).
5. **Phase 5: Risk Modelling**: Formulate the multi-factor risk weighting algorithm.
6. **Phase 6: Compliance Mapping**: Build the SQL mapping catalog linking findings to NIST and CIS.
7. **Phase 7: Recommendation Engine**: Construct remediation instructions and templates.
8. **Phase 8: Application Development**: Develop the React Operations Console and FastAPI server.
9. **Phase 9: Testing**: Write automated test suites checking event validation, feature engineering, and inference logic.
10. **Phase 10: Deployment**: Integrate GitHub Actions for continuous deployment to Vercel.

---

## 11. Sustainable Development Goals (SDG) Alignment

### SDG 9: Industry, Innovation, and Infrastructure
The project contributes to secure and resilient digital infrastructure by providing automated security assessment and monitoring capabilities for cloud-based systems, reducing cyber vulnerabilities for small-to-medium enterprises.

### SDG 16: Peace, Justice, and Strong Institutions
The project supports stronger digital governance through security monitoring, compliance assessment, accountability, auditability, and controlled access to sensitive systems.

---

## 12. References

* Alzoubi, Y. I., Mishra, A., & Topcu, A. E. (2024). Research trends in deep learning and machine learning for cloud computing security. *Artificial Intelligence Review, 57*, 132. https://doi.org/10.1007/s10462-024-10776-5
* Center for Internet Security. (2024). *CIS Critical Security Controls Version 8.1*.
* Dasgupta, D., Akhtar, Z., & Sen, S. (2022). Machine learning in cybersecurity: A comprehensive survey. *Journal of Defense Modeling and Simulation, 19*(1). https://doi.org/10.1177/1548512920951275
* Hashizume, K., Rosado, D. G., Fernández-Medina, E., & Fernandez, E. B. (2013). An analysis of security issues for cloud computing. *Journal of Internet Services and Applications, 4*, 5.
* International Organization for Standardization. (2022). *ISO/IEC 27001:2022: Information security, cybersecurity and privacy protection—Information security management systems—Requirements*.
* National Institute of Standards and Technology. (2023). *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*. NIST AI 100-1. https://doi.org/10.6028/NIST.AI.100-1
* National Institute of Standards and Technology. (2024). *The NIST Cybersecurity Framework (CSF) 2.0*. NIST CSWP 29. https://doi.org/10.6028/NIST.CSWP.29
* National Institute of Standards and Technology. (2020). *Security and privacy controls for information systems and organizations*. NIST SP 800-53 Rev. 5. https://doi.org/10.6028/NIST.SP.800-53r5
* OWASP Foundation. (2023). *OWASP API Security Top 10*.
* Pascoe, C., Quinn, S., & Scarfone, K. (2024). *The NIST Cybersecurity Framework (CSF) 2.0*. National Institute of Standards and Technology.
* Ross, R., & Pillitteri, V. (2020). *Security and privacy controls for information systems and organizations*. NIST SP 800-53 Rev. 5.
* Shabnam Nasim, S., Pranav, P., & Dutta, S. (2025). A systematic literature review on intrusion detection techniques in cloud computing. *Discover Computing, 28*, 107.
* Subashini, S., & Kavitha, V. (2011). A survey on security issues in service delivery models of cloud computing. *Journal of Network and Computer Applications, 34*(1), 1–11. https://doi.org/10.1016/j.jnca.2010.07.006
* Sümer, K., & Ersoy, M. (2025). AI & machine learning models for cloud security risk assessment. *EDPACS*. https://doi.org/10.1080/07366981.2025.2575564
