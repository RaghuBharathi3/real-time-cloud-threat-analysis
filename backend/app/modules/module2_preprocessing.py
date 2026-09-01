import pandas as pd
from typing import Dict, Any, Set, Union
from .module1_event_collection import SecurityEvent

# List of known sensitive resources across AWS, Azure, GCP, and OCI
SENSITIVE_RESOURCES: Set[str] = {
    # AWS
    "s3_bucket_finance", "ec2_admin_portal", "iam_policy_manager", "kms_keys",
    # Azure
    "azure_keyvault", "azure_blob_finance", "azure_vm_admin", "azure_iam",
    # GCP
    "gcp_kms", "gcp_cloud_storage", "gcp_compute_admin", "gcp_iam",
    # OCI
    "oci_vault", "oci_object_store", "oci_compute_admin"
}

# Sensitive keyword substrings that flag custom resource names across providers
SENSITIVE_KEYWORDS = ("keyvault", "vault", "kms", "secret", "finance", "admin", "iam", "policy", "root")

# List of unusual locations flagged as higher risk in baseline security analysis
UNUSUAL_LOCATIONS: Set[str] = {"CN", "RU", "KP", "UNKNOWN", "IR", "SY"}

def is_resource_sensitive(resource_name: str) -> int:
    """
    Evaluates whether a cloud resource name represents a sensitive asset across providers.
    """
    if not resource_name:
        return 0
    res_lower = str(resource_name).lower().strip()
    if res_lower in SENSITIVE_RESOURCES:
        return 1
    if any(keyword in res_lower for keyword in SENSITIVE_KEYWORDS):
        return 1
    return 0

def is_location_unusual(location_code: str) -> int:
    """
    Evaluates whether a geolocation represents an unusual/anomalous origin.
    """
    if not location_code:
        return 1
    loc_upper = str(location_code).upper().strip()
    if loc_upper in UNUSUAL_LOCATIONS or loc_upper in {"NAN", "NONE", "NULL", ""}:
        return 1
    return 0

def preprocess_single_event(event: Union[SecurityEvent, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Transforms a single SecurityEvent or dict into a preprocessed feature dict.
    This feature dict can be fed directly to the ML model for inference.
    """
    if isinstance(event, SecurityEvent):
        location = event.location or "Unknown"
        failed_attempts = int(event.failed_attempts) if event.failed_attempts is not None else 0
        request_frequency = int(event.request_frequency) if event.request_frequency is not None else 1
        resource = event.resource or ""
        event_type = (event.event_type or "").lower().strip()
    else:
        location = event.get("location") or "Unknown"
        failed_attempts = int(event.get("failed_attempts", 0))
        request_frequency = int(event.get("request_frequency", 1))
        resource = str(event.get("resource", ""))
        event_type = str(event.get("event_type", "")).lower().strip()

    is_login = 1 if event_type == "login" else 0
    is_sensitive_resource = is_resource_sensitive(resource)
    is_unusual_location = is_location_unusual(location)
    is_api_or_resource_access = 1 if event_type in ["resource_access", "api_call"] else 0

    return {
        "failed_attempts": failed_attempts,
        "request_frequency": request_frequency,
        "is_login": is_login,
        "is_sensitive_resource": is_sensitive_resource,
        "is_unusual_location": is_unusual_location,
        "is_api_or_resource_access": is_api_or_resource_access
    }

preprocess_event = preprocess_single_event

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms an entire raw dataframe of events into a preprocessed feature dataframe
    suitable for Random Forest training and evaluation.
    """
    df_clean = df.copy()
    
    # Handle missing/null values defensively
    df_clean["failed_attempts"] = df_clean["failed_attempts"].fillna(0).astype(int)
    df_clean["request_frequency"] = df_clean["request_frequency"].fillna(1).astype(int)
    df_clean["event_type"] = df_clean["event_type"].fillna("unknown").astype(str).str.lower().str.strip()
    df_clean["resource"] = df_clean["resource"].fillna("unknown").astype(str)
    df_clean["location"] = df_clean["location"].fillna("Unknown").astype(str)

    # Feature engineering
    df_clean["is_login"] = (df_clean["event_type"] == "login").astype(int)
    df_clean["is_sensitive_resource"] = df_clean["resource"].apply(is_resource_sensitive)
    df_clean["is_unusual_location"] = df_clean["location"].apply(is_location_unusual)
    df_clean["is_api_or_resource_access"] = df_clean["event_type"].isin(["resource_access", "api_call"]).astype(int)

    return df_clean
