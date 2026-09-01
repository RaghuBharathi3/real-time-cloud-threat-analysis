# 18. REST API Reference & Endpoint Documentation

The FastAPI backend exposes RESTful endpoints at `http://127.0.0.1:8000/api/v1/`. Interactive Swagger UI documentation is available at `http://127.0.0.1:8000/docs`.

---

## 1. System Health & Cloud Endpoints

### `GET /api/v1/health`
- **Purpose**: Returns backend health status and safe cloud summary.
- **Auth**: Public
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
- **Auth**: User Header `X-User-ID`

### `POST /api/v1/cloud/test-connection/{provider}`
- **Purpose**: Executes live credential validation for `aws`, `azure`, `gcp`, or `oci`.
- **Auth**: User Header `X-User-ID`

### `POST /api/v1/cloud/sync/{provider}?limit={int}`
- **Purpose**: Pulls and normalizes audit logs from the specified cloud provider.
- **Auth**: Pro Tier / Admin (`X-User-ID`)

---

## 2. Pipeline Execution Endpoints

### `POST /api/v1/pipeline/run`
- **Purpose**: Ingests a raw security event dictionary through Modules 1, 2, 3, Risk Engine, and Compliance mapping.
- **Auth**: User Header `X-User-ID` (Pro tier required for non-AWS events).

### `POST /api/v1/pipeline/demo-scenario/{scenario_name}`
- **Purpose**: Ingests deterministic presentation scenario (`aws_brute_force`, `azure_keyvault`, `gcp_storage_burst`, `oci_normal`, `aws_normal`).
- **Auth**: User Header `X-User-ID`

### `POST /api/v1/pipeline/simulate-next`
- **Purpose**: Ingests a random sampled event from `security_events_eval.csv`.
- **Auth**: Admin (`role == "ADMIN"`)

---

## 3. Threat Alerts & Diagnostics

### `GET /api/v1/alerts?limit={int}`
- **Purpose**: Returns list of evaluated security alerts with risk scores and compliance recommendations.
- **Auth**: User Header `X-User-ID`

### `GET /api/v1/model/metrics`
- **Purpose**: Returns Random Forest classifier accuracy, macro F1, confusion matrix, and feature importances.
- **Auth**: User Header `X-User-ID`

### `POST /api/v1/model/train`
- **Purpose**: Retrains and persists the Random Forest classifier on disk.
- **Auth**: Admin (`role == "ADMIN"`)

---

## 4. Admin & Billing Endpoints

### `GET /api/v1/admin/audit-logs`
- **Purpose**: Returns system administrative audit trail.
- **Auth**: Admin (`role == "ADMIN"`, 403 Forbidden for others).

### `POST /api/v1/billing/checkout`
- **Purpose**: Creates a mock subscription upgrade order.
- **Auth**: User Header `X-User-ID`

### `POST /api/v1/billing/webhook`
- **Purpose**: Processes cryptographically verified upgrade webhook.
- **Headers**: `X-Mock-Signature: <hex_hmac>`
