# 14. Billing Architecture and Webhook Verification

## Purpose
This document specifies the mock payment subsystem, order creation flow, and cryptographic webhook verification.

---

## 1. Operating Mode
- **Status**: DEMO BILLING (Cryptographically verified local pipeline).
- **Design**: Simulates payment provider webhooks (e.g., Razorpay or Stripe) using native Web Crypto HMAC-SHA256 signatures on the client and backend validation in FastAPI. External payment gateway API keys are optional.

---

## 2. Cryptographic Checkout Flow

```
[User Selects 'Upgrade to Pro']
             │
             ▼
[POST /api/v1/billing/checkout]  -> Creates BillingOrder record (Status: 'created')
             │
             ▼
[Client computes Web Crypto HMAC-SHA256 Signature]
 (Payload: `payment_id:order_id`, Secret: `mock_secret_key_123`)
             │
             ▼
[POST /api/v1/billing/webhook]
 (Header: `X-Mock-Signature: <hex_signature>`)
             │
             ▼
[Server verifies HMAC, updates `is_pro = 1` and order status = 'paid']
             │
             ▼
[Audit Log Record Created: 'PLAN_UPGRADE']
```

---

## 3. Database Schema

- **Table**: `billing_orders` (`backend/app/db.py`)
- **Fields**:
  - `order_id`: String primary key (e.g., `ord_mock_...`)
  - `user_id`: Foreign key referencing `users.user_id`
  - `amount`: 49900 (represents 499.00 INR)
  - `currency`: String ("INR")
  - `status`: String ("created" -> "paid")
  - `created_at`: UTC timestamp
