# Project Architecture & Security Improvements Walkthrough

This walkthrough outlines the newly implemented architectural components, access controls, billing pipelines, and multi-cloud adapters introduced in **Project Review II**.

---

## 1. Role-Based Access Control (RBAC) & Session Switcher

We added a **Mock Authentication Provider** in the SQLite database and a **Session Role Switcher** dropdown in the console header. This allows you (and the project evaluators) to instantly toggle user profiles and inspect how access control behaves:

* **Admin Session (`admin`)**:
  * Role: `ADMIN` | Tier: `PRO`
  * Unlocks full dashboard, details view, and enables log stream simulation and model retraining.
* **Analyst Session (`analyst`)**:
  * Role: `ANALYST` | Tier: `PRO`
  * Unlocks raw telemetry view and logs, but disables simulation control buttons (simulation is ADMIN-only).
* **Free User Session (`user_free`)**:
  * Role: `USER` | Tier: `FREE`
  * Hides the raw JSON code blocks (raw audit logs are restricted to Analysts and Admins).
  * Blocks simulation controls.
  * Restricted to AWS event processing only.
* **Pro User Session (`user_pro`)**:
  * Role: `USER` | Tier: `PRO`
  * Hides raw JSON payloads, but unlocks multi-cloud event logs (Azure, GCP, OCI) across the dashboard.

---

## 2. Server-Side Tier Enforcements (Free vs. Pro)

The server enforces multi-cloud account scanning restrictions at the API boundary, rather than relying solely on the frontend to hide features.

### How to test:
1. Select the **USER_FREE (USER) - FREE** active session in the top header.
2. Go to the **Log Ingest Injector** tab.
3. Select **Azure** or **Google Cloud** as the Cloud Provider, fill out the parameters, and click **Inject Event**.
4. The console displays a red warning notification banner:
   `[INGESTION FORBIDDEN] Multi-cloud adapters require Pro subscription. Upgrade at the Billing tab.`
5. Swap the session to **USER_PRO (USER) - PRO** or **ADMIN (ADMIN) - PRO**.
6. Repeat the injection. The backend successfully processes the event and logs it into the stream, verifying that tier separation is enforced on the server.

---

## 3. Cryptographically Verified Mock Billing Webhook

To support zero-budget deployments while demonstrating production-grade payment pipelines, we built a mock gateway matching the exact payment webhoo                                                                                                                                                                                k flow.

### In-Browser Execution Steps:
1. Select the **USER_FREE (USER) - FREE** session.
2. Go to the **Billing & Tiers** tab. Under current level, you will see `FREE TIER LIMIT` in amber.
3. Click the **Upgrade to Pro Plan** button.
4. The system logs the pipeline events in real-time:
   * Initiates payment order creation on `/api/v1/billing/checkout` using `X-User-ID` headers.
   * Receives `order_mock_XXXXXX`.
   * Simulates a payment callback by computing an expected HMAC-SHA256 signature locally using the browser's native **Web Crypto API** (using the secret key `mock_secret_key_123`).
   * Sends the signature-verified webhook upgrade call to `/api/v1/billing/webhook` with header `X-Mock-Signature`.
   * The FastAPI server validates the cryptographic signature, matches the keys, upgrades the user record in SQLite, and returns:
     `Webhook processed successfully. User 'user_free' upgraded to PRO tier.`
5. The session dropdown and active state refresh automatically, displaying `PRO` and unlocking all cloud adapters.

---

## 4. Multi-Cloud Event Streaming

* **Badges**: Sidebar log events now render visual badges labeling the cloud origin (`AWS`, `AZURE`, `GCP`, or `OCI`) with dedicated color framing.
* **Pro Streaming**: Running simulation as an **Admin** with a **PRO** subscription rotates events through AWS, Azure, GCP, and OCI logs, dynamically updating resource fields to reflect correct cloud structures (e.g., swapping AWS `s3_bucket` to Azure `blob` or OCI `object_store` telemetry). If standard Free Admin runs it, it generates only AWS events.

---

## 5. End-to-End Local Endpoint Verifications

You can verify that all API paths are active by running the automated unit test suite:
```powershell
.\backend\venv\Scripts\python.exe -m pytest tests/test_pipeline.py
```
Outputs:
```text
tests\test_pipeline.py ....                                              [100%]
======================= 4 passed, 400 warnings in 2.37s =======================
```
All routes, validation models, and classification layers compile and execute without errors.
