# Production Environment Setup Guide

This document details the configuration requirements for deploying the **Cloud Security operations Console** in a production environment. 

---

## 1. Environment Architecture

In development and demo environments, the system defaults to a self-contained SQLite configuration with simulated payment pipelines and mock user sessions.

In production mode:
1. **Demo Mode Disabled**: Set `DEMO_MODE=false` in the environment configuration.
2. **PostgreSQL Integration**: Migrate database connections to PostgreSQL (e.g., Supabase PostgreSQL) by specifying the `DATABASE_URL` connection string.
3. **Cryptographic Identity Verification**: Raw `X-User-ID` headers are disabled. User authorization is validated strictly via HMAC-SHA256 signature verification of JWT tokens issued by **Supabase Auth** (`SUPABASE_JWT_SECRET`).
4. **Live Payment Webhooks**: Replaces simulated signatures with verified signature HMAC callbacks from **Razorpay** (`RAZORPAY_WEBHOOK_SECRET`).

---

## 2. Secrets Provisioning Flow

To deploy the service in production, follow these steps:

1. **Copy the Production Template**:
   ```bash
   cp .env.production.example .env.production
   ```
2. **Populate Secret Keys**: Open `.env.production` and paste your secure production credentials. (Do NOT commit `.env.production` to your Git repository—it is ignored by `.gitignore`).
3. **Inject variables**: Populate environment variables in your hosting environment (e.g. Vercel for frontend, Render or AWS ECS for backend).
4. **Boot up**: The application boot checks validation at startup. If any required production secret is missing, the service will fail-fast with a clear error message.

---

## 3. Database Migration & RLS

When moving from SQLite to PostgreSQL in production:

1. Execute the tables creation script to establish `system_users` and `security_alerts`.
2. Enable Row-Level Security (RLS) on PostgreSQL:
   ```sql
   ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
   ```
3. Create policies restricting alert reading to the owner organization:
   ```sql
   CREATE POLICY organization_alert_access ON security_alerts
       FOR SELECT
       TO authenticated
       USING (account_id IN (
           SELECT account_id FROM tenant_memberships WHERE user_id = auth.uid()
       ));
   ```
