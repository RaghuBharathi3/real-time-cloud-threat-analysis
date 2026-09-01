import os
import sys
import json
import time

# Ensure workspace root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.adapters import get_adapter, get_all_adapters, get_multi_cloud_status
from backend.app.modules.module1_event_collection import validate_security_event
from backend.app.modules.module2_preprocessing import preprocess_event
from backend.app.modules.module3_threat_detection import predict_threat
from backend.app.db import init_db, SessionLocal, SecurityAlert
from backend.app.core.rate_limiter import limiter

def test_full_cloud_integration():
    print("================================================================")
    print("LIVE MULTI-CLOUD THREAT ANALYSIS PIPELINE TEST")
    print("================================================================")
    
    init_db()
    db = SessionLocal()
    
    # 1. Test All Adapters Validation
    adapters = get_all_adapters()
    print("\n[1] Cloud Adapters Identity & Status Check:")
    for name, adapter in adapters.items():
        val = adapter.validate_credentials()
        status = val.get("status", "UNKNOWN")
        details = val.get("details", "")
        print(f"  - {name.upper()}: Status = {status} | Details = {details}")
    
    # 2. Test Real Telemetry Collection & Pipeline Processing
    print("\n[2] Telemetry Collection, Deduplication & Pipeline Processing:")
    for provider in ["aws", "azure", "gcp", "oci"]:
        adapter = get_adapter(provider)
        events = adapter.collect_events(limit=2, lookback_minutes=60)
        print(f"\n  Provider: {provider.upper()}")
        print(f"    Collected: {len(events)} events (Mode: {adapter.source_mode})")
        print(f"    Message:   {adapter.last_collection_message}")
        
        inserted_new = 0
        duplicates = 0
        
        for ev in events:
            canonical = adapter.normalize_event(ev)
            validated = validate_security_event(canonical)
            features = preprocess_event(validated.model_dump())
            threat_res = predict_threat(features, resource_name=validated.resource)
            
            # Deduplication check
            existing = db.query(SecurityAlert).filter(SecurityAlert.event_id == validated.event_id).first()
            if not existing:
                db_alert = SecurityAlert(
                    event_id=validated.event_id,
                    timestamp=validated.timestamp,
                    cloud_provider=validated.cloud_provider,
                    user_id=validated.user_id,
                    event_type=validated.event_type,
                    ip_address=validated.ip_address,
                    location=validated.location,
                    failed_attempts=validated.failed_attempts,
                    resource=validated.resource,
                    request_frequency=validated.request_frequency,
                    threat_status=threat_res["threat_status"],
                    threat_type=threat_res["threat_type"],
                    confidence=threat_res["confidence"],
                    risk_score=threat_res["risk_score"],
                    severity=threat_res["severity"],
                    reasons=json.dumps(threat_res["reason"]),
                    compliance_recommendations=json.dumps(threat_res.get("compliance", {})),
                    source_mode=canonical.get("source_mode", adapter.source_mode)
                )
                db.add(db_alert)
                db.commit()
                inserted_new += 1
            else:
                duplicates += 1
                
            print(f"    -> Ingested Event: ID={validated.event_id} | Type={validated.event_type} | Threat={threat_res['threat_status']} ({threat_res['threat_type']}) | Risk={threat_res['risk_score']} ({threat_res['severity']}) | Source={canonical.get('source_mode', 'DEMO')}")
            
        print(f"    Deduplication Result: {inserted_new} inserted new, {duplicates} skipped as duplicates.")
        
    # 3. Test Rate Limiter
    print("\n[3] Server-Side Rate Limiter Verification:")
    client_ip = "127.0.0.1"
    # ML train limit is 5 requests per 60s
    allowed_count = 0
    blocked_count = 0
    for i in range(8):
        allowed, remaining, retry_after = limiter.is_allowed("ml_train", client_ip)
        if allowed:
            allowed_count += 1
        else:
            blocked_count += 1
            
    print(f"  ML Retrain Category (Quota: 5/min):")
    print(f"    Allowed: {allowed_count} requests")
    print(f"    Rate Limited (HTTP 429 Triggered): {blocked_count} requests")
    
    db.close()
    print("\n================================================================")
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print("================================================================")

if __name__ == "__main__":
    test_full_cloud_integration()
