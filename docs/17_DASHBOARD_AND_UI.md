# 17. Security Operations Dashboard and UI Specification

## Purpose
This document specifies the layout, state architecture, component hierarchy, visual analytics, and interactive controls of the enterprise **Security Operations & Observability Console** built with React 18, Vite, and custom CSS design system.

---

## 1. Console Layout Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Header: Brand Section | System Status | Session Role Switcher | API Heartbeat           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Stream Control Bar: Status (RUNNING) | Session ID | Duration | Rate | [Start] [Stop]   │
│                     [Reset Stream] [Purge Demo Data] [Deterministic Scenarios ▼]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Authoritative KPI Ribbon (6 Metrics):                                                  │
│   Stream Events | Events Processed | Threats Flagged | Critical Alerts | Avg Risk | eps│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Real-Time Pipeline Stage Visualizer (7 Stages):                                        │
│   01. INGEST ──► 02. NORM ──► 03. MODULE 1 ──► 04. MODULE 2 ──► 05. MODULE 3          │
│   ──► 06. RISK & COMP ──► 07. PERSIST                                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Visual Analytics Grid (4 Interactive Panels):                                          │
│   [ Event Ingress Timeline ]  [ Risk Severity Breakdown ]                              │
│   [ Threat Category Dist ]    [ Multi-Cloud Ingestion % ]                              │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ Live Security Events Feed (Left 55%)      │ Deep Event Diagnostics Inspector (Right 45%)│
│ - Search & Cloud/Severity Filters         │ - Tab 1: 7-Stage Processing Journey        │
│ - Real-Time Interactive Table             │ - Tab 2: 6-Feature Numerical Vector (6D)   │
│ - Source Mode Badges (REAL vs DEMO)       │ - Tab 3: Contributing Risk & Compliance    │
│ - Pagination Controls                     │ - Tab 4: Raw Canonical JSON Payload        │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│ Technical Stream Activity Log & Timeline:                                              │
│ [14:32:01] [COLLECTION] Normalized AWS CloudTrail security event                       │
│ [14:32:01] [VALIDATION] Schema validation passed via Pydantic model                    │
│ [14:32:02] [ML_MODEL]   Classified threat: 'Brute-Force' (94.2% confidence)           │
│ [14:32:02] [RISK_ENGINE] Calculated composite risk score: 88 (CRITICAL)                │
│ [14:32:02] [DATABASE]   Idempotent write committed to database                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Component Specifications

### 1. Stream Operations Toolbar
- **Status Indicator Pill**: Real-time badge with animated pulse when `RUNNING`, solid amber when `STOPPED`, neutral slate when `IDLE`, red when `ERROR`.
- **Session Metadata**: Displays backend-generated session ID (e.g., `STREAM-20260902-143000`) and active duration counter (`HH:MM:SS`).
- **Rate Controller**: Dropdown to adjust streaming frequency (`1.0s`, `2.0s`, `3.5s`, `5.0s`).
- **Lifecycle Action Buttons**:
  - `Start Stream`: Spawns single backend worker thread.
  - `Stop Stream`: Cleanly stops streaming thread while preserving all session metrics and displayed events.
  - `Reset Stream`: Opens confirmation modal, halts worker, zeroes counters, clears timeline, returns to initial clean `IDLE` state.
  - `Purge Demo Data`: Opens confirmation modal, purges only `DEMO` records from database, preserves `REAL` cloud logs.

### 2. Authoritative KPI Ribbon
Displays 6 fleet and stream metrics:
1. **Stream Events**: Ingested events during active session + total database count.
2. **Events Processed**: Successfully validated through all 7 pipeline stages.
3. **Threats Detected**: Threats flagged with real-time detection percentage.
4. **Critical Alerts**: High-risk events (score $\ge 80$).
5. **Mean Stream Risk**: Fleet-wide rolling average risk score.
6. **Throughput (eps)**: Dynamic events-per-second processing throughput.

### 3. Visual 7-Stage Pipeline Flow Visualizer
Renders distinct cards for each architecture stage:
1. `Multi-Cloud Source`: Ingestion from AWS, Azure, GCP, OCI, or Synthetic Generator.
2. `Canonical Mapping`: Normalization into 10-field standard schema.
3. `Module 1 Validation`: Schema validation against Pydantic rules.
4. `Module 2 Preprocessing`: Extraction of 6-dimensional numerical feature vector.
5. `Module 3 ML Classifier`: Multi-class probability prediction via Random Forest.
6. `Risk & Compliance Engine`: Calculation of 0-100 composite risk score + NIST/CIS/ISO mapping.
7. `Idempotent Database`: SQLite persistence and event deduplication.

### 4. Visual Analytics Grid
1. **Ingress Rate & Activity**: Rolling visual sparkline showing recent event volume and risk severity levels.
2. **Risk Severity Distribution**: Stacked progress bar with counts for `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
3. **Threat Category Breakdown**: Stacked progress bar with counts for `Brute-Force`, `Unauthorized Access`, `Normal Operations`.
4. **Multi-Cloud Ingestion Breakdown**: Color-coded distribution across `AWS`, `Azure`, `GCP`, `OCI`, `Demo`.

### 5. Split View: Security Events Feed + Deep Diagnostics
- **Live Event Table**:
  - Filter by Cloud Provider (`ALL`, `AWS`, `AZURE`, `GCP`, `OCI`).
  - Filter by Severity (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Filter by Source Mode (`ALL`, `REAL`, `DEMO`).
  - Text search by User ID, Event ID, IP, or Resource.
- **Deep Event Diagnostics**:
  - `7-Stage Journey`: Step-by-step trace showing the path of the selected event.
  - `Feature Vector (6D)`: Exact extracted numerical features.
  - `Risk & Compliance`: Explainable risk factor breakdown and NIST CSF / CIS Benchmark playbooks.
  - `Raw JSON`: Full canonical JSON payload with copy-to-clipboard action.

### 6. Technical Activity Timeline Terminal
- Monospace feed displaying recent pipeline activity with timestamps, stage badges (`STREAM`, `COLLECTION`, `VALIDATION`, `ML_MODEL`, `RISK_ENGINE`, `DATABASE`), severity levels (`INFO`, `WARN`, `ERROR`), and structured messages.

---

## 3. UI State Management and React Lifecycle

- **Polling Heartbeat**: Synchronized polling loop fetches `/api/v1/stream/status` every 1.5 seconds during active streaming and every 4.0 seconds during idle state.
- **State Recovery**: On page reload or tab switch, the UI automatically queries stream status and rebinds to active stream session without state loss or duplicate background threads.
