import os
import sys
import pytest

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.adapters import get_adapter, get_all_adapters, get_multi_cloud_status
from app.adapters.aws_adapter import AWSAdapter
from app.adapters.azure_adapter import AzureAdapter
from app.adapters.gcp_adapter import GCPAdapter
from app.adapters.oci_adapter import OCIAdapter
from app.modules.module1_event_collection import validate_raw_event, validate_batch_events, SecurityEvent
from app.modules.module2_preprocessing import preprocess_single_event
from app.modules.module3_threat_detection import predict_threat, generate_compliance_recommendations

def test_cloud_adapters_registered():
    adapters = get_all_adapters()
    assert "aws" in adapters
    assert "azure" in adapters
    assert "gcp" in adapters
    assert "oci" in adapters

def test_aws_adapter_live_validation():
    adapter = get_adapter("aws")
    assert adapter is not None
    res = adapter.validate_credentials()
    assert res["provider"] == "aws"
    assert res["status"] in ["CONNECTED", "CONFIGURED"]
    assert "arn" in res or "account_id" in res

def test_azure_adapter_live_validation():
    adapter = get_adapter("azure")
    assert adapter is not None
    res = adapter.validate_credentials()
    assert res["provider"] == "azure"
    assert res["status"] in ["CONNECTED", "CONFIGURED"]

def test_gcp_adapter_live_validation():
    adapter = get_adapter("gcp")
    assert adapter is not None
    res = adapter.validate_credentials()
    assert res["provider"] == "gcp"
    assert res["status"] in ["CONNECTED", "CONFIGURED"]

def test_oci_adapter_validation():
    adapter = get_adapter("oci")
    assert adapter is not None
    res = adapter.validate_credentials()
    assert res["provider"] == "oci"
    assert res["status"] in ["CONNECTED", "DEMO MODE", "CONFIGURED"]

def test_aws_event_normalization():
    adapter = get_adapter("aws")
    raw_cloudtrail = {
        "EventId": "trail-12345",
        "EventTime": "2026-09-01T12:00:00Z",
        "Username": "admin_user",
        "EventName": "ConsoleLogin",
        "CloudTrailEvent": '{"sourceIPAddress": "198.51.100.22"}',
        "Resources": [{"ResourceName": "s3_bucket_finance"}]
    }
    normalized = adapter.normalize_event(raw_cloudtrail)
    assert normalized["event_id"] == "trail-12345"
    assert normalized["cloud_provider"] == "aws"
    assert normalized["event_type"] == "login"
    assert normalized["ip_address"] == "198.51.100.22"
    
    validated = validate_raw_event(normalized)
    assert isinstance(validated, SecurityEvent)

def test_azure_event_normalization():
    adapter = get_adapter("azure")
    raw_azure = {
        "id": "az-evt-999",
        "eventTimestamp": "2026-09-01T12:05:00Z",
        "caller": "admin@cloudsecurity.onmicrosoft.com",
        "operationName": {"value": "Microsoft.KeyVault/vaults/secrets/read"},
        "callerIpAddress": "20.198.118.5",
        "resourceId": "azure_keyvault"
    }
    normalized = adapter.normalize_event(raw_azure)
    assert normalized["event_id"] == "az-evt-999"
    assert normalized["cloud_provider"] == "azure"
    assert normalized["event_type"] == "resource_access"
    
    validated = validate_raw_event(normalized)
    assert isinstance(validated, SecurityEvent)

def test_gcp_event_normalization():
    adapter = get_adapter("gcp")
    raw_gcp = {
        "insertId": "gcp-audit-555",
        "timestamp": "2026-09-01T12:10:00Z",
        "protoPayload": {
            "authenticationInfo": {"principalEmail": "operator@cloud-security.iam.gserviceaccount.com"},
            "methodName": "storage.objects.get",
            "requestMetadata": {"callerIp": "35.192.10.15"},
            "resourceName": "gcp_cloud_storage"
        }
    }
    normalized = adapter.normalize_event(raw_gcp)
    assert normalized["event_id"] == "gcp-audit-555"
    assert normalized["cloud_provider"] == "gcp"
    assert normalized["event_type"] == "resource_access"
    
    validated = validate_raw_event(normalized)
    assert isinstance(validated, SecurityEvent)

def test_oci_event_normalization():
    adapter = get_adapter("oci")
    raw_oci = {
        "eventID": "oci-guard-777",
        "eventTime": "2026-09-01T12:15:00Z",
        "data": {
            "identity": {"principalName": "oracle_operator"},
            "eventName": "com.oraclecloud.objectstorage.getobject",
            "request": {"callerIp": "130.35.10.22"},
            "resourceName": "oci_object_store"
        }
    }
    normalized = adapter.normalize_event(raw_oci)
    assert normalized["event_id"] == "oci-guard-777"
    assert normalized["cloud_provider"] == "oci"
    assert normalized["event_type"] == "resource_access"
    
    validated = validate_raw_event(normalized)
    assert isinstance(validated, SecurityEvent)

def test_compliance_recommendations_engine():
    comp = generate_compliance_recommendations("brute_force", "CRITICAL", {"failed_attempts": 8})
    assert "nist_csf" in comp["framework_mappings"]
    assert "cis_controls" in comp["framework_mappings"]
    assert "iso_27001" in comp["framework_mappings"]
    assert "MFA" in comp["actionable_recommendation"]

def test_batch_validation_error_isolation():
    events = [
        {
            "event_id": "EVT1",
            "timestamp": "2026-09-01T12:00:00Z",
            "cloud_provider": "aws",
            "user_id": "u1",
            "event_type": "login",
            "ip_address": "1.1.1.1",
            "resource": "cloud_console"
        },
        {
            "event_id": "EVT2_BAD",
            "timestamp": "bad_timestamp",
            "cloud_provider": "invalid_cloud",
            "user_id": "u2",
            "event_type": "bad_type",
            "ip_address": "bad_ip",
            "resource": "cloud_console"
        },
        {
            "event_id": "EVT3",
            "timestamp": "2026-09-01T12:00:00Z",
            "cloud_provider": "gcp",
            "user_id": "u3",
            "event_type": "api_call",
            "ip_address": "2.2.2.2",
            "resource": "gcp_kms"
        }
    ]
    valid, rejected = validate_batch_events(events)
    assert len(valid) == 2
    assert len(rejected) == 1
    assert rejected[0]["raw_event"]["event_id"] == "EVT2_BAD"
