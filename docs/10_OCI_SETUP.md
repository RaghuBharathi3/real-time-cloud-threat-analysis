# 10. Oracle Cloud Infrastructure (OCI) Setup & Demo Mode

This guide details the integration and simulation capabilities for Oracle Cloud Infrastructure (OCI).

---

## 1. Overview & Current Status
- **Current Mode**: `DEMO MODE` (Verified Oracle Cloud Guard Stream Simulator).
- **Live Integration**: Supported via OCI API signing key and tenancy configuration.
- **Fail-Safe Operation**: When live OCI credentials are not supplied, the platform seamlessly switches to deterministic Oracle Cloud Guard demo streams without blocking the system.

---

## 2. Live Configuration Steps (Optional)

If connecting to a live OCI tenancy:

### Step 1: Create OCI API Signing Key
1. In the Oracle Cloud Console (`cloud.oracle.com`), go to **Identity & Security** $\rightarrow$ **Users** $\rightarrow$ User Details.
2. Under **API Keys**, click **Add API Key**.
3. Download the private key (`oci_api_key.pem`) and copy the configuration snippet.

### Step 2: Configure Environment Variables
Save your private key under `credentials/oci_api_key.pem` and configure `.env`:

```ini
OCI_TENANCY_OCID=<YOUR_OCI_TENANCY_OCID>
OCI_USER_OCID=<YOUR_OCI_USER_OCID>
OCI_FINGERPRINT=<YOUR_OCI_KEY_FINGERPRINT>
OCI_PRIVATE_KEY_PATH=credentials/oci_api_key.pem
OCI_REGION=us-ashburn-1
```

---

## 3. OCI Demo Mode Operation

When `OCI_TENANCY_OCID` is absent, the `OCIAdapter` automatically activates verified Demo Mode:
- Normalizes canonical events such as `oci_object_store`, `oci_vault`, and `oci_compute_admin`.
- Simulates realistic audit logs from IP `130.35.10.22`.
- Ingests events through Module 1, Module 2, Module 3, and the Risk Engine.

---

## 4. Testing & Diagnostics

Run:
```bash
python scripts/check_cloud_credentials.py
```

Expected diagnostic output:
```text
 OCI      [DEMO]   DEMO MODE       Running in verified OCI Demo Mode. Deterministic Oracle Cloud Guard streams active.
```
