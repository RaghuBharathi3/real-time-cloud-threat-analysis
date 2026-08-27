import os
import sys
import pytest
import pandas as pd
from datetime import datetime

# Add backend directory to sys.path to resolve imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.modules.module1_event_collection import validate_raw_event, SecurityEvent
from app.modules.module2_preprocessing import preprocess_single_event, preprocess_dataframe
from app.modules.module3_threat_detection import train_threat_model, predict_threat

def test_module1_validation_success():
    raw = {
        "event_id": "EVT99999",
        "timestamp": "2026-08-27T10:30:00",
        "user_id": "user_001",
        "event_type": "login",
        "ip_address": "192.168.1.5",
        "location": "US",
        "failed_attempts": 0,
        "resource": "cloud_console",
        "request_frequency": 1
    }
    validated = validate_raw_event(raw)
    assert isinstance(validated, SecurityEvent)
    assert validated.event_id == "EVT99999"
    assert validated.event_type == "login"

def test_module1_validation_failure():
    # Invalid IP address
    raw = {
        "event_id": "EVT99999",
        "timestamp": "2026-08-27T10:30:00",
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

def test_module2_preprocessing():
    event = SecurityEvent(
        event_id="EVT111",
        timestamp="2026-08-27T10:30:00",
        user_id="user_001",
        event_type="resource_access",
        ip_address="10.0.0.1",
        location="Unknown",
        failed_attempts=0,
        resource="s3_bucket_finance",
        request_frequency=25
    )
    features = preprocess_single_event(event)
    
    assert features["failed_attempts"] == 0
    assert features["request_frequency"] == 25
    assert features["is_login"] == 0
    assert features["is_sensitive_resource"] == 1  # s3_bucket_finance is sensitive
    assert features["is_unusual_location"] == 1    # Unknown is unusual

def test_module3_prediction():
    # Test predicting a normal event
    normal_features = {
        "event_id": "EVT222",
        "timestamp": "2026-08-27T10:30:00",
        "failed_attempts": 0,
        "request_frequency": 1,
        "is_login": 1,
        "is_sensitive_resource": 0,
        "is_unusual_location": 0,
        "is_api_or_resource_access": 0
    }
    pred_normal = predict_threat(normal_features)
    assert pred_normal["threat_status"] == "Normal"
    
    # Test predicting a brute-force attack
    brute_features = {
        "event_id": "EVT333",
        "timestamp": "2026-08-27T10:30:00",
        "failed_attempts": 10,
        "request_frequency": 8,
        "is_login": 1,
        "is_sensitive_resource": 0,
        "is_unusual_location": 0,
        "is_api_or_resource_access": 0
    }
    pred_brute = predict_threat(brute_features)
    assert pred_brute["threat_status"] == "Suspicious"
    assert "brute-force" in pred_brute["threat_type"].lower()
