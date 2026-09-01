#!/usr/bin/env python3
"""
Multi-Cloud Credential Diagnostic Utility
Safely tests live authentication and API access for AWS, Azure, GCP, and OCI.
NEVER logs or displays secret credentials.
"""

import sys
import os

# Add project root and backend to python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app.adapters import get_all_adapters, get_multi_cloud_status
from app.config import settings

def run_diagnostic():
    print("=" * 60)
    print(" MULTI-CLOUD CREDENTIAL DIAGNOSTIC TOOL")
    print(" AI-Based Security Risk Evaluation Framework")
    print("=" * 60)

    adapters = get_all_adapters()
    results = {}
    has_failure = False

    print("\nTesting Live Provider Connections...")
    print("-" * 60)

    for name in ["aws", "azure", "gcp", "oci"]:
        adapter = adapters.get(name)
        if not adapter:
            continue

        res = adapter.validate_credentials()
        status = res.get("status", "FAILED")
        results[name] = res

        if status == "CONNECTED":
            icon = "[PASS]"
            detail_info = res.get("details", "")
        elif status == "DEMO MODE":
            icon = "[DEMO]"
            detail_info = res.get("details", "Deterministic cloud streams active")
        elif status == "NOT CONFIGURED":
            icon = "[SKIP]"
            detail_info = "Credentials not present in environment"
        elif status == "INSUFFICIENT_PERMISSIONS":
            icon = "[WARN]"
            detail_info = res.get("details", "Insufficient IAM permissions")
            has_failure = True
        else:
            icon = "[FAIL]"
            detail_info = res.get("details", "Authentication failed")
            has_failure = True

        print(f" {name.upper():<8} {icon:<8} {status:<15} {detail_info}")

    print("\n" + "=" * 60)
    print(" PERMISSION & CAPABILITY AUDIT SUMMARY")
    print("=" * 60)
    
    # AWS
    aws_res = results.get("aws", {})
    if aws_res.get("status") == "CONNECTED":
        print(f" AWS       [OK] STS Identity Verified (Account: {aws_res.get('account_id', 'N/A')}, Region: {aws_res.get('region', 'N/A')})")
    else:
        print(f" AWS       [--] Status: {aws_res.get('status', 'NOT CONFIGURED')}")

    # Azure
    azure_res = results.get("azure", {})
    if azure_res.get("status") == "CONNECTED":
        print(f" Azure     [OK] Microsoft Identity Verified (Scope: {azure_res.get('scope', 'Entra ID')})")
    else:
        print(f" Azure     [--] Status: {azure_res.get('status', 'NOT CONFIGURED')}")

    # GCP
    gcp_res = results.get("gcp", {})
    if gcp_res.get("status") == "CONNECTED":
        print(f" GCP       [OK] Service Account Verified (Project: {gcp_res.get('project_id', 'N/A')})")
    else:
        print(f" GCP       [--] Status: {gcp_res.get('status', 'NOT CONFIGURED')}")

    # OCI
    oci_res = results.get("oci", {})
    print(f" OCI       [OK] Mode: {oci_res.get('status', 'DEMO MODE')} (Region: {oci_res.get('region', 'us-ashburn-1')})")
    print("=" * 60)

    if has_failure:
        print("\nDIAGNOSTIC RESULT: Some configured providers failed authentication.")
        return 1
    else:
        print("\nDIAGNOSTIC RESULT: Multi-cloud integrations validated successfully.")
        return 0

if __name__ == "__main__":
    sys.exit(run_diagnostic())
