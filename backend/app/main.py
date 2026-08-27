import os
import json
import random
import pandas as pd
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge

from .db import init_db, get_db, SecurityAlert
from .modules.module1_event_collection import SecurityEvent, validate_raw_event
from .modules.module2_preprocessing import preprocess_single_event
from .modules.module3_threat_detection import train_threat_model, predict_threat, get_loaded_metrics

app = FastAPI(title="Cloud Security Threat Detection Backend API")

# Enable CORS for React integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Telemetry Counters
EVENTS_COLLECTED = Counter("cloud_events_collected_total", "Total security events collected in Module 1")
THREATS_DETECTED = Counter("cloud_threats_detected_total", "Total suspicious security threats flagged in Module 3", ["threat_type"])
NORMAL_EVENTS = Counter("cloud_normal_events_total", "Total normal events identified")

# Project Root Directory Calculation
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Simulation global state index
SIMULATION_INDEX = 0

@app.on_event("startup")
def startup_event():
    # Initialize SQLite Database
    init_db()
    
    # Auto-train model if dataset exists and model doesn't
    train_path = os.path.join(ROOT_DIR, "data", "raw", "security_events.csv")
    eval_path = os.path.join(ROOT_DIR, "data", "raw", "security_events_eval.csv")
    model_path = os.path.join(os.path.dirname(__file__), "models", "threat_detector.joblib")
    
    if not os.path.exists(model_path):
        if os.path.exists(train_path) and os.path.exists(eval_path):
            print("[Startup] Training Random Forest Threat Detector...")
            try:
                metrics = train_threat_model(train_path, eval_path)
                print(f"[Startup] Training successful. Model accuracy: {metrics['accuracy']:.4f}")
            except Exception as e:
                print(f"[Startup] Training failed: {e}")
        else:
            print("[Startup] Training data not found. Model will be trained on demand.")

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "cloud-security-assistant"}

@app.post("/api/v1/events/collect")
async def collect_event(event: Dict[str, Any]):
    """
    Module 1: Basic validation of event schema.
    """
    try:
        validated_event = validate_raw_event(event)
        EVENTS_COLLECTED.inc()
        return {
            "status": "validated",
            "event_id": validated_event.event_id,
            "timestamp": validated_event.timestamp,
            "data": validated_event.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Module 1 Validation Error: {str(e)}")

@app.post("/api/v1/preprocess")
async def preprocess_event(event: Dict[str, Any]):
    """
    Module 2: Extracts features from validated event.
    """
    try:
        validated = validate_raw_event(event)
        features = preprocess_single_event(validated)
        return {
            "status": "preprocessed",
            "event_id": features["event_id"],
            "features": features
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Module 2 Preprocessing Error: {str(e)}")

@app.post("/api/v1/detect")
async def detect_threat(features: Dict[str, Any]):
    """
    Module 3: Run Random Forest prediction.
    """
    try:
        prediction = predict_threat(features)
        return {
            "status": "analyzed",
            "prediction": prediction
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Module 3 Threat Detection Error: {str(e)}")

@app.post("/api/v1/pipeline/run")
async def run_pipeline(raw_event: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Integrates Modules 1, 2, and 3: Runs full pipeline on a single incoming event
    and logs the alert/status to SQLite for dashboard view.
    """
    try:
        # Step 1: Validate Schema (Module 1)
        validated = validate_raw_event(raw_event)
        EVENTS_COLLECTED.inc()
        
        # Step 2: Preprocess & Feature Engineer (Module 2)
        features = preprocess_single_event(validated)
        
        # Step 3: Classify Threat (Module 3)
        prediction = predict_threat(features)
        
        # Telemetry updates
        if prediction["threat_status"] == "Suspicious":
            THREATS_DETECTED.labels(threat_type=prediction["threat_type"]).inc()
        else:
            NORMAL_EVENTS.inc()

        # Save to DB
        alert_db = SecurityAlert(
            event_id=validated.event_id,
            timestamp=validated.timestamp,
            user_id=validated.user_id,
            event_type=validated.event_type,
            ip_address=validated.ip_address,
            location=validated.location,
            resource=validated.resource,
            failed_attempts=validated.failed_attempts,
            request_frequency=validated.request_frequency,
            is_sensitive_resource=features["is_sensitive_resource"],
            is_unusual_location=features["is_unusual_location"],
            threat_status=prediction["threat_status"],
            threat_type=prediction["threat_type"],
            confidence=prediction["confidence"],
            reasons=json.dumps(prediction["reason"])
        )
        
        # Overwrite existing event if event_id matches
        existing = db.query(SecurityAlert).filter(SecurityAlert.event_id == validated.event_id).first()
        if existing:
            db.delete(existing)
            db.commit()
            
        db.add(alert_db)
        db.commit()
        db.refresh(alert_db)

        return {
            "event_id": validated.event_id,
            "raw_event": raw_event,
            "preprocessed_features": features,
            "detection_result": prediction
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Pipeline Execution Failed: {str(e)}")

@app.get("/api/v1/alerts", response_model=List[Dict[str, Any]])
async def list_alerts(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns recent alerts/logs saved in the DB.
    """
    alerts = db.query(SecurityAlert).order_by(SecurityAlert.processed_at.desc()).limit(limit).all()
    results = []
    for alert in alerts:
        results.append({
            "event_id": alert.event_id,
            "timestamp": alert.timestamp,
            "user_id": alert.user_id,
            "event_type": alert.event_type,
            "ip_address": alert.ip_address,
            "location": alert.location,
            "resource": alert.resource,
            "failed_attempts": alert.failed_attempts,
            "request_frequency": alert.request_frequency,
            "threat_status": alert.threat_status,
            "threat_type": alert.threat_type,
            "confidence": alert.confidence,
            "reasons": json.loads(alert.reasons),
            "processed_at": alert.processed_at.isoformat()
        })
    return results

@app.post("/api/v1/model/train")
async def train_model_endpoint():
    """
    Triggers model training pipeline and outputs metrics.
    """
    train_path = os.path.join(ROOT_DIR, "data", "raw", "security_events.csv")
    eval_path = os.path.join(ROOT_DIR, "data", "raw", "security_events_eval.csv")
    
    if not (os.path.exists(train_path) and os.path.exists(eval_path)):
        raise HTTPException(status_code=400, detail="Training datasets are missing. Run data/generate_data.py first.")
        
    try:
        metrics = train_threat_model(train_path, eval_path)
        return {
            "status": "success",
            "message": "Model trained and saved successfully.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training Failed: {str(e)}")

@app.get("/api/v1/model/metrics")
async def get_metrics_endpoint():
    """
    Returns currently stored model metrics.
    """
    metrics = get_loaded_metrics()
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics not found. Model might not be trained.")
    return metrics

@app.post("/api/v1/pipeline/simulate-next")
async def simulate_next_event(db: Session = Depends(get_db)):
    """
    Simulates a streaming-event ingestion by taking the next record from the
    evaluation dataset, passing it through the pipeline, and saving it to SQLite.
    """
    global SIMULATION_INDEX
    eval_path = os.path.join(ROOT_DIR, "data", "raw", "security_events_eval.csv")
    
    if not os.path.exists(eval_path):
        raise HTTPException(status_code=400, detail="Evaluation dataset is missing.")
        
    try:
        df = pd.read_csv(eval_path)
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="Evaluation dataset is empty.")
            
        # Get event row based on simulation index
        row = df.iloc[SIMULATION_INDEX % len(df)]
        SIMULATION_INDEX += 1
        
        # Parse fields to dict
        raw_event = {
            "event_id": str(row["event_id"]),
            "timestamp": str(row["timestamp"]),
            "user_id": str(row["user_id"]),
            "event_type": str(row["event_type"]),
            "ip_address": str(row["ip_address"]),
            "location": str(row["location"]) if pd.notna(row["location"]) else "Unknown",
            "failed_attempts": int(row["failed_attempts"]) if pd.notna(row["failed_attempts"]) else 0,
            "resource": str(row["resource"]),
            "request_frequency": int(row["request_frequency"]) if pd.notna(row["request_frequency"]) else 1
        }
        
        # Execute pipeline
        result = await run_pipeline(raw_event, db)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@app.get("/metrics")
async def prometheus_metrics():
    """
    Exports Prometheus telemetry dashboard metrics.
    """
    return HTTPResponseMetrics(generate_latest().decode("utf-8"))

def HTTPResponseMetrics(data: str):
    from fastapi import Response
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
