# 20. Security Posture and Vulnerability Analysis

## Purpose
This document details the defensive controls, threat mitigations, and security boundaries implemented across the project.

---

## 1. Security Controls and Mitigations

| Threat Vector | Mitigation Strategy | Verification Method |
| :--- | :--- | :--- |
| **Credential Leakage** | All secrets in `.env` and `credentials/` excluded via `.gitignore`. Sanitized API responses. | Git pre-commit checks and automated adapter tests. |
| **SQL Injection** | Parameterized queries using SQLAlchemy ORM; no dynamic SQL string concatenation. | Database unit test suite. |
| **Malformed Ingest Crashes** | Pydantic model validation and isolated batch error recording (Module 1). | `test_batch_validation_error_isolation` |
| **Privilege Escalation** | Server-side role enforcement via FastAPI dependencies (`require_admin`, `require_pro_tier`). | `test_admin_audit_logs_endpoint` |
| **Cross-Origin Attacks** | Configured FastAPI CORS middleware with origin control. | API security review. |
| **Webhook Spoofing** | Cryptographic HMAC-SHA256 signature verification on billing endpoints. | Webhook integration tests. |

---

## 2. Cloud Least-Privilege Design

- **AWS**: Restricted to `sts:GetCallerIdentity` and `cloudtrail:LookupEvents`.
- **Azure**: App registration limited to Microsoft Graph read permissions without write access.
- **GCP**: Service account limited to `roles/logging.viewer` and `roles/viewer`.
- **OCI**: Read-only audit log inspection.

---

## 3. Academic Prototype Limitations

1. **Local Authentication**: Uses database-backed session headers (`X-User-ID`) for evaluation simplicity. Production systems should use signed JWT tokens with short TTLs and an external OAuth2 / OIDC identity provider.
2. **Secrets Storage**: Local files (`.env`, JSON keys) are used for local testing. Production deployments should use cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager).
