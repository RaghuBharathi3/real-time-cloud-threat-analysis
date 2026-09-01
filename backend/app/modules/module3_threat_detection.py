import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from .module2_preprocessing import preprocess_dataframe

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "threat_detector.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.joblib")

FEATURES = [
    "failed_attempts", 
    "request_frequency", 
    "is_login", 
    "is_sensitive_resource", 
    "is_unusual_location", 
    "is_api_or_resource_access"
]

def generate_compliance_recommendations(
    prediction: str,
    severity: str,
    features: Dict[str, Any],
    resource: str = "cloud_resource"
) -> Dict[str, Any]:
    """
    Compliance Analysis Engine:
    Maps threat classification & risk posture into actionable security recommendations
    and industry standard compliance mappings (NIST CSF 2.0, CIS Controls v8, ISO 27001:2022).
    """
    if prediction == "brute_force":
        recommendation = "Credential attack detected: enforce Multi-Factor Authentication (MFA), trigger password reset, and apply rate-limiting IP blacklists."
        frameworks = {
            "nist_csf": "PR.AA-01 (Identity Management) | DE.CM-01 (Continuous Monitoring)",
            "cis_controls": "CIS 5.4 (Enforce MFA) | CIS 6.2 (Access Control Monitoring)",
            "iso_27001": "A.9.4.2 (Secure Log-on Procedures) | A.12.6.1 (Management of Technical Vulnerabilities)"
        }
    elif prediction == "unauthorized_access":
        recommendation = f"Sensitive resource anomaly on '{resource}': review IAM role assignments, enforce principle of least privilege, and rotate cryptographic access keys."
        frameworks = {
            "nist_csf": "PR.AC-04 (Principle of Least Privilege) | RS.AN-01 (Incident Analysis)",
            "cis_controls": "CIS 3.11 (Sensitive Data Protection) | CIS 6.8 (Privileged Access Management)",
            "iso_27001": "A.9.4.1 (Information Access Restriction) | A.13.1.1 (Network Security Controls)"
        }
    else:
        recommendation = "Standard baseline telemetry: activity adheres to authorized access policies. Continue normal audit retention."
        frameworks = {
            "nist_csf": "DE.AE-01 (Baseline Telemetry & Event Analysis)",
            "cis_controls": "CIS 8.2 (Collect & Retain Audit Logs)",
            "iso_27001": "A.12.4.1 (Event Logging & System Auditing)"
        }

    return {
        "actionable_recommendation": recommendation,
        "framework_mappings": frameworks
    }

def calculate_risk_score(
    prediction: str,
    confidence: float,
    features: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Risk Scoring Engine:
    Computes a deterministic, explainable risk score (0-100) and severity category.
    Categories:
      0-29   : LOW
      30-59  : MEDIUM
      60-79  : HIGH
      80-100 : CRITICAL
    """
    failed_attempts = features.get("failed_attempts", 0)
    request_frequency = features.get("request_frequency", 1)
    is_sensitive = features.get("is_sensitive_resource", 0)
    is_unusual = features.get("is_unusual_location", 0)

    if prediction == "normal":
        base_score = 10
        if failed_attempts > 0:
            base_score += min(15, failed_attempts * 5)
        if request_frequency > 10:
            base_score += 10
        if is_unusual:
            base_score += 5
        risk_score = min(29, max(5, int(base_score)))
    elif prediction == "brute_force":
        base_score = 65 + int(confidence * 20)
        base_score += min(15, failed_attempts * 2)
        risk_score = min(100, max(60, int(base_score)))
    elif prediction == "unauthorized_access":
        base_score = 60 + int(confidence * 20)
        if is_sensitive:
            base_score += 10
        if is_unusual:
            base_score += 5
        if request_frequency > 10:
            base_score += min(5, request_frequency // 5)
        risk_score = min(100, max(60, int(base_score)))
    else:
        risk_score = 30

    if risk_score >= 80:
        severity = "CRITICAL"
    elif risk_score >= 60:
        severity = "HIGH"
    elif risk_score >= 30:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "risk_score": risk_score,
        "severity": severity
    }

def train_threat_model(train_csv_path: str, eval_csv_path: str) -> Dict[str, Any]:
    """
    Loads, preprocesses, trains a Random Forest Classifier, and saves it.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    train_df_raw = pd.read_csv(train_csv_path)
    eval_df_raw = pd.read_csv(eval_csv_path)
    
    train_df = preprocess_dataframe(train_df_raw)
    eval_df = preprocess_dataframe(eval_df_raw)
    
    X_train = train_df[FEATURES]
    y_train = train_df["label"]
    
    X_eval = eval_df[FEATURES]
    y_eval = eval_df["label"]
    
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_eval)
    
    accuracy = float(accuracy_score(y_eval, y_pred))
    classes = clf.classes_.tolist()
    precision, recall, fscore, support = precision_recall_fscore_support(
        y_eval, y_pred, labels=classes, zero_division=0
    )
    
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        y_eval, y_pred, average="macro", zero_division=0
    )
    
    cm = confusion_matrix(y_eval, y_pred, labels=classes).tolist()
    importances = clf.feature_importances_.tolist()
    feature_importance_map = dict(zip(FEATURES, importances))
    
    metrics = {
        "accuracy": accuracy,
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "macro_f1": float(macro_f1),
        "classes": classes,
        "class_metrics": {
            cls: {
                "precision": float(p),
                "recall": float(r),
                "f1_score": float(f),
                "support": int(s)
            } for cls, p, r, f, s in zip(classes, precision, recall, fscore, support)
        },
        "confusion_matrix": cm,
        "feature_importances": feature_importance_map
    }
    
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(metrics, METRICS_PATH)
    
    return metrics

def predict_threat(preprocessed_features: Dict[str, Any], resource_name: str = "cloud_resource") -> Dict[str, Any]:
    """
    Predicts whether an event represents normal or suspicious activity,
    computes Risk Score and provides Compliance Recommendations.
    """
    if not os.path.exists(MODEL_PATH):
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(MODEL_DIR)))
        train_path = os.path.join(root_dir, "data", "raw", "security_events.csv")
        eval_path = os.path.join(root_dir, "data", "raw", "security_events_eval.csv")
        if os.path.exists(train_path) and os.path.exists(eval_path):
            train_threat_model(train_path, eval_path)
        else:
            return {
                "threat_status": "Unknown",
                "threat_type": "Model not trained",
                "confidence": 0.0,
                "risk_score": 0,
                "severity": "LOW",
                "reason": ["Model is not trained and training datasets were not found."],
                "compliance": {}
            }
            
    clf = joblib.load(MODEL_PATH)
    X = pd.DataFrame([preprocessed_features])[FEATURES]
    
    prediction = clf.predict(X)[0]
    probabilities = clf.predict_proba(X)[0]
    
    classes = clf.classes_.tolist()
    pred_idx = classes.index(prediction)
    confidence = float(probabilities[pred_idx])
    
    threat_status = "Normal" if prediction == "normal" else "Suspicious"
    
    threat_type_map = {
        "normal": "Normal Event",
        "brute_force": "Possible Brute-Force Activity",
        "unauthorized_access": "Possible Unauthorized Resource Access"
    }
    threat_type = threat_type_map.get(prediction, "Unknown Threat")
    
    # Explainable reasons
    reasons = []
    if prediction == "brute_force":
        reasons.append(f"Multiple failed authentication attempts detected ({preprocessed_features['failed_attempts']})")
        reasons.append("High probability of automated credential stuffing / password spray")
    elif prediction == "unauthorized_access":
        if preprocessed_features.get("is_sensitive_resource"):
            reasons.append("Access attempted against a sensitive or critical cloud infrastructure resource")
        if preprocessed_features.get("is_unusual_location"):
            reasons.append("Request originated from an anomalous or high-risk geographic location")
        if preprocessed_features.get("request_frequency", 1) > 10:
            reasons.append(f"Abnormal request velocity ({preprocessed_features['request_frequency']} req/min)")
    else:
        reasons.append("Event characteristics align with baseline normal user activity.")
        
    # Calculate Risk Score & Severity
    risk_info = calculate_risk_score(prediction, confidence, preprocessed_features)
    
    # Generate Compliance Recommendations
    compliance = generate_compliance_recommendations(prediction, risk_info["severity"], preprocessed_features, resource_name)

    return {
        "threat_status": threat_status,
        "threat_type": threat_type,
        "confidence": round(confidence, 4),
        "risk_score": risk_info["risk_score"],
        "severity": risk_info["severity"],
        "reason": reasons,
        "compliance": compliance,
        "model_label": prediction
    }

def get_loaded_metrics() -> Dict[str, Any]:
    if os.path.exists(METRICS_PATH):
        return joblib.load(METRICS_PATH)
    return {}
