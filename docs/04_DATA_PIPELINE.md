# 04. Data Pipeline and Canonical Event Schema

## Purpose
This document specifies the data transformation lifecycle from raw multi-cloud audit logs to the Canonical Event Schema used across the security evaluation pipeline.

---

## 1. Pipeline Stages

```
Raw Cloud Logs (CloudTrail, Activity Logs, Cloud Audit, Cloud Guard)
                         │
                         ▼
        Cloud Adapters Normalization Layer
                         │
                         ▼
       Canonical Security Event Schema (Pydantic)
                         │
                         ▼
         Module 1: Strict Validation Engine
                         │
                         ▼
        Module 2: 6-Dimensional Feature Vector
                         │
                         ▼
       Module 3: Random Forest ML Classification
                         │
                         ▼
            Risk Scoring & Compliance Engine
                         │
                         ▼
        Persistence (SQLite / PostgreSQL)
                         │
                         ▼
         Operations Console Dashboard & API
```

---

## 2. Canonical Security Event Schema

All incoming logs are normalized into this common 10-field structure before processing:

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `event_id` | `str` | Unique tracking identifier | `EVT_AWS_10482` |
| `timestamp` | `str` | ISO 8601 formatted UTC timestamp | `2026-09-01T14:30:00Z` |
| `cloud_provider` | `str` | Cloud identifier (`aws`, `azure`, `gcp`, `oci`) | `aws` |
| `user_id` | `str` | Target principal, user ARN, or service account | `secops_admin` |
| `event_type` | `str` | Standardized category (`login`, `resource_access`, `api_call`) | `login` |
| `ip_address` | `str` | IPv4 source address | `198.51.100.42` |
| `location` | `str` | ISO 2-letter country code or `Unknown` | `RU` |
| `failed_attempts` | `int` | Integer count of consecutive failed logins | `9` |
| `resource` | `str` | Target cloud resource name, bucket, or ARN | `ec2_admin_portal` |
| `request_frequency` | `int` | Requests recorded in a 1-minute interval | `15` |

---

## 3. Provider Schema Mappings

### AWS CloudTrail Normalization
- `eventID` -> `event_id`
- `eventTime` -> `timestamp`
- `userIdentity.userName` -> `user_id`
- `eventName == "ConsoleLogin"` -> `event_type = "login"`
- `sourceIPAddress` -> `ip_address`
- `resources[0].resourceName` -> `resource`

### Azure Activity Log Normalization
- `id` -> `event_id`
- `eventTimestamp` -> `timestamp`
- `caller` -> `user_id`
- `operationName.value` -> `event_type = "resource_access"` / `resource`
- `callerIpAddress` -> `ip_address`

### GCP Cloud Audit Normalization
- `insertId` -> `event_id`
- `timestamp` -> `timestamp`
- `protoPayload.authenticationInfo.principalEmail` -> `user_id`
- `protoPayload.methodName` -> `event_type`
- `protoPayload.requestMetadata.callerIp` -> `ip_address`
- `protoPayload.resourceName` -> `resource`

### Oracle Cloud Guard Normalization
- `eventID` -> `event_id`
- `data.identity.principalName` -> `user_id`
- `data.eventName` -> `event_type`
- `data.request.callerIp` -> `ip_address`
- `data.resourceName` -> `resource`
