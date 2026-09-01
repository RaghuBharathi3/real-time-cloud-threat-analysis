# 13. Free vs. Pro Feature Comparison and Tier Gating

## Purpose
This document specifies the capability differences between the Free standard tier and the Pro enterprise tier.

---

## 1. Feature Comparison Matrix

| Feature | Free Tier | Pro Tier |
| :--- | :--- | :--- |
| Cloud Provider Ingestion | AWS Only | AWS, Azure, GCP, OCI |
| Daily Event Ingestion Limit | 100 events / day | Unlimited throughput |
| Threat Detection Model | Random Forest classification | Random Forest + Risk Score (0 to 100) |
| Compliance Recommendations | Basic posture check | NIST CSF 2.0, CIS Controls v8, ISO/IEC 27001 |
| Deep Feature Inspector | Raw fields only | 6-feature vector + diagnostic reasoning |
| Continuous Log Stream | Disabled | Enabled |
| Admin Audit Trail | Restricted | Available (for Admin role) |

---

## 2. Server-Side Enforcement

Tier gating is enforced via the `UserProfile.is_pro` database column. If a Free tier user requests a Pro feature (e.g. syncing Azure or GCP logs), the backend responds with HTTP 403 Forbidden.

---

## 3. Tier Upgrade Workflow (Local Simulation)

1. User initiates upgrade order (`POST /api/v1/billing/checkout`).
2. Client computes Web Crypto HMAC-SHA256 signature.
3. Client dispatches verified webhook (`POST /api/v1/billing/webhook`).
4. Server updates user record to `is_pro = 1` and logs `PLAN_UPGRADE` in the audit log.
