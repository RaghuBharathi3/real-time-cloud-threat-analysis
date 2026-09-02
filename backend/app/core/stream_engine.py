import time
import json
import threading
import os
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import pandas as pd

from ..modules.module1_event_collection import validate_security_event
from ..modules.module2_preprocessing import preprocess_event
from ..modules.module3_threat_detection import predict_threat
from ..db import SessionLocal, SecurityAlert

class StreamEngine:
    """
    Thread-Safe Authoritative Streaming & Real-Time Observability Engine.
    Manages the full lifecycle (IDLE, STARTING, RUNNING, STOPPING, STOPPED, RESETTING, ERROR),
    aggregates authoritative stream metrics, tracks pipeline stage statuses, and maintains
    a structured technical activity timeline.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        
        # State Machine
        self.status = "IDLE"  # IDLE, STARTING, RUNNING, STOPPING, STOPPED, RESETTING, ERROR
        self.error_message: Optional[str] = None
        self.session_id: Optional[str] = None
        self.start_time: Optional[str] = None
        self.stop_time: Optional[str] = None
        self._start_epoch: Optional[float] = None
        
        # Stream Metrics
        self.events_collected = 0
        self.events_processed = 0
        self.threats_detected = 0
        self.critical_threats = 0
        self.high_threats = 0
        self.medium_threats = 0
        self.low_events = 0
        self.total_risk_sum = 0
        self.average_risk = 0.0
        self.throughput_eps = 0.0
        self.last_event: Optional[Dict[str, Any]] = None
        
        self.provider_counts: Dict[str, int] = {
            "aws": 0,
            "azure": 0,
            "gcp": 0,
            "oci": 0,
            "demo": 0
        }
        
        self.threat_distribution: Dict[str, int] = {
            "Brute-Force": 0,
            "Unauthorized": 0,
            "Normal": 0
        }
        
        self.risk_distribution: Dict[str, int] = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0
        }
        
        # Pipeline Stages
        self.pipeline_stages: Dict[str, Dict[str, Any]] = {
            "collection": {"status": "IDLE", "last_activity": None, "details": "Waiting for stream start"},
            "validation": {"status": "IDLE", "last_activity": None, "details": "Module 1 Schema Validator ready"},
            "preprocessing": {"status": "IDLE", "last_activity": None, "details": "Module 2 Feature Extractor ready"},
            "ml_classification": {"status": "IDLE", "last_activity": None, "details": "Module 3 Random Forest ready"},
            "risk_engine": {"status": "IDLE", "last_activity": None, "details": "Deterministic Risk Scoring ready"},
            "database": {"status": "IDLE", "last_activity": None, "details": "Idempotent DB Persistence ready"},
            "dashboard": {"status": "CONNECTED", "last_activity": None, "details": "WebSocket/REST polling active"}
        }
        
        # Activity Timeline & Session Events
        self.activity_timeline: List[Dict[str, Any]] = []
        self.session_events: List[Dict[str, Any]] = []
        self._activity_counter = 0
        self._throughput_timestamps: List[float] = []

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _now_time(self) -> str:
        return datetime.now(timezone.utc).strftime("%H:%M:%S")

    def log_activity(self, stage: str, message: str, level: str = "INFO", event_id: Optional[str] = None):
        """Append an entry to the technical activity timeline (ring buffer of 50)."""
        self._activity_counter += 1
        entry = {
            "id": self._activity_counter,
            "timestamp": self._now_time(),
            "stage": stage.upper(),
            "level": level.upper(),
            "message": message,
            "event_id": event_id
        }
        self.activity_timeline.insert(0, entry)
        if len(self.activity_timeline) > 50:
            self.activity_timeline.pop()

    def get_status(self) -> Dict[str, Any]:
        """Return the authoritative stream status, metrics, and pipeline states."""
        with self._lock:
            # Calculate active duration
            duration = 0
            if self._start_epoch:
                if self.status == "RUNNING":
                    duration = int(time.time() - self._start_epoch)
                elif self.stop_time:
                    try:
                        stop_epoch = datetime.fromisoformat(self.stop_time).timestamp()
                        duration = int(stop_epoch - self._start_epoch)
                    except Exception:
                        duration = int(time.time() - self._start_epoch)

            # Calculate rolling throughput (events in last 10 seconds)
            now = time.time()
            self._throughput_timestamps = [t for t in self._throughput_timestamps if now - t <= 10.0]
            if len(self._throughput_timestamps) > 0 and duration > 0:
                self.throughput_eps = round(len(self._throughput_timestamps) / min(10.0, max(1.0, duration)), 1)
            else:
                self.throughput_eps = 0.0

            return {
                "status": self.status,
                "error_message": self.error_message,
                "session_id": self.session_id,
                "start_time": self.start_time,
                "stop_time": self.stop_time,
                "duration_seconds": duration,
                "events_collected": self.events_collected,
                "events_processed": self.events_processed,
                "threats_detected": self.threats_detected,
                "critical_threats": self.critical_threats,
                "high_threats": self.high_threats,
                "medium_threats": self.medium_threats,
                "low_events": self.low_events,
                "average_risk": self.average_risk,
                "throughput_eps": self.throughput_eps,
                "last_event": self.last_event,
                "provider_counts": self.provider_counts.copy(),
                "threat_distribution": self.threat_distribution.copy(),
                "risk_distribution": self.risk_distribution.copy(),
                "pipeline_stages": self.pipeline_stages.copy(),
                "activity_timeline": self.activity_timeline[:20]
            }

    def start(self, interval_seconds: float = 2.5) -> Dict[str, Any]:
        """Start the streaming session and spawn background generator thread."""
        with self._lock:
            if self.status == "RUNNING":
                return {"success": False, "message": "Stream is already running.", "session_id": self.session_id}
            
            self.status = "STARTING"
            self.error_message = None
            
            # Generate new unique Session ID
            session_suffix = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
            self.session_id = f"STREAM-{session_suffix}"
            self.start_time = self._now_iso()
            self.stop_time = None
            self._start_epoch = time.time()
            self._throughput_timestamps = []
            self._stop_event.clear()

            # Set pipeline stages to RUNNING
            for k in self.pipeline_stages:
                if k != "dashboard":
                    self.pipeline_stages[k]["status"] = "RUNNING"
                    self.pipeline_stages[k]["last_activity"] = self._now_time()
                    self.pipeline_stages[k]["details"] = "Active streaming pipeline"

            self.status = "RUNNING"
            self.log_activity("STREAM", f"Stream session {self.session_id} started successfully", "INFO")

        # Spawn background worker
        self._worker_thread = threading.Thread(target=self._worker_loop, args=(interval_seconds,), daemon=True)
        self._worker_thread.start()

        return {"success": True, "message": "Stream started.", "session_id": self.session_id}

    def stop(self) -> Dict[str, Any]:
        """Stop active stream while preserving session metrics, charts, and events."""
        with self._lock:
            if self.status not in ["RUNNING", "STARTING"]:
                return {"success": True, "message": f"Stream is already {self.status}.", "session_id": self.session_id}

            self.status = "STOPPING"
            self.log_activity("STREAM", f"Stopping stream session {self.session_id}", "INFO")

        # Signal thread
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)

        with self._lock:
            self.status = "STOPPED"
            self.stop_time = self._now_iso()
            for k in self.pipeline_stages:
                if k != "dashboard":
                    self.pipeline_stages[k]["status"] = "IDLE"
                    self.pipeline_stages[k]["details"] = "Stream stopped"
            self.log_activity("STREAM", f"Stream session {self.session_id} stopped cleanly", "INFO")

        return {"success": True, "message": "Stream stopped cleanly.", "session_id": self.session_id}

    def reset(self) -> Dict[str, Any]:
        """
        Reset ALL stream-specific state: stops worker, zeroes counters,
        clears session events, clears timeline, resets pipeline stages to IDLE.
        """
        # First ensure worker is stopped
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)

        with self._lock:
            self.status = "RESETTING"
            
            # Reset session identifiers & timers
            self.session_id = None
            self.start_time = None
            self.stop_time = None
            self._start_epoch = None
            self.error_message = None
            self._throughput_timestamps = []

            # Reset metrics & counters
            self.events_collected = 0
            self.events_processed = 0
            self.threats_detected = 0
            self.critical_threats = 0
            self.high_threats = 0
            self.medium_threats = 0
            self.low_events = 0
            self.total_risk_sum = 0
            self.average_risk = 0.0
            self.throughput_eps = 0.0
            self.last_event = None

            # Reset distributions
            self.provider_counts = {"aws": 0, "azure": 0, "gcp": 0, "oci": 0, "demo": 0}
            self.threat_distribution = {"Brute-Force": 0, "Unauthorized": 0, "Normal": 0}
            self.risk_distribution = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

            # Reset pipeline stages
            for k in self.pipeline_stages:
                self.pipeline_stages[k]["status"] = "IDLE" if k != "dashboard" else "CONNECTED"
                self.pipeline_stages[k]["last_activity"] = None
                self.pipeline_stages[k]["details"] = "Ready for new stream"

            # Clear session buffers
            self.session_events = []
            self.activity_timeline = []
            self._activity_counter = 0

            self.status = "IDLE"

        return {"success": True, "message": "Stream reset successfully to IDLE state."}

    def process_event(self, raw_event: Dict[str, Any], source_mode: str = "DEMO") -> Dict[str, Any]:
        """
        Execute full multi-stage pipeline on an event, update live metrics,
        persist to DB, and log structured timeline events.
        """
        start_t = time.time()
        now_str = self._now_time()

        with self._lock:
            self.events_collected += 1
            prov = (raw_event.get("cloud_provider") or "demo").lower()
            if prov in self.provider_counts:
                self.provider_counts[prov] += 1
            else:
                self.provider_counts["demo"] += 1

            self.pipeline_stages["collection"]["status"] = "RUNNING"
            self.pipeline_stages["collection"]["last_activity"] = now_str
            self.pipeline_stages["collection"]["details"] = f"Ingested {raw_event.get('event_id', 'EVT')} from {prov.upper()}"
            self.log_activity("COLLECTION", f"Ingested {raw_event.get('event_id', 'EVT')} from {prov.upper()}", "INFO", raw_event.get('event_id'))

        # Module 1: Validation
        try:
            val = validate_security_event(raw_event)
            with self._lock:
                self.pipeline_stages["validation"]["status"] = "RUNNING"
                self.pipeline_stages["validation"]["last_activity"] = now_str
                self.pipeline_stages["validation"]["details"] = f"Pydantic schema validation passed"
        except Exception as e:
            with self._lock:
                self.pipeline_stages["validation"]["status"] = "ERROR"
                self.pipeline_stages["validation"]["details"] = f"Validation failed: {str(e)}"
                self.log_activity("VALIDATION", f"Validation error on {raw_event.get('event_id')}: {str(e)}", "ERROR", raw_event.get('event_id'))
            raise e

        # Module 2: Feature Engineering
        try:
            feat = preprocess_event(val.model_dump())
            with self._lock:
                self.pipeline_stages["preprocessing"]["status"] = "RUNNING"
                self.pipeline_stages["preprocessing"]["last_activity"] = now_str
                self.pipeline_stages["preprocessing"]["details"] = f"6-dimensional feature vector extracted"
        except Exception as e:
            with self._lock:
                self.pipeline_stages["preprocessing"]["status"] = "ERROR"
                self.pipeline_stages["preprocessing"]["details"] = f"Feature extraction failed: {str(e)}"
                self.log_activity("PREPROCESSING", f"Feature error on {val.event_id}: {str(e)}", "ERROR", val.event_id)
            raise e

        # Module 3: ML Threat Detection & Risk Engine
        try:
            threat_res = predict_threat(feat, resource_name=val.resource)
            threat_status = threat_res["threat_status"]
            threat_type = threat_res["threat_type"]
            conf = threat_res["confidence"]
            risk = threat_res["risk_score"]
            sev = threat_res["severity"]

            with self._lock:
                self.pipeline_stages["ml_classification"]["status"] = "RUNNING"
                self.pipeline_stages["ml_classification"]["last_activity"] = now_str
                self.pipeline_stages["ml_classification"]["details"] = f"Random Forest: {threat_status} ({threat_type}) @ {int(conf*100)}%"

                self.pipeline_stages["risk_engine"]["status"] = "RUNNING"
                self.pipeline_stages["risk_engine"]["last_activity"] = now_str
                self.pipeline_stages["risk_engine"]["details"] = f"Risk Score: {risk}/100 ({sev})"

                self.log_activity("ML_MODEL", f"Classified {val.event_id} as {threat_type} (Conf: {int(conf*100)}%)", "INFO", val.event_id)
                self.log_activity("RISK_ENGINE", f"Calculated risk {risk}/100 ({sev}) for {val.event_id}", "WARN" if risk >= 60 else "INFO", val.event_id)
        except Exception as e:
            with self._lock:
                self.pipeline_stages["ml_classification"]["status"] = "ERROR"
                self.pipeline_stages["ml_classification"]["details"] = f"Inference failed: {str(e)}"
                self.log_activity("ML_MODEL", f"Inference failed on {val.event_id}: {str(e)}", "ERROR", val.event_id)
            raise e

        # Database Storage (Idempotent)
        try:
            db = SessionLocal()
            existing = db.query(SecurityAlert).filter(SecurityAlert.event_id == val.event_id).first()
            if not existing:
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
                    threat_status=threat_status,
                    threat_type=threat_type,
                    confidence=conf,
                    risk_score=risk,
                    severity=sev,
                    reasons=json.dumps(threat_res["reason"]),
                    compliance_recommendations=json.dumps(threat_res.get("compliance", {})),
                    source_mode=source_mode
                )
                db.add(db_alert)
                db.commit()
                with self._lock:
                    self.pipeline_stages["database"]["status"] = "RUNNING"
                    self.pipeline_stages["database"]["last_activity"] = now_str
                    self.pipeline_stages["database"]["details"] = f"Saved {val.event_id} to DB (Deduplicated)"
                    self.log_activity("DATABASE", f"Persisted {val.event_id} to database", "INFO", val.event_id)
            else:
                with self._lock:
                    self.pipeline_stages["database"]["status"] = "RUNNING"
                    self.pipeline_stages["database"]["last_activity"] = now_str
                    self.pipeline_stages["database"]["details"] = f"Skipped existing {val.event_id} (Deduplicated)"
            db.close()
        except Exception as e:
            with self._lock:
                self.pipeline_stages["database"]["status"] = "ERROR"
                self.pipeline_stages["database"]["details"] = f"DB insert error: {str(e)}"
                self.log_activity("DATABASE", f"DB insert error on {val.event_id}: {str(e)}", "ERROR", val.event_id)

        # Update Session Metrics
        with self._lock:
            self.events_processed += 1
            self._throughput_timestamps.append(time.time())
            
            if threat_status != "Normal":
                self.threats_detected += 1
                
            if sev == "CRITICAL":
                self.critical_threats += 1
                self.risk_distribution["CRITICAL"] += 1
            elif sev == "HIGH":
                self.high_threats += 1
                self.risk_distribution["HIGH"] += 1
            elif sev == "MEDIUM":
                self.medium_threats += 1
                self.risk_distribution["MEDIUM"] += 1
            else:
                self.low_events += 1
                self.risk_distribution["LOW"] += 1

            if threat_type in self.threat_distribution:
                self.threat_distribution[threat_type] += 1
            else:
                self.threat_distribution["Normal"] += 1

            self.total_risk_sum += risk
            self.average_risk = round(self.total_risk_sum / max(1, self.events_processed), 1)

            alert_dict = {
                "event_id": val.event_id,
                "timestamp": val.timestamp,
                "cloud_provider": val.cloud_provider,
                "user_id": val.user_id,
                "event_type": val.event_type,
                "ip_address": val.ip_address,
                "location": val.location,
                "failed_attempts": val.failed_attempts,
                "resource": val.resource,
                "request_frequency": val.request_frequency,
                "threat_status": threat_status,
                "threat_type": threat_type,
                "confidence": conf,
                "risk_score": risk,
                "severity": sev,
                "reasons": json.dumps(threat_res["reason"]),
                "compliance_recommendations": json.dumps(threat_res.get("compliance", {})),
                "source_mode": source_mode,
                "latency_ms": round((time.time() - start_t) * 1000, 1)
            }

            self.last_event = alert_dict
            self.session_events.insert(0, alert_dict)
            if len(self.session_events) > 100:
                self.session_events.pop()

        return alert_dict

    def _worker_loop(self, interval_seconds: float):
        """Background thread worker that feeds events continuously during active streaming."""
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        eval_csv = os.path.join(root_dir, "data", "raw", "security_events_eval.csv")
        
        df = None
        if os.path.exists(eval_csv):
            try:
                df = pd.read_csv(eval_csv)
            except Exception:
                df = None

        while not self._stop_event.is_set():
            try:
                if df is not None and len(df) > 0:
                    sample = df.sample(n=1).iloc[0].to_dict()
                    unique_id = f"EVT{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S%f')[:14]}"
                    sample["event_id"] = unique_id
                    sample["timestamp"] = datetime.now(timezone.utc).isoformat()[:19]
                    sample.pop("label", None)
                else:
                    providers = ["AWS", "AZURE", "GCP", "OCI"]
                    prov = random.choice(providers)
                    event_types = ["login", "resource_access", "api_call"]
                    etype = random.choice(event_types)
                    sample = {
                        "event_id": f"EVT{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S%f')[:14]}",
                        "timestamp": datetime.now(timezone.utc).isoformat()[:19],
                        "cloud_provider": prov,
                        "user_id": f"analyst_{random.randint(100, 999)}@{prov.lower()}.corp",
                        "event_type": etype,
                        "ip_address": f"{random.randint(10, 200)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                        "location": random.choice(["US-East", "EU-West", "AP-South", "Foreign-IP"]),
                        "failed_attempts": random.choice([0, 0, 0, 1, 2, 7, 10]),
                        "resource": random.choice(["s3://finance-records", "vault/prod-keys", "iam/admin-role", "compute/app-worker"]),
                        "request_frequency": random.randint(1, 45)
                    }

                self.process_event(sample, source_mode="DEMO")
            except Exception as e:
                with self._lock:
                    self.error_message = str(e)
                    self.log_activity("STREAM", f"Worker error: {str(e)}", "ERROR")

            # Sleep in small slices to respond swiftly to stop signal
            sleep_steps = int(interval_seconds / 0.2)
            for _ in range(max(1, sleep_steps)):
                if self._stop_event.is_set():
                    break
                time.sleep(0.2)

# Global Singleton Instance
stream_engine = StreamEngine()
