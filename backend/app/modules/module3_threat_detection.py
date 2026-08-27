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

def train_threat_model(train_csv_path: str, eval_csv_path: str) -> Dict[str, Any]:
    """
    Loads, preprocesses, trains a Random Forest Classifier, and saves it.
    Returns metrics and feature importances.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # 1. Load data
    train_df_raw = pd.read_csv(train_csv_path)
    eval_df_raw = pd.read_csv(eval_csv_path)
    
    # 2. Preprocess using Module 2
    train_df = preprocess_dataframe(train_df_raw)
    eval_df = preprocess_dataframe(eval_df_raw)
    
    # 3. Separate features and target
    X_train = train_df[FEATURES]
    y_train = train_df["label"]
    
    X_eval = eval_df[FEATURES]
    y_eval = eval_df["label"]
    
    # 4. Train Random Forest Classifier
    # Use random_state=42 for reproducibility
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train, y_train)
    
    # 5. Evaluate model
    y_pred = clf.predict(X_eval)
    y_proba = clf.predict_proba(X_eval)
    
    accuracy = float(accuracy_score(y_eval, y_pred))
    
    # Calculate precision, recall, f1 for each class
    # classes: brute_force, normal, unauthorized_access
    classes = clf.classes_.tolist()
    precision, recall, fscore, support = precision_recall_fscore_support(
        y_eval, y_pred, labels=classes, zero_division=0
    )
    
    # Calculate overall macro metrics
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        y_eval, y_pred, average="macro", zero_division=0
    )
    
    # Compute confusion matrix
    cm = confusion_matrix(y_eval, y_pred, labels=classes).tolist()
    
    # Model feature importances
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
    
    # 6. Save model and metrics to files
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(metrics, METRICS_PATH)
    
    return metrics

def predict_threat(preprocessed_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predicts whether a preprocessed event represents normal or suspicious activity.
    """
    if not os.path.exists(MODEL_PATH):
        # Auto train fallback if model file doesn't exist
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
                "reason": ["Model is not trained and training datasets were not found."]
            }
            
    clf = joblib.load(MODEL_PATH)
    
    # Prepare input DataFrame with feature names to match training
    X = pd.DataFrame([preprocessed_features])[FEATURES]
    
    # Predict label & probability
    prediction = clf.predict(X)[0]
    probabilities = clf.predict_proba(X)[0]
    
    classes = clf.classes_.tolist()
    pred_idx = classes.index(prediction)
    confidence = float(probabilities[pred_idx])
    
    # Determine risk level / status
    threat_status = "Normal" if prediction == "normal" else "Suspicious"
    
    # Human-readable threat mapping
    threat_type_map = {
        "normal": "Normal Event",
        "brute_force": "Possible Brute-Force Activity",
        "unauthorized_access": "Possible Unauthorized Resource Access"
    }
    threat_type = threat_type_map.get(prediction, "Unknown Threat")
    
    # Reason explanation generation
    reasons = []
    if prediction == "brute_force":
        reasons.append(f"Multiple failed login attempts detected ({preprocessed_features['failed_attempts']})")
        reasons.append("Targeting administrative cloud console login resource")
    elif prediction == "unauthorized_access":
        if preprocessed_features["is_sensitive_resource"]:
            reasons.append("Accessing high-sensitivity cloud resource")
        if preprocessed_features["is_unusual_location"]:
            reasons.append("Request originated from an unusual geographic location")
        if preprocessed_features["request_frequency"] > 10:
            reasons.append(f"Abnormally high request frequency ({preprocessed_features['request_frequency']} req/min)")
    else:
        reasons.append("Event characteristics align with baseline normal user activity.")
        
    return {
        "threat_status": threat_status,
        "threat_type": threat_type,
        "confidence": round(confidence, 4),
        "reason": reasons,
        "model_label": prediction
    }

def get_loaded_metrics() -> Dict[str, Any]:
    """
    Loads saved model evaluation metrics.
    """
    if os.path.exists(METRICS_PATH):
        return joblib.load(METRICS_PATH)
    return {}
