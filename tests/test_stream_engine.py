import os
import sys
import pytest
import time
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.core.stream_engine import stream_engine
from app.db import SessionLocal, SecurityAlert

client = TestClient(app)

def test_stream_status_initial():
    """Verifies that initial stream status is queryable and well-formed."""
    res = client.get("/api/v1/stream/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "events_collected" in data
    assert "pipeline_stages" in data
    assert "activity_timeline" in data
    assert "collection" in data["pipeline_stages"]
    assert "validation" in data["pipeline_stages"]
    assert "ml_classification" in data["pipeline_stages"]
    assert "risk_engine" in data["pipeline_stages"]

def test_stream_start_stop_reset_lifecycle():
    """Verifies the complete stream state machine lifecycle."""
    # Ensure starting from clean state
    reset_res = client.post("/api/v1/stream/reset", headers={"X-User-ID": "usr_admin"})
    assert reset_res.status_code == 200

    # 1. Start Stream
    start_res = client.post("/api/v1/stream/start?interval=1.0", headers={"X-User-ID": "usr_admin"})
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["success"] is True
    assert start_data["session_id"].startswith("STREAM-")

    # 2. Duplicate start must be rejected with 409
    dup_res = client.post("/api/v1/stream/start?interval=1.0", headers={"X-User-ID": "usr_admin"})
    assert dup_res.status_code == 409

    # Check status during run
    status_res = client.get("/api/v1/stream/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "RUNNING"

    # Let background generator run for 2.5s
    time.sleep(2.5)

    status_running = client.get("/api/v1/stream/status").json()
    assert status_running["status"] == "RUNNING"
    assert status_running["events_processed"] >= 1
    assert len(status_running["activity_timeline"]) >= 1

    # 3. Stop Stream
    stop_res = client.post("/api/v1/stream/stop", headers={"X-User-ID": "usr_admin"})
    assert stop_res.status_code == 200
    assert stop_res.json()["success"] is True

    status_stopped = client.get("/api/v1/stream/status").json()
    assert status_stopped["status"] == "STOPPED"
    saved_count = status_stopped["events_processed"]
    assert saved_count >= 1

    # Verify that stopping preserves session metrics
    time.sleep(1.0)
    status_stopped_again = client.get("/api/v1/stream/status").json()
    assert status_stopped_again["events_processed"] == saved_count

    # 4. Reset Stream
    reset_res = client.post("/api/v1/stream/reset", headers={"X-User-ID": "usr_admin"})
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    status_reset = client.get("/api/v1/stream/status").json()
    assert status_reset["status"] == "IDLE"
    assert status_reset["events_collected"] == 0
    assert status_reset["events_processed"] == 0
    assert status_reset["threats_detected"] == 0
    assert status_reset["critical_threats"] == 0
    assert status_reset["average_risk"] == 0.0
    assert status_reset["session_id"] is None
    assert len(status_reset["activity_timeline"]) == 0
    assert status_reset["pipeline_stages"]["collection"]["status"] == "IDLE"
    assert status_reset["pipeline_stages"]["ml_classification"]["status"] == "IDLE"

def test_stream_clear_demo_data():
    """Verifies that clear-demo-data purges DEMO records while preserving REAL cloud records."""
    db = SessionLocal()
    # Insert a real event and a demo event
    demo_alert = SecurityAlert(
        event_id="TEST-DEMO-PURGE-01",
        timestamp="2026-09-02T14:00:00",
        cloud_provider="aws",
        user_id="demo_user",
        event_type="login",
        ip_address="192.168.1.1",
        location="US",
        failed_attempts=1,
        resource="test",
        request_frequency=1,
        threat_status="Normal",
        threat_type="Normal",
        confidence=0.99,
        risk_score=10,
        severity="LOW",
        source_mode="DEMO"
    )
    real_alert = SecurityAlert(
        event_id="TEST-REAL-PRESERVE-01",
        timestamp="2026-09-02T14:00:00",
        cloud_provider="aws",
        user_id="real_admin",
        event_type="api_call",
        ip_address="192.168.1.2",
        location="US",
        failed_attempts=0,
        resource="s3_bucket",
        request_frequency=1,
        threat_status="Normal",
        threat_type="Normal",
        confidence=0.99,
        risk_score=10,
        severity="LOW",
        source_mode="REAL"
    )
    db.add(demo_alert)
    db.add(real_alert)
    db.commit()

    res = client.post("/api/v1/stream/clear-demo-data", headers={"X-User-ID": "usr_admin"})
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Real alert should still exist in DB
    persisted_real = db.query(SecurityAlert).filter(SecurityAlert.event_id == "TEST-REAL-PRESERVE-01").first()
    assert persisted_real is not None

    # Demo alert should be purged
    purged_demo = db.query(SecurityAlert).filter(SecurityAlert.event_id == "TEST-DEMO-PURGE-01").first()
    assert purged_demo is None

    # Cleanup
    db.delete(persisted_real)
    db.commit()
    db.close()
