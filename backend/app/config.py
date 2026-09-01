import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# --- DEMO MODE CONTROL ---
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

# --- SECRET CLASSIFICATION SYSTEM ---
PUBLIC_VARS = ["DEMO_MODE", "SUPABASE_URL", "SUPABASE_ANON_KEY", "RAZORPAY_KEY_ID", "AWS_REGION", "AZURE_SUBSCRIPTION_ID", "GOOGLE_PROJECT_ID", "OCI_REGION"]
SERVER_ONLY_VARS = ["DATABASE_URL"]
HIGHLY_SENSITIVE_VARS = [
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET",
    "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "OCI_TENANCY_OCID", "OCI_USER_OCID", "OCI_FINGERPRINT", "OCI_PRIVATE_KEY_PATH"
]

_RAW_SETTINGS = {
    "DEMO_MODE": DEMO_MODE,
    "DATABASE_URL": os.getenv("DATABASE_URL", "sqlite:///backend/app/cloud_security.db"),
    
    # Supabase (Optional for Auth)
    "SUPABASE_URL": os.getenv("SUPABASE_URL"),
    "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
    "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    "SUPABASE_JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-key-for-local-testing-token-signature"),
    
    # Razorpay (Optional for Billing)
    "RAZORPAY_KEY_ID": os.getenv("RAZORPAY_KEY_ID"),
    "RAZORPAY_KEY_SECRET": os.getenv("RAZORPAY_KEY_SECRET"),
    "RAZORPAY_WEBHOOK_SECRET": os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret_key_123"),
    
    # AWS
    "AWS_ACCESS_KEY_ID": os.getenv("AWS_ACCESS_KEY_ID"),
    "AWS_SECRET_ACCESS_KEY": os.getenv("AWS_SECRET_ACCESS_KEY"),
    "AWS_REGION": os.getenv("AWS_REGION", "ap-south-1"),
    "AWS_ACCOUNT_ID": os.getenv("AWS_ACCOUNT_ID"),
    
    # Azure
    "AZURE_CLIENT_ID": os.getenv("AZURE_CLIENT_ID"),
    "AZURE_TENANT_ID": os.getenv("AZURE_TENANT_ID"),
    "AZURE_SUBSCRIPTION_ID": os.getenv("AZURE_SUBSCRIPTION_ID"),
    "AZURE_CLIENT_SECRET": os.getenv("AZURE_CLIENT_SECRET"),
    
    # GCP
    "GOOGLE_PROJECT_ID": os.getenv("GOOGLE_PROJECT_ID"),
    "GOOGLE_APPLICATION_CREDENTIALS": os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
    
    # OCI
    "OCI_TENANCY_OCID": os.getenv("OCI_TENANCY_OCID"),
    "OCI_USER_OCID": os.getenv("OCI_USER_OCID"),
    "OCI_FINGERPRINT": os.getenv("OCI_FINGERPRINT"),
    "OCI_PRIVATE_KEY_PATH": os.getenv("OCI_PRIVATE_KEY_PATH"),
    "OCI_REGION": os.getenv("OCI_REGION"),
}

def get_cloud_credentials_summary() -> dict:
    gcp_creds_path = _RAW_SETTINGS.get("GOOGLE_APPLICATION_CREDENTIALS")
    gcp_file_exists = bool(gcp_creds_path and os.path.exists(gcp_creds_path))
    
    oci_key_path = _RAW_SETTINGS.get("OCI_PRIVATE_KEY_PATH")
    oci_file_exists = bool(oci_key_path and os.path.exists(oci_key_path))

    return {
        "aws": {
            "configured": bool(_RAW_SETTINGS.get("AWS_ACCESS_KEY_ID") and _RAW_SETTINGS.get("AWS_SECRET_ACCESS_KEY")),
            "region": _RAW_SETTINGS.get("AWS_REGION", "not-set")
        },
        "azure": {
            "configured": bool(_RAW_SETTINGS.get("AZURE_CLIENT_ID") and _RAW_SETTINGS.get("AZURE_CLIENT_SECRET") and _RAW_SETTINGS.get("AZURE_TENANT_ID")),
            "subscription_configured": bool(_RAW_SETTINGS.get("AZURE_SUBSCRIPTION_ID"))
        },
        "gcp": {
            "configured": bool(_RAW_SETTINGS.get("GOOGLE_PROJECT_ID") and gcp_file_exists),
            "project_id": _RAW_SETTINGS.get("GOOGLE_PROJECT_ID", "not-set"),
            "key_file_found": gcp_file_exists
        },
        "oci": {
            "configured": bool(_RAW_SETTINGS.get("OCI_TENANCY_OCID") and oci_file_exists),
            "key_file_found": oci_file_exists
        }
    }

class SettingsWrapper:
    def __init__(self, raw: dict):
        self._raw = raw
        self.is_demo_mode = raw.get("DEMO_MODE", False)

    def get(self, key, default=None):
        return self._raw.get(key, default)

    def __getitem__(self, key):
        return self._raw[key]

    def get_safe_cloud_summary(self):
        return get_cloud_credentials_summary()

settings = SettingsWrapper(_RAW_SETTINGS)

if not DEMO_MODE:
    print("[Config] Live Multi-Cloud Mode initialized (DEMO_MODE=false).")
    summary = get_cloud_credentials_summary()
    for prov, state in summary.items():
        status_label = "CONFIGURED" if state.get("configured") else "NOT CONFIGURED"
        print(f"[Config] Provider {prov.upper()}: {status_label}")
else:
    print("[Config] Running in Demo Mode (DEMO_MODE=true). Synthetic fallbacks active.")
