# Common Event Schema Documentation

This schema defines the structured JSON/CSV format representing cloud security events, agreed upon by **Module 1 (Collection)**, **Module 2 (Preprocessing)**, and **Module 3 (Detection)**.

---

## 1. Schema Fields & Origin

This table documents the schema fields, their data types, and distinguishes between **Raw Log Attributes** (directly extracted from cloud provider logs) and **Enriched/Aggregated Features** (computed at the Ingestion Gateway).

| Field Name | Data Type | Meaning | Required | Origin / How it is Derived |
| :--- | :--- | :--- | :--- | :--- |
| `event_id` | String | A unique identifier for the event (e.g., `EVT00001`). | Yes | **Raw Log Attribute**: Extracted directly from `eventID` (AWS CloudTrail) or `insertId` (GCP Audit Logs). |
| `timestamp` | String | ISO 8601 formatted timestamp of the event (e.g., `2026-08-27T22:30:00`). | Yes | **Raw Log Attribute**: Extracted directly from `eventTime` (AWS) or `timestamp` (GCP). |
| `user_id` | String | The identifier of the IAM user/role initiating the event. | Yes | **Raw Log Attribute**: Parsed from the `userIdentity` block (AWS ARN/userName) or `authenticationInfo.principalEmail` (GCP). |
| `event_type` | String | The category of activity: `login`, `resource_access`, or `api_call`. | Yes | **Raw Log Attribute**: Mapped from the raw `eventName` (e.g., `ConsoleLogin` -> `login`, `GetObject` -> `resource_access`). |
| `ip_address` | String | Source IPv4 address of the actor. | Yes | **Raw Log Attribute**: Extracted directly from `sourceIPAddress` (AWS) or `requestMetadata.callerIp` (GCP). |
| `location` | String | Geographic origin of the request (e.g., `US`, `CN`, `Unknown`). | No | **Enriched Feature**: **Not in raw logs**. Resolved by the Ingestion Gateway using a GeoIP database lookup (e.g., MaxMind GeoIP2) on the source `ip_address`. |
| `failed_attempts` | Integer | Count of failed authentication attempts in the current session. | Yes | **Aggregated Feature**: **Not in raw logs**. Computed at ingestion by checking a stateful window cache (e.g. Redis) for recent failed login logs from the same user/IP. |
| `resource` | String | Target cloud resource (e.g., `cloud_console`, `s3_bucket_finance`). | Yes | **Raw Log Attribute**: Extracted from request parameters (e.g. `requestParameters.bucketName` or `resourceName`). |
| `request_frequency` | Integer | Requests sent in the last 1 minute window from this user/IP. | Yes | **Aggregated Feature**: **Not in raw logs**. Computed using sliding-window counts in the ingestion queue. |

---

## 2. Ingestion-Time Enrichment Pipeline

To map raw cloud logs to our common schema, the Module 1 Ingestion Gateway performs the following transformations:

```
Raw Cloud Audit Log (AWS/GCP)
       │
       ├──► 1. Field Extraction (event_id, timestamp, user_id, event_type, ip_address, resource)
       │
       ├──► 2. GeoIP Resolution (ip_address ➔ location via MaxMind lookup)
       │
       ├──► 3. Stateful Login Tracking (checks state cache to count consecutive console failed logins)
       │
       └──► 4. Rate Aggregator (counts events in sliding 1-minute window to compute request_frequency)
               │
               ▼
      Standardized Schema Output (Module 2 Input)
```
