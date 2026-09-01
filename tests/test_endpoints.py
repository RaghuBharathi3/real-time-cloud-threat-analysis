import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "cloud_providers" in data

def test_cloud_status_endpoint(client):
    response = client.get("/api/v1/cloud/status", headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert "aws" in data["providers"]
    assert "azure" in data["providers"]
    assert "gcp" in data["providers"]
    assert "oci" in data["providers"]

def test_cloud_test_connection_endpoints(client):
    for provider in ["aws", "azure", "gcp", "oci"]:
        response = client.post(f"/api/v1/cloud/test-connection/{provider}", headers={"X-User-ID": "usr_admin"})
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == provider
        assert data["status"] in ["CONNECTED", "CONFIGURED", "DEMO MODE", "INVALID", "INSUFFICIENT_PERMISSIONS"]

def test_model_train_endpoint(client):
    response = client.post("/api/v1/model/train", headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "metrics" in data
    assert data["metrics"]["accuracy"] > 0.80

def test_model_metrics_endpoint(client):
    response = client.get("/api/v1/model/metrics", headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data
    assert "feature_importances" in data

def test_pipeline_run_endpoint(client):
    raw_event = {
        "event_id": "EVT_TEST_API_01",
        "timestamp": "2026-09-01T12:30:00Z",
        "cloud_provider": "aws",
        "user_id": "admin_test",
        "event_type": "resource_access",
        "ip_address": "192.168.1.50",
        "location": "US",
        "failed_attempts": 0,
        "resource": "s3_bucket_finance",
        "request_frequency": 2
    }
    response = client.post("/api/v1/pipeline/run", json=raw_event, headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert data["event_id"] == "EVT_TEST_API_01"
    assert "features" in data
    assert "detection_result" in data
    assert "risk_score" in data
    assert "severity" in data
    assert "compliance" in data

def test_pipeline_simulate_next_endpoint(client):
    response = client.post("/api/v1/pipeline/simulate-next", headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data
    assert "detection_result" in data
    assert data["detection_result"]["threat_status"] in ["Normal", "Suspicious"]

def test_demo_scenarios_endpoint(client):
    for scen in ["aws_brute_force", "azure_keyvault", "gcp_storage_burst", "oci_normal", "aws_normal"]:
        response = client.post(f"/api/v1/pipeline/demo-scenario/{scen}", headers={"X-User-ID": "usr_pro"})
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert "severity" in data
        assert "compliance" in data

def test_admin_audit_logs_endpoint(client):
    # Free user should be rejected (403)
    res_forbidden = client.get("/api/v1/admin/audit-logs", headers={"X-User-ID": "usr_free"})
    assert res_forbidden.status_code == 403

    # Admin user should succeed
    res_ok = client.get("/api/v1/admin/audit-logs", headers={"X-User-ID": "usr_admin"})
    assert res_ok.status_code == 200
    logs = res_ok.json()
    assert isinstance(logs, list)

def test_cloud_sync_endpoint(client):
    for provider in ["aws", "azure", "gcp", "oci"]:
        response = client.post(f"/api/v1/cloud/sync/{provider}?limit=2", headers={"X-User-ID": "usr_pro"})
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == provider
        assert data["synced_count"] >= 0
        assert "new_inserted_count" in data
        assert "skipped_duplicates_count" in data
        assert "source_mode" in data

def test_alerts_endpoint(client):
    response = client.get("/api/v1/alerts?limit=10", headers={"X-User-ID": "usr_admin"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        alert = data[0]
        assert "event_id" in alert
        assert "risk_score" in alert
        assert "severity" in alert
        assert "compliance" in alert
        assert "source_mode" in alert

def test_rate_limiter_enforcement(client):
    # ML retrain limit is 5 req/min. Triggering 6 consecutive requests must yield HTTP 429.
    rate_limited = False
    for i in range(8):
        res = client.post("/api/v1/model/train", headers={"X-User-ID": "usr_admin"})
        if res.status_code == 429:
            rate_limited = True
            assert "Rate limit exceeded" in res.json().get("detail", "")
            assert "Retry-After" in res.headers
            break
    assert rate_limited, "Rate limiter should have triggered HTTP 429 after exceeding quota"
