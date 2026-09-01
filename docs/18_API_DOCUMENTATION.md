# 18. REST API Reference

## Purpose
This document provides the specification for all REST API endpoints exposed by the FastAPI backend at `http://127.0.0.1:8000/api/v1/`.

---

## 1. System Health and Cloud Endpoints

### `GET /api/v1/health`
- **Purpose**: System health status and non-sensitive cloud provider overview.
- **Authentication**: None.
- **Response**:
```json
{
  "status": "healthy",
  "demo_mode": false,
  "cloud_providers": {
    "aws": { "configured": true, "region": "ap-south-1" },
    "azure": { "configured": true, "subscription_configured": true },
    "gcp": { "configured": true, "project_id": "...", "key_file_found": true },
    "oci": { "configured": false, "key_file_found": false }
  },
  "timestamp": "2026-09-01T14:00:00Z"
}
```

### `GET /api/v1/cloud/status?refresh={bool}`
- **Purpose**: Returns real-time connection status and metrics for all cloud adapters.
- **Header**: `X-User-ID`

### `POST /api/v1/cloud/test-connection/{provider}`
- **Purpose**: Runs live credential verification for `aws`, `azure`, `gcp`, or `oci`.
- **Header**: `X-User-ID`

### `POST /api/v1/cloud/sync/{provider}?limit={int}`
- **Purpose**: Ingests audit logs from the specified cloud provider.
- **Access**: Pro Tier or Admin (`X-User-ID`)

---

## 2. Pipeline Execution Endpoints

### `POST /api/v1/pipeline/run`
- **Purpose**: Ingests and processes a security event dictionary through Modules 1, 2, 3, and the Risk Engine.
- **Access**: Free Tier for AWS; Pro Tier for Azure, GCP, and OCI.

### `POST /api/v1/pipeline/demo-scenario/{scenario_name}`
- **Purpose**: Ingests one of 5 deterministic presentation scenarios.
- **Header**: `X-User-ID`

### `POST /api/v1/pipeline/simulate-next`
- **Purpose**: Pulls and evaluates a sampled event from `security_events_eval.csv`.
- **Access**: Admin Role (`usr_admin`)

---

## 3. Alerts and Model Management

### `GET /api/v1/alerts?limit={int}`
- **Purpose**: Retrieves evaluated alerts with risk scores and compliance recommendations.
- **Header**: `X-User-ID`

### `GET /api/v1/model/metrics`
- **Purpose**: Returns accuracy, macro F1, confusion matrix, and feature importances.
- **Header**: `X-User-ID`

### `POST /api/v1/model/train`
- **Purpose**: Retrains and persists the Random Forest model to disk.
- **Access**: Admin Role (`usr_admin`)

---

## 4. Administration and Billing

### `GET /api/v1/admin/audit-logs`
- **Purpose**: Returns system administrative audit logs.
- **Access**: Admin Role (`usr_admin`, HTTP 403 for other roles).

### `POST /api/v1/billing/checkout`
- **Purpose**: Generates a mock subscription upgrade order.
- **Header**: `X-User-ID`

### `POST /api/v1/billing/webhook`
- **Purpose**: Validates HMAC-SHA256 signature and upgrades user to Pro tier.
- **Header**: `X-Mock-Signature: <hex_hmac>`
