import os
import sys
import pytest
import pandas as pd
from datetime import datetime

# Add backend directory to sys.path to resolve imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.modules.module1_event_collection import validate_raw_event, SecurityEvent
from app.modules.module2_preprocessing import preprocess_single_event, preprocess_dataframe
from app.modules.module3_threat_detection import train_threat_model, predict_threat, calculate_risk_score

def test_module1_validation_multi_cloud():
    for provider in ["aws", "azure", "gcp", "oci"]:
        raw = {
            "event_id": f"EVT_{provider.upper()}_001",
            "timestamp": "2026-09-01T10:30:00Z",
            "cloud_provider": provider,
            "user_id": f"user_{provider}",
            "event_type": "resource_access",
            "ip_address": "192.168.1.5",
            "location": "US",
            "failed_attempts": 0,
            "resource": "cloud_storage",
            "request_frequency": 1
        }
        validated = validate_raw_event(raw)
        assert isinstance(validated, SecurityEvent)
        assert validated.cloud_provider == provider

def test_module1_validation_failure():
    # Invalid IP address
    raw = {
        "event_id": "EVT99999",
        "timestamp": "2026-08-27T10:30:00",
        "cloud_provider": "aws",
        "user_id": "user_001",
        "event_type": "login",
        "ip_address": "invalid-ip",
        "location": "US",
        "failed_attempts": 0,
        "resource": "cloud_console",
        "request_frequency": 1
    }
    with pytest.raises(Exception):
        validate_raw_event(raw)

def test_module2_preprocessing_multi_cloud_resources():
    sensitive_resources = [
        ("aws", "s3_bucket_finance"),
        ("azure", "azure_keyvault"),
        ("gcp", "gcp_kms"),
        ("oci", "oci_vault")
    ]
    
    for provider, resource in sensitive_resources:
        event = SecurityEvent(
            event_id=f"EVT_{provider}",
            timestamp="2026-09-01T10:30:00Z",
            cloud_provider=provider,
            user_id="user_sec",
            event_type="resource_access",
            ip_address="10.0.0.1",
            location="Unknown",
            failed_attempts=0,
            resource=resource,
            request_frequency=15
        )
        features = preprocess_single_event(event)
        assert features["is_sensitive_resource"] == 1
        assert features["is_unusual_location"] == 1
        assert features["request_frequency"] == 15

def test_module3_prediction_and_risk_engine():
    # 1. Normal event test -> LOW severity
    normal_features = {
        "event_id": "EVT_NORM",
        "timestamp": "2026-09-01T10:30:00Z",
        "failed_attempts": 0,
        "request_frequency": 1,
        "is_login": 1,
        "is_sensitive_resource": 0,
        "is_unusual_location": 0,
        "is_api_or_resource_access": 0
    }
    pred_normal = predict_threat(normal_features)
    assert pred_normal["threat_status"] == "Normal"
    assert pred_normal["severity"] == "LOW"
    assert 0 <= pred_normal["risk_score"] <= 29
    assert len(pred_normal["reason"]) > 0

    # 2. Brute-force attack test -> CRITICAL / HIGH severity
    brute_features = {
        "event_id": "EVT_BRUTE",
        "timestamp": "2026-09-01T10:30:00Z",
        "failed_attempts": 12,
        "request_frequency": 10,
        "is_login": 1,
        "is_sensitive_resource": 0,
        "is_unusual_location": 0,
        "is_api_or_resource_access": 0
    }
    pred_brute = predict_threat(brute_features)
    assert pred_brute["threat_status"] == "Suspicious"
    assert "brute-force" in pred_brute["threat_type"].lower()
    assert pred_brute["severity"] in ["HIGH", "CRITICAL"]
    assert pred_brute["risk_score"] >= 60

    # 3. Unauthorized access test -> HIGH / CRITICAL severity
    unauth_features = {
        "event_id": "EVT_UNAUTH",
        "timestamp": "2026-09-01T10:30:00Z",
        "failed_attempts": 0,
        "request_frequency": 20,
        "is_login": 0,
        "is_sensitive_resource": 1,
        "is_unusual_location": 1,
        "is_api_or_resource_access": 1
    }
    pred_unauth = predict_threat(unauth_features)
    assert pred_unauth["threat_status"] == "Suspicious"
    assert pred_unauth["risk_score"] >= 60
    assert pred_unauth["severity"] in ["HIGH", "CRITICAL"]

def test_risk_score_tiers():
    r_low = calculate_risk_score("normal", 0.95, {"failed_attempts": 0, "request_frequency": 1, "is_sensitive_resource": 0, "is_unusual_location": 0})
    assert r_low["severity"] == "LOW"
    assert 0 <= r_low["risk_score"] <= 29

    r_crit = calculate_risk_score("brute_force", 0.98, {"failed_attempts": 10, "request_frequency": 5, "is_sensitive_resource": 1, "is_unusual_location": 0})
    assert r_crit["severity"] in ["HIGH", "CRITICAL"]
    assert r_crit["risk_score"] >= 70
