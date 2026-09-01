# 04. Data Pipeline & Canonical Schema

## 1. End-to-End Data Lifecycle

Every security event traverses the identical data pipeline regardless of whether it originates from live cloud APIs, diagnostic scripts, or the demo generator:

```
[Cloud Audit Telemetry (AWS CloudTrail / Azure Activity / GCP Audit / OCI Guard)]
                               │
                               ▼
            [Cloud Adapter Normalization Layer]
                               │
                               ▼
        [Canonical Security Event Schema (Pydantic)]
                               │
                               ▼
            [Module 1: Strict Validation Engine]
                               │
                               ▼
      [Module 2: Multi-Cloud Feature Engineering]
                               │
                               ▼
    [Module 3: Random Forest ML Inference & Scoring]
                               │
                               ▼
      [Compliance Recommendation & Risk Profiling]
                               │
                               ▼
            [SQLite / PostgreSQL Persistence]
                               │
                               ▼
       [Real-Time Security Operations Dashboard]
```

---

## 2. Canonical Security Event Schema

To reconcile schema differences across cloud providers, the platform translates all audit records into the Canonical Security Event model:

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `event_id` | `str` | Unique event tracking identifier | `EVT_AWS_83041` |
| `timestamp` | `str` | ISO 8601 formatted UTC timestamp | `2026-09-01T14:30:00Z` |
| `cloud_provider`| `str` | Cloud identifier (`aws`, `azure`, `gcp`, `oci`) | `aws` |
| `user_id` | `str` | Principal, service account, or IAM user | `admin_secops` |
| `event_type` | `str` | Operation category (`login`, `resource_access`, `api_call`) | `login` |
| `ip_address` | `str` | Valid IPv4 source address | `198.51.100.42` |
| `location` | `str` | Country code origin | `US` |
| `failed_attempts`| `int` | Failed login count | `0` |
| `resource` | `str` | Target cloud resource ARN, URI, or bucket name | `s3_bucket_finance` |
| `request_frequency`| `int` | Request velocity count in 1 minute | `3` |

---

## 3. Provider-Specific Translation Examples

### AWS CloudTrail Mapping:
- `EventId` $\rightarrow$ `event_id`
- `EventTime` $\rightarrow$ `timestamp`
- `Username` $\rightarrow$ `user_id`
- `EventName == "ConsoleLogin"` $\rightarrow$ `event_type = "login"`
- `CloudTrailEvent.sourceIPAddress` $\rightarrow$ `ip_address`
- `Resources[0].ResourceName` $\rightarrow$ `resource`

### Azure Activity Log Mapping:
- `id` $\rightarrow$ `event_id`
- `eventTimestamp` $\rightarrow$ `timestamp`
- `caller` $\rightarrow$ `user_id`
- `operationName.value` $\rightarrow$ `event_type = "resource_access"` / `resource`
- `callerIpAddress` $\rightarrow$ `ip_address`

### GCP Cloud Audit Log Mapping:
- `insertId` $\rightarrow$ `event_id`
- `timestamp` $\rightarrow$ `timestamp`
- `protoPayload.authenticationInfo.principalEmail` $\rightarrow$ `user_id`
- `protoPayload.methodName` $\rightarrow$ `event_type`
- `protoPayload.requestMetadata.callerIp` $\rightarrow$ `ip_address`
- `protoPayload.resourceName` $\rightarrow$ `resource`

### Oracle Cloud Guard Mapping:
- `eventID` $\rightarrow$ `event_id`
- `data.identity.principalName` $\rightarrow$ `user_id`
- `data.eventName` $\rightarrow$ `event_type`
- `data.request.callerIp` $\rightarrow$ `ip_address`
- `data.resourceName` $\rightarrow$ `resource`
