# 07. Amazon Web Services (AWS) Setup

## Purpose
This document provides instructions for configuring read-only IAM credentials to connect the platform to AWS.

---

## 1. Prerequisites
- Active AWS account.
- Permissions to create IAM users and attach read-only policies.

---

## 2. Configuration Procedure

1. **Create IAM User**:
   - In AWS IAM Console, create a service user (e.g., `cloud-security-reader`).
2. **Attach Managed Read-Only Policies**:
   - Attach `AWSCloudTrail_ReadOnlyAccess`.
   - Attach `SecurityAudit`.
3. **Generate Access Keys**:
   - Create an Access Key ID and Secret Access Key under Security Credentials.
4. **Configure Environment**:
   Add the following variables to `.env`:
   ```ini
   AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY_ID>
   AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_ACCESS_KEY>
   AWS_REGION=ap-south-1
   AWS_ACCOUNT_ID=<YOUR_AWS_ACCOUNT_ID_OPTIONAL>
   ```

---

## 3. Verification

Run the credential verification script:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 AWS      [PASS]   CONNECTED       Authenticated successfully as arn:aws:iam::<ACCOUNT_ID>:user/<USER>
```

---

## 4. Troubleshooting

| Error Code | Root Cause | Resolution |
| :--- | :--- | :--- |
| `InvalidClientTokenId` | Access key string is invalid or disabled. | Verify credentials in AWS IAM Console. |
| `SignatureDoesNotMatch` | Secret key contains typos or truncation. | Re-generate access key pair and update `.env`. |
| `AccessDenied on STS` | Caller identity check blocked by SCP or IAM boundary. | Ensure `sts:GetCallerIdentity` is permitted. |
