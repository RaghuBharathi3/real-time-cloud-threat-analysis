# 15. Real-Time Processing and Simulation Mechanics

## Purpose
This document describes the telemetry ingestion pipeline, continuous simulation loop, and state synchronization mechanisms.

---

## 1. Real-Time Telemetry Modes

1. **Simulated Event Stream**: Ingests realistic multi-cloud events from evaluation datasets (`data/raw/security_events_eval.csv`) at 3-second intervals.
2. **On-Demand Cloud Ingestion**: Connects to configured cloud adapters (AWS, Azure, GCP, OCI) to pull and normalize recent audit logs in batches.

---

## 2. Dashboard State Synchronization

To maintain high reliability without external message brokers (such as Redis or Kafka), the frontend uses a state synchronization pattern:
- **Simulation Loop**: When the user enables the simulation toggle, the client polls `POST /api/v1/pipeline/simulate-next` every 3000ms.
- **Health Heartbeat**: Polling verifies backend health and adapter status every 8000ms.
- **Local State Updates**: Ingested events, calculated risk scores, and compliance recommendations update the UI state and event inspector immediately.

---

## 3. Comparison of Ingestion Streams

| Telemetry Stream | Data Source | Pipeline Processing | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Live Cloud Sync** | AWS CloudTrail, Azure Activity, GCP Audit | Modules 1, 2, 3 + Risk Engine | Production / Staging |
| **Deterministic Scenarios** | 1-Click presentation buttons | Modules 1, 2, 3 + Risk Engine | Demonstration / Testing |
| **Continuous Stream** | `security_events_eval.csv` records | Modules 1, 2, 3 + Risk Engine | Offline Evaluation |
