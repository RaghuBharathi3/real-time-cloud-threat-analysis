# Multi-Cloud Setup & Configuration Guide

This guide details the architecture, setup instructions, and credential configuration for integrating Amazon Web Services (AWS), Microsoft Azure, and Google Cloud Platform (GCP) into the **AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments**.

---

## 1. Multi-Cloud Architecture

The platform uses a decoupled, provider-agnostic ingestion and risk assessment architecture:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   AWS Adapter   │       │  Azure Adapter  │       │   GCP Adapter   │
│ (CloudTrail/STS)│       │(Entra ID/Mgmt)  │       │ (Audit Logs/SA) │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Uniform Cloud Adapter Engine │
                    │ (connect, validate,          │
                    │  collect, normalize)         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    Canonical Event Schema    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │           MODULE 1           │
                    │ Collection & Schema Validate │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │           MODULE 2           │
                    │ Multi-Cloud Preprocessing &  │
                    │     Feature Extraction       │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │           MODULE 3           │
                    │   Random Forest ML Threat    │
                    │       Classification         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     Risk Scoring Engine      │
                    │   (Score: 0-100, Severity:   │
                    │    LOW/MEDIUM/HIGH/CRITICAL) │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  SQLite / Postgres Database  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Security Operations Console  │
                    │       React Dashboard        │
                    └──────────────────────────────┘
```

---

## 2. Environment Configuration (`.env`)

Store environment configuration in `.env` in the project root.

> **Security Rule**: Never commit `.env` or service account keys to source control.

```bash
# Mode Setting
DEMO_MODE=false
DATABASE_URL=sqlite:///backend/app/cloud_security.db

# Amazon Web Services
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=

# Microsoft Azure
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>

# Google Cloud Platform
GOOGLE_PROJECT_ID=<your-gcp-project-id>
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
```

---

## 3. Provider Setup Details

### 3.1 Amazon Web Services (AWS)
- **Authentication**: Uses `boto3` session authenticated with Access Key ID and Secret Access Key.
- **Verification**: Validates identity via AWS STS (`GetCallerIdentity`).
- **Data Ingestion**: Collects CloudTrail events and translates them into the canonical schema.

### 3.2 Microsoft Azure
- **Authentication**: Uses `azure-identity` (`ClientSecretCredential`) authenticated with Service Principal credentials.
- **Verification**: Validates token acquisition against Microsoft Entra ID / Microsoft Identity Platform.
- **Data Ingestion**: Collects Activity and Security audit logs, normalizing Azure resources (e.g. `azure_keyvault`, `azure_blob_finance`).

### 3.3 Google Cloud Platform (GCP)
- **Authentication**: Uses `google-auth` with a backend service account JSON key file (`credentials/gcp-service-account.json`).
- **Verification**: Validates cryptographic signature and token refresh against Google OAuth2 token endpoint.
- **Data Ingestion**: Normalizes Cloud Audit logs (`protoPayload`) and maps GCP resource operations.

---

## 4. Running the Credential Diagnostic Tool

To test all configured cloud providers without exposing secrets:

```bash
python scripts/check_cloud_credentials.py
```

Expected diagnostic output:
- **AWS**: `CONNECTED`
- **Azure**: `CONNECTED`
- **GCP**: `CONNECTED`

---

## 5. Starting the Application

### 5.1 Backend Server (FastAPI)
```bash
# In backend directory
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5.2 Frontend Console (React + Vite)
```bash
# In frontend directory
npm run dev
```
Navigate to `http://localhost:5173` to view the Cloud Security Operations Console.
