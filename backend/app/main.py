import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .config import settings
from .db import init_db, SessionLocal, SecurityAlert, UserProfile, BillingOrder, AuditLog, log_audit_event
from .modules.module1_event_collection import validate_security_event, SecurityEvent
from .modules.module2_preprocessing import preprocess_event
from .modules.module3_threat_detection import predict_threat, train_threat_model, get_loaded_metrics
from .adapters import get_adapter, get_all_adapters, get_multi_cloud_status
from .core.rate_limiter import check_rate_limit

# Initialize SQLite tables and default users
init_db()

app = FastAPI(
    title="AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments",
    version="2.0.0",
    description="Multi-cloud intrusion detection, ML risk scoring, and automated compliance recommendations engine."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)) -> UserProfile:
    user_id = x_user_id or "usr_free"
    user = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not user:
        user = db.query(UserProfile).filter(UserProfile.user_id == "usr_free").first()
    return user

def require_admin(user: UserProfile = Depends(get_current_user)):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Admin privilege required to perform this action."
        )
    return user

def require_pro_tier(user: UserProfile = Depends(get_current_user)):
    if user.is_pro != 1 and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Multi-Cloud feature requires an active Pro Subscription."
        )
    return user

# --- Health & Status ---

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "demo_mode": settings.is_demo_mode,
        "cloud_providers": settings.get_safe_cloud_summary(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# --- Cloud Adapters & Status ---

@app.get("/api/v1/cloud/status")
def get_cloud_status(refresh: bool = Query(False), user: UserProfile = Depends(get_current_user)):
    statuses = get_multi_cloud_status(refresh=refresh)
    return {
        "providers": statuses,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/v1/cloud/test-connection/{provider}", dependencies=[Depends(check_rate_limit("cloud_test"))])
def test_cloud_connection(
    provider: str,
    user: UserProfile = Depends(get_current_user)
):
    adapter = get_adapter(provider)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Unsupported cloud provider: '{provider}'")
    
    res = adapter.validate_credentials()
    log_audit_event(
        actor=user.username,
        action="CLOUD_CONNECTION_TEST",
        details=f"Tested {provider.upper()} connection. Status: {res.get('status')}"
    )
    return res

@app.post("/api/v1/cloud/sync/{provider}", dependencies=[Depends(check_rate_limit("cloud_sync"))])
def sync_cloud_logs(
    provider: str,
    limit: int = Query(10, ge=1, le=50),
    lookback_minutes: Optional[int] = Query(None, ge=1, le=1440),
    user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if provider.lower() not in ["aws"] and user.is_pro != 1 and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail=f"Ingestion from {provider.upper()} requires a Pro subscription."
        )

    adapter = get_adapter(provider)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Unsupported cloud provider: '{provider}'")

    effective_lookback = lookback_minutes or int(settings.get("COLLECTION_LOOKBACK_MINUTES", 60))
    raw_events = adapter.collect_events(limit=limit, lookback_minutes=effective_lookback)
    
    processed = []
    new_inserted = 0
    skipped_duplicates = 0

    for raw in raw_events:
        try:
            canonical = adapter.normalize_event(raw)
            validated = validate_security_event(canonical)
            features = preprocess_event(validated.model_dump())
            threat_res = predict_threat(features, resource_name=validated.resource)

            # Deduplication & Idempotency Check
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
                new_inserted += 1
            else:
                skipped_duplicates += 1

            processed.append({
                "event_id": validated.event_id,
                "cloud_provider": validated.cloud_provider,
                "threat_status": threat_res["threat_status"],
                "threat_type": threat_res["threat_type"],
                "risk_score": threat_res["risk_score"],
                "severity": threat_res["severity"],
                "compliance": threat_res.get("compliance", {}),
                "source_mode": canonical.get("source_mode", adapter.source_mode)
            })
        except Exception as e:
            continue

    log_audit_event(
        actor=user.username,
        action="CLOUD_SYNC",
        details=f"Synchronized {len(processed)} events from {provider.upper()} ({new_inserted} new, {skipped_duplicates} duplicates skipped)."
    )

    return {
        "provider": provider,
        "status": adapter.last_status,
        "source_mode": adapter.source_mode,
        "synced_count": len(processed),
        "new_inserted_count": new_inserted,
        "skipped_duplicates_count": skipped_duplicates,
        "lookback_minutes": effective_lookback,
        "message": adapter.last_collection_message or f"Processed {len(processed)} events ({new_inserted} new).",
        "events": processed
    }

# --- Core Pipeline Execution ---

@app.post("/api/v1/pipeline/run", dependencies=[Depends(check_rate_limit("pipeline"))])
def run_pipeline(
    raw_event: Dict[str, Any], 
    user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    provider = str(raw_event.get("cloud_provider", "aws")).lower()
    if provider != "aws" and user.is_pro != 1 and user.role != "ADMIN":
        raise HTTPException(
            status_code=403, 
            detail=f"Security event ingestion from '{provider.upper()}' requires an upgraded Pro Subscription."
        )

    # Module 1
    validated_event = validate_security_event(raw_event)
    
    # Module 2
    preprocessed_features = preprocess_event(validated_event.model_dump())
    
    # Module 3 + Risk Engine + Compliance Recommendations
    threat_result = predict_threat(preprocessed_features, resource_name=validated_event.resource)
    
    # Store in Database
    db_alert = SecurityAlert(
        event_id=validated_event.event_id,
        timestamp=validated_event.timestamp,
        cloud_provider=validated_event.cloud_provider,
        user_id=validated_event.user_id,
        event_type=validated_event.event_type,
        ip_address=validated_event.ip_address,
        location=validated_event.location,
        failed_attempts=validated_event.failed_attempts,
        resource=validated_event.resource,
        request_frequency=validated_event.request_frequency,
        threat_status=threat_result["threat_status"],
        threat_type=threat_result["threat_type"],
        confidence=threat_result["confidence"],
        risk_score=threat_result["risk_score"],
        severity=threat_result["severity"],
        reasons=json.dumps(threat_result["reason"]),
        compliance_recommendations=json.dumps(threat_result.get("compliance", {})),
        source_mode=raw_event.get("source_mode", "REAL")
    )
    
    existing = db.query(SecurityAlert).filter(SecurityAlert.event_id == validated_event.event_id).first()
    if not existing:
        db.add(db_alert)
        db.commit()
    
    return {
        "event_id": validated_event.event_id,
        "raw_event": validated_event.model_dump(),
        "features": preprocessed_features,
        "detection_result": threat_result,
        "risk_score": threat_result["risk_score"],
        "severity": threat_result["severity"],
        "compliance": threat_result.get("compliance", {}),
        "source_mode": raw_event.get("source_mode", "REAL")
    }

# --- Deterministic Demo Scenarios ---

DEMO_SCENARIOS = {
    "aws_brute_force": {
        "event_id": "DEMO-AWS-BRUTEFORCE",
        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
        "cloud_provider": "aws",
        "user_id": "sec_intruder",
        "event_type": "login",
        "ip_address": "198.51.100.42",
        "location": "RU",
        "failed_attempts": 9,
        "resource": "ec2_admin_portal",
        "request_frequency": 15
    },
    "azure_keyvault": {
        "event_id": "DEMO-AZURE-KEYVAULT",
        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
        "cloud_provider": "azure",
        "user_id": "suspicious_actor",
        "event_type": "resource_access",
        "ip_address": "203.0.113.88",
        "location": "CN",
        "failed_attempts": 0,
        "resource": "azure_keyvault",
        "request_frequency": 12
    },
    "gcp_storage_burst": {
        "event_id": "DEMO-GCP-DATABURST",
        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
        "cloud_provider": "gcp",
        "user_id": "api_crawler",
        "event_type": "api_call",
        "ip_address": "192.0.2.140",
        "location": "US",
        "failed_attempts": 0,
        "resource": "gcp_kms",
        "request_frequency": 35
    },
    "oci_normal": {
        "event_id": "DEMO-OCI-STANDARD",
        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
        "cloud_provider": "oci",
        "user_id": "oracle_operator",
        "event_type": "resource_access",
        "ip_address": "130.35.10.22",
        "location": "US",
        "failed_attempts": 0,
        "resource": "oci_object_store",
        "request_frequency": 2
    },
    "aws_normal": {
        "event_id": "DEMO-AWS-STANDARD",
        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
        "cloud_provider": "aws",
        "user_id": "dev_analyst",
        "event_type": "resource_access",
        "ip_address": "54.239.28.85",
        "location": "US",
        "failed_attempts": 0,
        "resource": "s3_public_assets",
        "request_frequency": 1
    }
}

@app.post("/api/v1/pipeline/demo-scenario/{scenario_name}", dependencies=[Depends(check_rate_limit("pipeline"))])
def trigger_demo_scenario(
    scenario_name: str,
    user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scen = DEMO_SCENARIOS.get(scenario_name.lower())
    if not scen:
        raise HTTPException(
            status_code=404, 
            detail=f"Scenario '{scenario_name}' not found. Available: {list(DEMO_SCENARIOS.keys())}"
        )
    
    # Generate unique ID and fresh timestamp
    unique_event = dict(scen)
    now_str = datetime.now(timezone.utc).isoformat()[:19]
    unique_event["event_id"] = f"{scen['event_id']}-{datetime.now(timezone.utc).strftime('%H%M%S')}"
    unique_event["timestamp"] = now_str
    unique_event["source_mode"] = "DEMO"

    if unique_event["cloud_provider"] != "aws" and user.is_pro != 1 and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail=f"Demo scenario for {unique_event['cloud_provider'].upper()} requires Pro Tier."
        )

    # Ingest through entire Canonical Pipeline
    val = validate_security_event(unique_event)
    feat = preprocess_event(val.model_dump())
    threat_res = predict_threat(feat, resource_name=val.resource)

    db_alert = SecurityAlert(
        event_id=val.event_id,
        timestamp=val.timestamp,
        cloud_provider=val.cloud_provider,
        user_id=val.user_id,
        event_type=val.event_type,
        ip_address=val.ip_address,
        location=val.location,
        failed_attempts=val.failed_attempts,
        resource=val.resource,
        request_frequency=val.request_frequency,
        threat_status=threat_res["threat_status"],
        threat_type=threat_res["threat_type"],
        confidence=threat_res["confidence"],
        risk_score=threat_res["risk_score"],
        severity=threat_res["severity"],
        reasons=json.dumps(threat_res["reason"]),
        compliance_recommendations=json.dumps(threat_res.get("compliance", {})),
        source_mode="DEMO"
    )
    db.add(db_alert)
    db.commit()

    return {
        "event_id": val.event_id,
        "raw_event": val.model_dump(),
        "features": feat,
        "detection_result": threat_res,
        "risk_score": threat_res["risk_score"],
        "severity": threat_res["severity"],
        "compliance": threat_res.get("compliance", {}),
        "source_mode": "DEMO"
    }

@app.post("/api/v1/pipeline/simulate-next", dependencies=[Depends(check_rate_limit("pipeline"))])
def simulate_next_event(
    user: UserProfile = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    eval_csv = os.path.join(root_dir, "data", "raw", "security_events_eval.csv")
    
    if not os.path.exists(eval_csv):
        raise HTTPException(status_code=404, detail="Simulation dataset not found on disk.")
        
    import pandas as pd
    df = pd.read_csv(eval_csv)
    sample = df.sample(n=1).iloc[0].to_dict()
    
    unique_id = f"EVT{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S%f')[:14]}"
    sample["event_id"] = unique_id
    sample["timestamp"] = datetime.now(timezone.utc).isoformat()[:19]
    sample.pop("label", None)
    
    # Process through pipeline
    val = validate_security_event(sample)
    feat = preprocess_event(val.model_dump())
    threat_res = predict_threat(feat, resource_name=val.resource)
    
    db_alert = SecurityAlert(
        event_id=val.event_id,
        timestamp=val.timestamp,
        cloud_provider=val.cloud_provider,
        user_id=val.user_id,
        event_type=val.event_type,
        ip_address=val.ip_address,
        location=val.location,
        failed_attempts=val.failed_attempts,
        resource=val.resource,
        request_frequency=val.request_frequency,
        threat_status=threat_res["threat_status"],
        threat_type=threat_res["threat_type"],
        confidence=threat_res["confidence"],
        risk_score=threat_res["risk_score"],
        severity=threat_res["severity"],
        reasons=json.dumps(threat_res["reason"]),
        compliance_recommendations=json.dumps(threat_res.get("compliance", {})),
        source_mode="DEMO"
    )
    
    db.add(db_alert)
    db.commit()
    
    return {
        "event_id": val.event_id,
        "raw_event": val.model_dump(),
        "features": feat,
        "detection_result": threat_res,
        "risk_score": threat_res["risk_score"],
        "severity": threat_res["severity"],
        "compliance": threat_res.get("compliance", {}),
        "source_mode": "DEMO"
    }

# --- Alerts Feed ---

@app.get("/api/v1/alerts")
def get_alerts(limit: int = 50, db: Session = Depends(get_db)):
    records = db.query(SecurityAlert).order_by(SecurityAlert.timestamp.desc()).limit(limit).all()
    results = []
    for r in records:
        try:
            reasons_list = json.loads(r.reasons) if r.reasons else []
        except Exception:
            reasons_list = [r.reasons] if r.reasons else []

        try:
            comp_data = json.loads(r.compliance_recommendations) if r.compliance_recommendations else {}
        except Exception:
            comp_data = {}
            
        results.append({
            "event_id": r.event_id,
            "timestamp": r.timestamp,
            "cloud_provider": r.cloud_provider or "aws",
            "user_id": r.user_id,
            "event_type": r.event_type,
            "ip_address": r.ip_address,
            "location": r.location,
            "failed_attempts": r.failed_attempts,
            "resource": r.resource,
            "request_frequency": r.request_frequency,
            "threat_status": r.threat_status,
            "threat_type": r.threat_type,
            "confidence": r.confidence,
            "risk_score": r.risk_score if r.risk_score is not None else 10,
            "severity": r.severity or "LOW",
            "reasons": reasons_list,
            "compliance": comp_data,
            "source_mode": getattr(r, "source_mode", "DEMO") or "DEMO"
        })
    return results

# --- Model Metrics & Retraining ---

@app.get("/api/v1/model/metrics")
def get_model_metrics(user: UserProfile = Depends(get_current_user)):
    return get_loaded_metrics()

@app.post("/api/v1/model/train", dependencies=[Depends(check_rate_limit("ml_train"))])
def retrain_model(user: UserProfile = Depends(require_admin)):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    train_csv = os.path.join(root_dir, "data", "raw", "security_events.csv")
    eval_csv = os.path.join(root_dir, "data", "raw", "security_events_eval.csv")
    
    if not (os.path.exists(train_csv) and os.path.exists(eval_csv)):
        raise HTTPException(status_code=404, detail="Datasets for model training not found.")
        
    metrics = train_threat_model(train_csv, eval_csv)
    log_audit_event(
        actor=user.username,
        action="MODEL_RETRAIN",
        details=f"Re-fitted Random Forest model. New Accuracy: {metrics.get('accuracy', 0):.4f}"
    )
    return {
        "status": "success",
        "message": "Model retrained and saved successfully.",
        "metrics": metrics
    }

# --- User & Session API ---

@app.get("/api/v1/auth/users")
def get_all_mock_users(db: Session = Depends(get_db)):
    return db.query(UserProfile).all()

@app.get("/api/v1/auth/session")
def get_session(user: UserProfile = Depends(get_current_user)):
    return user

# --- Admin Audit Trail ---

@app.get("/api/v1/admin/audit-logs", dependencies=[Depends(check_rate_limit("admin"))])
def get_audit_logs(
    limit: int = 50,
    user: UserProfile = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs

# --- Billing Webhooks & Checkout ---

class CheckoutRequest(BaseModel):
    plan: str = Field(default="pro")

class WebhookPayload(BaseModel):
    payment_id: str
    order_id: str
    user_id: str

@app.post("/api/v1/billing/checkout", dependencies=[Depends(check_rate_limit("auth"))])
def create_checkout_order(
    req: CheckoutRequest,
    user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order_id = f"ord_mock_{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S')}"
    order = BillingOrder(
        order_id=order_id,
        user_id=user.user_id,
        amount=49900,
        currency="INR",
        status="created"
    )
    db.add(order)
    db.commit()
    return {"order_id": order_id, "amount": 49900, "currency": "INR"}

@app.post("/api/v1/billing/webhook")
def mock_payment_webhook(
    payload: WebhookPayload,
    x_mock_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = db.query(UserProfile).filter(UserProfile.user_id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User target not found.")
        
    order = db.query(BillingOrder).filter(BillingOrder.order_id == payload.order_id).first()
    if order:
        order.status = "paid"
        
    user.is_pro = 1
    db.commit()
    
    log_audit_event(
        actor=user.username,
        action="PLAN_UPGRADE",
        details=f"Upgraded subscription to PRO via Order {payload.order_id}."
    )
    
    return {
        "status": "success",
        "message": f"User '{user.username}' successfully upgraded to PRO Tier."
    }
