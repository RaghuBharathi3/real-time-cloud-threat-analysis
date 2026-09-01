# 07. Amazon Web Services (AWS) Setup Guide

This guide describes how to configure read-only AWS IAM credentials for the multi-cloud security platform.

---

## 1. Prerequisites
- Active AWS Account
- IAM administrative permissions to create a read-only IAM User or Role.

---

## 2. Configuration Steps

### Step 1: Create a Dedicated IAM User
1. Open the **AWS IAM Console** (`https://console.aws.amazon.com/iam`).
2. Navigate to **Users** $\rightarrow$ **Create User**.
3. Set the username (e.g. `cloud-security-analyst`).

### Step 2: Assign Minimum Least-Privilege Permissions
Attach the following AWS managed policies for read-only audit access:
- `AWSCloudTrail_ReadOnlyAccess`
- `SecurityAudit`

### Step 3: Generate Access Keys
1. Under the user's **Security credentials** tab, select **Create access key**.
2. Select **Application running outside AWS**.
3. Save the **Access Key ID** and **Secret Access Key**.

### Step 4: Configure Environment Variables
Add the following entries to `.env` in the project root:

```ini
AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_ACCESS_KEY>
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=<YOUR_AWS_ACCOUNT_ID_OPTIONAL>
```

---

## 3. Testing the Connection

Run the diagnostic verification tool:
```bash
python scripts/check_cloud_credentials.py
```

Expected output:
```text
 AWS      [PASS]   CONNECTED       Authenticated successfully as arn:aws:iam::<ACCOUNT_ID>:user/<USER>
```

---

## 4. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `InvalidClientTokenId` | Access key is mistyped or deactivated. | Verify `.env` access key string in AWS IAM Console. |
| `SignatureDoesNotMatch`| Secret key contains invalid characters or truncation. | Re-generate AWS Access Key pair and update `.env`. |
| `AccessDenied on STS` | IAM user policy restricts STS caller identity. | Ensure `sts:GetCallerIdentity` is permitted. |
