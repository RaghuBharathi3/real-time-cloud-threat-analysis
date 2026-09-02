# 15. Real-Time Processing and Stream Engine Architecture

## Purpose
This document provides the technical specification for the real-time stream engine, multi-cloud telemetry ingestion pipeline, thread-safe state machine, authoritative metrics aggregation, and observability mechanisms in the **AI-based Framework for Security Risk Evaluation in Multi-Cloud Environments**.

---

## 1. System Overview and Architectural Role

The **StreamEngine** ([`backend/app/core/stream_engine.py`](file:///c:/Users/Windows/Documents/cloud/backend/app/core/stream_engine.py)) serves as the authoritative backend source of truth for all real-time security telemetry ingestion. It decouples event collection from client rendering, enforces single-worker concurrency, calculates fleet-wide metrics, tracks seven discrete pipeline stages, and maintains a rolling structured activity timeline.

```
[ Multi-Cloud Adapters / Synthetic Generator ]
                     │
                     ▼
             ┌───────────────┐
             │ StreamEngine  │ ◄─── State Machine (IDLE / RUNNING / STOPPED)
             └───────┬───────┘
                     │
     ┌───────────────┼───────────────┬───────────────┐
     ▼               ▼               ▼               ▼
[ Module 1 ]    [ Module 2 ]    [ Module 3 ]    [ Risk Engine ]
  Schema          Feature         Random           0-100 Score
Validation      Extraction        Forest          + Compliance
     │               │               │               │
     └───────────────┼───────────────┴───────────────┘
                     ▼
             [ SQLite Database ] ◄── Deduplication & Idempotency
                     │
                     ▼
     [ Stream Status API / Dashboard ] ◄── Synchronized State
```

---

## 2. Stream State Machine

The streaming engine operates under a deterministic, thread-safe state machine guarded by a reentrant `threading.Lock()` and a `threading.Event()` stop signal.

```
                  ┌─────────┐
         ┌───────►│  IDLE   │◄─────────┐
         │        └───┬─────┘          │
         │            │                │
         │            │ start()        │ reset()
 reset() │            ▼                │
         │      ┌───────────┐          │
         │      │ STARTING  │          │
         │      └─────┬─────┘          │
         │            │ thread active  │
         │            ▼                │
         │      ┌───────────┐          │
         │      │  RUNNING  │          │
         │      └─────┬─────┘          │
         │            │                │
         │            │ stop()         │
         │            ▼                │
         │      ┌───────────┐          │
         │      │ STOPPING  │          │
         │      └─────┬─────┘          │
         │            │ thread joined  │
         │            ▼                │
         │      ┌───────────┐          │
         └──────┤  STOPPED  ├──────────┘
                └───────────┘
```

### State Definitions

| State | Description | Active Worker | Allowed Next Transitions |
| :--- | :--- | :--- | :--- |
| `IDLE` | Clean initial state. Counters at 0, no session active. | No | `STARTING` |
| `STARTING` | Initializing session ID and spawning background thread. | Initializing | `RUNNING`, `ERROR` |
| `RUNNING` | Ingesting and processing events at configured interval. | Yes | `STOPPING`, `ERROR` |
| `STOPPING` | Signaling stop event and joining background thread. | Joining | `STOPPED`, `ERROR` |
| `STOPPED` | Stream paused. Metrics, events, and session ID preserved. | No | `STARTING`, `RESETTING` |
| `RESETTING` | Worker stopped, counters zeroed, buffers purged. | No | `IDLE` |
| `ERROR` | Fault encountered during streaming execution. | No | `RESETTING`, `STARTING` |

---

## 3. Stop vs Reset Operational Distinction

| Dimension | STOP STREAM (`POST /api/v1/stream/stop`) | RESET STREAM (`POST /api/v1/stream/reset`) |
| :--- | :--- | :--- |
| **Worker Thread** | Signaled and joined cleanly | Signaled and joined cleanly |
| **Session ID** | **Preserved** (e.g., `STREAM-20260902-140000`) | **Cleared** (`None`) |
| **Stream Duration** | Pauses timer at final duration | Resets timer to `00:00:00` |
| **Session Counters** | **Preserved** (Events, Threats, Critical, Avg Risk) | **Zeroed** (`0`, `0.0`) |
| **Session Buffers** | **Preserved** (Events list, Activity logs) | **Cleared** (`[]`) |
| **Pipeline Stages** | Set to `IDLE` ("Stream stopped") | Set to `IDLE` ("Ready for new stream") |
| **Historical Database** | **Preserved** (Database untouched) | **Preserved** (Database untouched) |

---

## 4. Pipeline Stage Tracker (7 Stages)

The stream engine explicitly tracks each event's progression across seven isolated processing stages:

| # | Stage Identifier | Component | Description |
| :--- | :--- | :--- | :--- |
| **1** | `collection` | Cloud Ingestion Adapter | Normalizes raw provider payloads (AWS, Azure, GCP, OCI) into canonical schema. |
| **2** | `validation` | Module 1 Schema Validator | Validates constraints using Pydantic `SecurityEvent` model. |
| **3** | `preprocessing` | Module 2 Preprocessor | Extracts 6-feature numerical vector (`failed_attempts`, `frequency`, `ip`, `user_risk`, `resource_sens`, `time_anomaly`). |
| **4** | `ml_classification`| Module 3 Classifier | Generates multi-class threat probabilities using trained Random Forest model. |
| **5** | `risk_engine` | Deterministic Risk Engine | Calculates composite risk score (0-100) and compiles compliance playbooks. |
| **6** | `database` | SQLite Persistence Layer | Performs idempotent persistence and deduplication on `event_id`. |
| **7** | `dashboard` | Client Telemetry Stream | Dispatches updated status and KPIs to UI clients over REST heartbeat. |

---

## 5. Authoritative Metrics Mathematical Formulation

### 1. Rolling Average Risk Score
$$\text{Average Risk} = \frac{\sum_{i=1}^{N} \text{RiskScore}_i}{N}$$
Where $N = \text{events\_processed}$. When $N = 0$, $\text{Average Risk} = 0.0$.

### 2. Processing Throughput (Events per Second)
$$\text{Throughput (eps)} = \frac{K}{\max(1.0, t_{\text{now}} - t_{\text{oldest}})}$$
Calculated over a rolling 10-second window containing $K$ event timestamps.

### 3. Threat Detection Rate
$$\text{Threat Rate (\%)} = \left( \frac{\text{threats\_detected}}{\text{events\_processed}} \right) \times 100$$

---

## 6. Technical Activity Timeline

The stream engine maintains a structured 50-entry ring buffer recording chronological events:

```json
{
  "id": 42,
  "timestamp": "14:32:01",
  "stage": "ML_MODEL",
  "level": "INFO",
  "message": "Classified threat as 'Brute-Force' with 94.2% confidence",
  "event_id": "EVT-AWS-BF-901"
}
```

Stage labels: `STREAM`, `COLLECTION`, `VALIDATION`, `PREPROCESSING`, `ML_MODEL`, `RISK_ENGINE`, `DATABASE`.  
Level labels: `INFO` (blue), `WARN` (amber), `ERROR` (red).

---

## 7. Stream API Endpoints Reference

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/stream/status` | `GET` | Public | Returns state, session ID, duration, KPIs, stage states, and activity logs. |
| `/api/v1/stream/start` | `POST` | Admin | Starts single background worker thread at requested interval (e.g. `?interval=2.0`). |
| `/api/v1/stream/stop` | `POST` | Admin | Cleanly stops background worker; preserves all metrics and session data. |
| `/api/v1/stream/reset` | `POST` | Admin | Resets all session metrics, clears timeline, and returns state machine to `IDLE`. |
| `/api/v1/stream/events` | `GET` | Admin | Returns list of security alerts processed during current stream session. |
| `/api/v1/stream/activity` | `GET` | Admin | Returns rolling activity timeline log entries. |
| `/api/v1/stream/clear-demo-data` | `POST` | Admin | Deletes all records where `source_mode == 'DEMO'`, preserving real cloud records. |

---

## 8. State Recovery and Persistence

When a user refreshes the browser while a stream is running:
1. The frontend immediately queries `GET /api/v1/stream/status`.
2. The response contains `status: "RUNNING"`, the active `session_id`, elapsed `duration_seconds`, and accumulated metrics.
3. The UI seamlessly binds to the active stream without duplicate thread creation or state loss.
