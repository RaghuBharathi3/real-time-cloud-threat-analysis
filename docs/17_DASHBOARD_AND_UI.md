# 17. Security Operations Dashboard and UI Specification

## Purpose
This document specifies the layout, state architecture, and interactive controls of the React 18 + Vite frontend console.

---

## 1. Console Layout Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header: Title, Active Session Selector (ADMIN/ANALYST/USER), API Health│
├────────────────────────────────────────────────────────────────────────┤
│ Top Metrics: Total Events | Threats Flagged | Critical | Avg Risk | Conns│
├────────────────────────────────────────────────────────────────────────┤
│ Cloud Cards: AWS Card | Azure Card | GCP Card | OCI Card               │
├────────────────────────────────────────────────────────────────────────┤
│ Scenario Bar: [AWS Attack] [Azure Vault] [GCP Burst] [OCI OK] [AWS OK] │
├────────────────────────────────────────────────────────────────────────┤
│ Navigation: Threat Console | Custom Ingest | Model Metrics | Audit Logs│
├───────────────────────────────────┬────────────────────────────────────┤
│ Live Event Stream (Left 40%)     │ Deep Event Inspector (Right 60%)   │
│ - Scrolling event table          │ - Module 1: Ingest JSON Viewer     │
│ - Cloud provider badges          │ - Module 2: 6-Feature Vector Table │
│ - Severity indicator tags        │ - Module 3: Random Forest Gauge    │
│ - Simulation Controls            │ - Compliance Recommendations Panel │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Active Session Selector**:
   - Toggles current active identity between `admin_secops` (Admin), `senior_analyst` (Pro), and `guest_user` (Free).
2. **Top Metrics Ribbon**:
   - Calculates dynamic counters for Total Ingested Events, Threats Detected, Critical Threat Count, Mean Risk Score, and Connected Clouds.
3. **Multi-Cloud Status Cards**:
   - Visual status indicators (`CONNECTED`, `DEMO MODE`, `NOT CONFIGURED`).
   - "Test" action: Executes non-blocking credential check via `/api/v1/cloud/test-connection/{provider}`.
   - "Sync Logs" action: Pulls cloud audit telemetry into the live pipeline.
4. **Deep Event Inspector**:
   - Side-by-side comparison of raw Module 1 fields and Module 2 engineered features.
   - Real-time gauge rendering the 0 to 100 Risk Score.
   - Actionable remediation advice mapped to NIST CSF 2.0, CIS Controls v8, and ISO/IEC 27001:2022.
5. **Admin Audit Log View**:
   - Restricted to ADMIN role. Displays system events, login records, sync operations, and retraining events.
