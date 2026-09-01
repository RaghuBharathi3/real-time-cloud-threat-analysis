# 10. Oracle Cloud Infrastructure (OCI) Setup and Demo Mode

## Purpose
This document specifies the integration configuration and verified Demo Mode operation for Oracle Cloud Infrastructure (OCI).

---

## 1. Operating Modes
- **Demo Mode (Default)**: If live OCI credentials are not configured, the adapter automatically activates deterministic Oracle Cloud Guard simulation streams. All events flow through the full ML classification and risk scoring pipeline.
- **Live Mode**: Uses OCI API signing keys to authenticate against an active tenancy.

---

## 2. Live Configuration Procedure (Optional)

1. **Generate API Signing Key**:
   - In Oracle Cloud Console (`cloud.oracle.com`), go to **Identity & Security** -> **Users** -> User Details -> **API Keys**.
   - Generate and download the private key (`oci_api_key.pem`).
2. **Key Placement**:
   - Save the PEM file to `credentials/oci_api_key.pem` (git-ignored).
3. **Configure Environment**:
   Add the following variables to `.env`:
   ```ini
   OCI_TENANCY_OCID=<YOUR_OCI_TENANCY_OCID>
   OCI_USER_OCID=<YOUR_OCI_USER_OCID>
   OCI_FINGERPRINT=<YOUR_OCI_KEY_FINGERPRINT>
   OCI_PRIVATE_KEY_PATH=credentials/oci_api_key.pem
   OCI_REGION=us-ashburn-1
   ```

---

## 3. Verification

Run the verification tool:
```bash
python scripts/check_cloud_credentials.py
```

Expected output in Demo Mode:
```text
 OCI      [DEMO]   DEMO MODE       Running in verified OCI Demo Mode. Deterministic Oracle Cloud Guard streams active.
```
