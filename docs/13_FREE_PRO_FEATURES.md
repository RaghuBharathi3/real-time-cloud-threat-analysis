# 13. Free vs. Pro Feature Gating & Subscription Model

This document outlines the capability separation between the Free standard tier and Pro enterprise subscription.

---

## 1. Feature Comparison Matrix

| Feature / Capability | Free Standard Tier | Pro Enterprise Tier |
| :--- | :--- | :--- |
| **Cloud Provider Access** | **AWS Only** | **AWS + Azure + GCP + OCI** |
| **Daily Ingestion Limit** | 100 events / day | Unlimited event throughput |
| **Threat Detection Model** | Random Forest verdict | Random Forest + Risk Score (0–100) |
| **Compliance Mappings** | Basic posture check | **NIST CSF 2.0, CIS Controls v8, ISO 27001** |
| **Deep Feature Vector Inspector** | Raw logs only | Engineered features + Diagnostic reasons |
| **Continuous Log Simulation** | Locked (Admin only) | Unlocked for continuous real-time analysis |
| **Admin Audit Trail** | Restricted | Full access (if role is Admin) |

---

## 2. Server-Side Enforcement

Access control is enforced on the server via `UserProfile.is_pro`. The client UI reflects tier restrictions dynamically by disabling Pro-only sync buttons and displaying clear upgrade notifications.

```
Free User (is_pro = 0) ──> Attempts Azure / GCP Sync ──> Backend returns HTTP 403 Forbidden
```

---

## 3. Upgrading to Pro (Local Simulation)

Users can upgrade from Free to Pro directly in the **Billing & Tiers** tab:
1. Initiates checkout order (`POST /api/v1/billing/checkout`).
2. Generates an HMAC-SHA256 signature payload.
3. Sends a verified webhook callback (`POST /api/v1/billing/webhook`).
4. Updates user record to `is_pro = 1` and logs an entry in the system audit trail.
