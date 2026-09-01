# 17. Security Operations Dashboard & UI Architecture

This document describes the layout, components, and interactive capabilities of the React 18 + Vite frontend console.

---

## 1. Dashboard Layout Structure

The user interface follows a professional SOC console dark theme built with Tailwind CSS and responsive CSS tokens:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Status Ribbon: Multi-Cloud Ingestion Pipeline State (ONLINE)      │
├────────────────────────────────────────────────────────────────────────┤
│ Console Header: Title, Active User Session Switcher, API Health       │
├────────────────────────────────────────────────────────────────────────┤
│ Top Metrics Ribbon: Total Events | Threats | Critical | Avg Risk | Cloud│
├────────────────────────────────────────────────────────────────────────┤
│ Multi-Cloud Status Cards: AWS Card | Azure Card | GCP Card | OCI Card  │
├────────────────────────────────────────────────────────────────────────┤
│ 1-Click Presentation Scenarios Bar: [AWS] [Azure] [GCP] [OCI] [AWS]    │
├────────────────────────────────────────────────────────────────────────┤
│ Navigation Tabs: Threat Console | Ingest | Model Metrics | Audit | Tier│
├───────────────────────────────────┬────────────────────────────────────┤
│ Live Event Stream (Left 40%)     │ Deep Event Inspector (Right 60%)   │
│ - Real-time scrolling events     │ - Module 1: Canonical Ingest JSON │
│ - Provider badges                │ - Module 2: 6-Feature Vector Table │
│ - Risk score & severity tags     │ - Module 3: RF Verdict & Risk Gauge│
│ - Pause / Simulate Stream button │ - Compliance Recommendations Panel │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Key Interactive Components

1. **Active Session Switcher**:
   - Allows instant switching between `ADMIN_SECOPS (Admin)`, `SENIOR_ANALYST (Pro)`, and `GUEST_USER (Free)`.
2. **Top Metrics Ribbon**:
   - Computes live counters for Total Events, Threats Detected, Critical Threats, Average Risk Score (0–100), and Connected Cloud count.
3. **Multi-Cloud Status Cards**:
   - Real-time badge indicators (`CONNECTED`, `DEMO MODE`, `NOT CONFIGURED`).
   - "Test" button: Triggers on-demand credential check.
   - "Sync Logs" button: Pulls cloud logs into the live pipeline.
4. **Deep Event Inspector**:
   - Compares raw Module 1 JSON schema side-by-side with Module 2 feature vectors.
   - Shows Random Forest confidence probability, risk score progress meter, and explainability reasoning list.
   - Displays Compliance Framework Recommendations (**NIST CSF 2.0, CIS Controls v8, ISO/IEC 27001:2022**).
5. **Admin Audit Trail Tab**:
   - Visible only when active user is `ADMIN`. Displays immutable records of logins, connection tests, cloud syncs, model training, and plan switches.
