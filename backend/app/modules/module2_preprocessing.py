import pandas as pd
from typing import Dict, Any
from .module1_event_collection import SecurityEvent

# List of sensitive resources defined in our project
SENSITIVE_RESOURCES = {"s3_bucket_finance", "ec2_admin_portal", "iam_policy_manager", "kms_keys"}

# List of unusual locations flagged as higher risk
UNUSUAL_LOCATIONS = {"CN", "RU", "KP", "UNKNOWN"}

def preprocess_single_event(event: SecurityEvent) -> Dict[str, Any]:
    """
    Transforms a single SecurityEvent Pydantic model into a preprocessed feature dict.
    This feature dict can be fed directly to the ML model for inference.
    """
    # 1. Handling missing / default values
    location = event.location or "Unknown"
    failed_attempts = event.failed_attempts if event.failed_attempts is not None else 0
    request_frequency = event.request_frequency if event.request_frequency is not None else 1
    resource = event.resource or ""
    event_type = event.event_type or ""

    # 2. Feature Engineering
    is_login = 1 if event_type.lower() == "login" else 0
    is_sensitive_resource = 1 if resource.lower() in SENSITIVE_RESOURCES else 0
    is_unusual_location = 1 if location.upper() in UNUSUAL_LOCATIONS else 0
    is_api_or_resource_access = 1 if event_type.lower() in {"api_call", "resource_access"} else 0

    return {
        "event_id": event.event_id,
        "timestamp": event.timestamp,
        "failed_attempts": failed_attempts,
        "request_frequency": request_frequency,
        "is_login": is_login,
        "is_sensitive_resource": is_sensitive_resource,
        "is_unusual_location": is_unusual_location,
        "is_api_or_resource_access": is_api_or_resource_access
    }

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms a raw DataFrame of events into a preprocessed DataFrame of features.
    Used for training and evaluating the ML model.
    """
    df_out = pd.DataFrame()
    
    # Preserve metadata fields
    if "event_id" in df.columns:
        df_out["event_id"] = df["event_id"]
    if "timestamp" in df.columns:
        df_out["timestamp"] = df["timestamp"]
        
    # Core numeric features & handling missing values
    df_out["failed_attempts"] = pd.to_numeric(df["failed_attempts"], errors="coerce").fillna(0).astype(int)
    df_out["request_frequency"] = pd.to_numeric(df["request_frequency"], errors="coerce").fillna(1).astype(int)
    
    # Feature engineering
    df_out["is_login"] = df["event_type"].astype(str).str.lower().apply(lambda x: 1 if x == "login" else 0)
    
    df_out["is_sensitive_resource"] = df["resource"].astype(str).str.lower().apply(
        lambda x: 1 if x in SENSITIVE_RESOURCES else 0
    )
    
    df_out["is_unusual_location"] = df["location"].astype(str).str.upper().apply(
        lambda x: 1 if x in UNUSUAL_LOCATIONS or x == "NAN" or x == "" else 0
    )
    
    df_out["is_api_or_resource_access"] = df["event_type"].astype(str).str.lower().apply(
        lambda x: 1 if x in {"api_call", "resource_access"} else 0
    )
    
    # If the label exists (for training), preserve it
    if "label" in df.columns:
        df_out["label"] = df["label"]
        
    return df_out
