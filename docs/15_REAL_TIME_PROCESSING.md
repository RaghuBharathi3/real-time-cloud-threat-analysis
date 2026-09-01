# 15. Real-Time Processing & Event Simulation

This document describes the real-time event streaming mechanics, simulation engine, and dashboard update mechanisms.

---

## 1. Real-Time Streaming Architecture

The platform supports two modes of real-time security telemetry:

1. **Simulated Continuous Stream**: Ingests realistic multi-cloud events from evaluation datasets (`data/raw/security_events_eval.csv`) at 3-second intervals.
2. **On-Demand Cloud Sync**: Connects to configured cloud adapters (AWS, Azure, GCP, OCI) to pull and normalize recent audit events in batches.

---

## 2. Dashboard Update Mechanism

To maximize operational reliability and eliminate heavy external message broker dependencies (e.g. Redis, Kafka, or WebSocket clustering), the frontend uses a responsive **State Synchronization Pattern**:

- **Continuous Simulation Loop**: Admin users can toggle `SIMULATE STREAM`, which triggers automated ingestion cycles every 3000ms via `POST /api/v1/pipeline/simulate-next`.
- **Reactive Health Polling**: Heartbeat polling verifies backend health and cloud status every 8000ms.
- **Immediate State Reflection**: Ingested events, risk scores, and compliance recommendations update the UI state and deep inspector in real time without requiring a full page refresh.

---

## 3. Real vs. Simulated Distinction

| Telemetry Stream | Origin | Processing Pipeline | Target Environment |
| :--- | :--- | :--- | :--- |
| **Live Cloud Sync** | AWS CloudTrail, Azure Entra ID, GCP Audit Logs | Module 1 $\rightarrow$ Module 2 $\rightarrow$ Module 3 $\rightarrow$ Risk Engine | Production / Staging |
| **Deterministic Scenarios** | 1-Click presentation triggers (AWS Brute Force, Azure KeyVault, etc.) | Module 1 $\rightarrow$ Module 2 $\rightarrow$ Module 3 $\rightarrow$ Risk Engine | Academic Demo / Testing |
| **Continuous Simulation** | `security_events_eval.csv` sampled events | Module 1 $\rightarrow$ Module 2 $\rightarrow$ Module 3 $\rightarrow$ Risk Engine | Offline Demo / SOC Testing |
