import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# --- DEMO MODE CONTROL ---
# Default to True for safe local developer sandbox environment.
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

# --- SECRET CLASSIFICATION SYSTEM ---
# Publicly safe variables for browser exposure (e.g. VITE_ prefix in Vite)
PUBLIC_VARS = ["DEMO_MODE", "SUPABASE_URL", "SUPABASE_ANON_KEY", "RAZORPAY_KEY_ID", "AWS_REGION", "AZURE_SUBSCRIPTION_ID", "GOOGLE_PROJECT_ID", "OCI_REGION"]

# Server-only configurations (never send to browser)
SERVER_ONLY_VARS = ["DATABASE_URL"]

# Highly sensitive credentials/keys (never send, secure log checks only)
HIGHLY_SENSITIVE_VARS = [
    "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET",
    "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "OCI_TENANCY_OCID", "OCI_USER_OCID", "OCI_FINGERPRINT", "OCI_PRIVATE_KEY_PATH"
]

# --- LOAD SETTINGS ---
settings = {
    "DEMO_MODE": DEMO_MODE,
    "DATABASE_URL": os.getenv("DATABASE_URL", "sqlite:///backend/app/cloud_security.db"),
    
    # Supabase
    "SUPABASE_URL": os.getenv("SUPABASE_URL"),
    "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
    "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    "SUPABASE_JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET"),
    
    # Razorpay
    "RAZORPAY_KEY_ID": os.getenv("RAZORPAY_KEY_ID"),
    "RAZORPAY_KEY_SECRET": os.getenv("RAZORPAY_KEY_SECRET"),
    "RAZORPAY_WEBHOOK_SECRET": os.getenv("RAZORPAY_WEBHOOK_SECRET"),
    
    # AWS
    "AWS_ACCESS_KEY_ID": os.getenv("AWS_ACCESS_KEY_ID"),
    "AWS_SECRET_ACCESS_KEY": os.getenv("AWS_SECRET_ACCESS_KEY"),
    "AWS_REGION": os.getenv("AWS_REGION"),
    
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

# --- VALIDATION ENGINE ---
# Perform strict checks only when DEMO_MODE is false (Production/Staging).
if not DEMO_MODE:
    missing = []
    invalid_format = []
    
    # 1. Presence Validation
    for var in (PUBLIC_VARS + SERVER_ONLY_VARS + HIGHLY_SENSITIVE_VARS):
        if var in ["DEMO_MODE", "DATABASE_URL"]:
            continue
        if not os.getenv(var):
            missing.append(var)
            
    # 2. Database URI Check
    db_url = settings["DATABASE_URL"]
    if not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        invalid_format.append("DATABASE_URL must start with postgresql:// or postgres:// in production mode.")
        
    # 3. Supabase URL Check
    sb_url = settings["SUPABASE_URL"]
    if sb_url and not sb_url.startswith("https://"):
        invalid_format.append("SUPABASE_URL must start with https://")
        
    # 4. GCP Credentials File Presence Check
    g_creds = settings["GOOGLE_APPLICATION_CREDENTIALS"]
    if g_creds and not os.path.exists(g_creds):
        invalid_format.append(f"GOOGLE_APPLICATION_CREDENTIALS file not found at path: {g_creds}")
        
    # 5. OCI Key File Presence Check
    oci_key = settings["OCI_PRIVATE_KEY_PATH"]
    if oci_key and not os.path.exists(oci_key):
        invalid_format.append(f"OCI_PRIVATE_KEY_PATH file not found at path: {oci_key}")
        
    # 6. Raise Fail-Fast error on invalid configurations
    if missing or invalid_format:
        print("\n" + "!" * 80, file=sys.stderr)
        print(" PRODUCTION DEPLOYMENT BOOTSTRAP FAILURE: MISSING REQUIRED SECRETS", file=sys.stderr)
        print("!" * 80, file=sys.stderr)
        if missing:
            print("Missing required production configuration variables:", file=sys.stderr)
            for m in missing:
                print(f"  - {m}", file=sys.stderr)
        if invalid_format:
            print("\nFormatting validation failures:", file=sys.stderr)
            for f in invalid_format:
                print(f"  - {f}", file=sys.stderr)
        print("!" * 80 + "\n", file=sys.stderr)
        sys.exit(1)
else:
    # Print Demo warning banner on startup
    print("\n" + "=" * 80)
    print(" SYSTEM BOOT WARNING: RUNNING IN DEMO MODE (DEMO_MODE=true)", file=sys.stdout)
    print(" All production credentials validation bypassed.", file=sys.stdout)
    print(" Operating using SQLite local database and mock workflows.", file=sys.stdout)
    print("=" * 80 + "\n")
