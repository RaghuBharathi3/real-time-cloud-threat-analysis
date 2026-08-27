# Common Event Schema Documentation

This schema defines the structured JSON/CSV format representing cloud security events, agreed upon by **Module 1 (Collection)**, **Module 2 (Preprocessing)**, and **Module 3 (Detection)**.

## Schema Fields

| Field Name | Data Type | Meaning | Required | Used By |
| :--- | :--- | :--- | :--- | :--- |
| `event_id` | String | A unique identifier for the event (e.g., `EVT00001`). | Yes | Module 1 (ingestion & tracking) |
| `timestamp` | String | ISO 8601 formatted timestamp of the event (e.g., `2026-08-27T22:30:00`). | Yes | Module 2 (timestamp standardisation) |
| `user_id` | String | The identifier of the IAM user/role initiating the event. | Yes | Module 2 (identity tracking) |
| `event_type` | String | The category of activity: `login`, `resource_access`, or `api_call`. | Yes | Module 2 & 3 (feature encoding) |
| `ip_address` | String | Source IPv4 address of the actor. | Yes | Module 2 (IP validation & anomaly checks) |
| `location` | String | Geographical origin of the request (e.g., `US`, `CN`, `Unknown`). | No | Module 2 & 3 (unusual location detection) |
| `failed_attempts` | Integer | Count of failed authentication attempts in the current session. | Yes | Module 2 & 3 (brute-force features) |
| `resource` | String | The cloud resource identifier target (e.g., `cloud_console`, `s3_bucket_finance`). | Yes | Module 2 & 3 (abnormal resource access) |
| `request_frequency` | Integer | Requests sent in the last 1 minute window from the user/IP. | Yes | Module 2 & 3 (frequency-based detection) |
