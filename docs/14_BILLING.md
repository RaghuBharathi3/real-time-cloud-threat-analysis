# 14. Billing Architecture & Webhook Verification

This document details the billing subsystem, mock payment pipeline, and cryptographic verification flow.

---

## 1. Overview & Implementation Status

- **Status**: `DEMO BILLING` (Cryptographically Verified Local Pipeline).
- **Integration**: Simulates production payment gateways (such as Razorpay or Stripe) using native **Web Crypto HMAC-SHA256** signatures on the client and backend validation in FastAPI.

> [!NOTE]
> **Decoupled Architecture**: Real payment gateway keys are optional. The platform operates self-contained without requiring external network calls to third-party payment processors.

---

## 2. Cryptographic Checkout & Webhook Lifecycle

```
[User Clicks 'Upgrade to Pro']
             │
             ▼
[POST /api/v1/billing/checkout]  ──> Creates BillingOrder (Status: 'created')
             │
             ▼
[Client computes Web Crypto HMAC-SHA256 Signature]
 (Payload: `payment_id:order_id`, Secret: `mock_secret_key_123`)
             │
             ▼
[POST /api/v1/billing/webhook]
 (Headers: `X-Mock-Signature: <hex_signature>`)
             │
             ▼
[Backend Updates User: `is_pro = 1` & Order: `status = 'paid'`]
             │
             ▼
[Audit Log Event Recorded: 'PLAN_UPGRADE']
```

---

## 3. Database Schema

- **Model**: `BillingOrder` (`backend/app/db.py`)
- **Fields**:
  - `order_id`: String primary key (e.g. `ord_mock_260901...`)
  - `user_id`: Foreign key to `UserProfile`
  - `amount`: 49900 (representing ₹499.00 INR)
  - `currency`: "INR"
  - `status`: `created` $\rightarrow$ `paid`
  - `created_at`: UTC Timestamp
