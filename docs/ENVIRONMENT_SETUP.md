# Environment Setup & Configuration Guide

This guide details how to configure environment variables for local development, production, and Demo Mode.

---

## 1. Environment Variable Classifications

| Variable | Category | Required For | Storage Location |
| :--- | :--- | :--- | :--- |
| `DEMO_MODE` | Public | System Operating Mode | `.env` |
| `DATABASE_URL` | Server-Only | SQLite / PostgreSQL URI | `.env` |
| `AWS_ACCESS_KEY_ID` | Server-Only (Secret) | AWS CloudTrail / STS | `.env` |
| `AWS_SECRET_ACCESS_KEY` | Server-Only (Secret) | AWS CloudTrail / STS | `.env` |
| `AWS_REGION` | Public | AWS Target Region | `.env` |
| `AZURE_CLIENT_ID` | Server-Only | Microsoft Entra ID | `.env` |
| `AZURE_TENANT_ID` | Server-Only | Microsoft Entra ID | `.env` |
| `AZURE_CLIENT_SECRET` | Server-Only (Secret) | Microsoft Entra ID | `.env` |
| `GOOGLE_PROJECT_ID` | Public | Google Cloud Project | `.env` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Server-Only | GCP Service Account File | `.env` |
| `OCI_TENANCY_OCID` | Server-Only | OCI Tenancy | `.env` |
| `OCI_PRIVATE_KEY_PATH` | Server-Only | OCI Private PEM File | `.env` |

---

## 2. Setting Up Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the cloud provider keys if testing live clouds.
3. If testing offline without cloud credentials, set:
   ```ini
   DEMO_MODE=true
   ```

---

## 3. Production Deployment Notes
In production cloud deployments (such as AWS ECS, Azure App Service, or GCP Cloud Run), inject secrets using cloud-native Key Vaults (AWS Secrets Manager, Azure Key Vault, Google Secret Manager) instead of static `.env` files.
