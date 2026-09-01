import os
import re

PROJECT_ROOT = r"c:\Users\Windows\Documents\cloud"

PATTERNS = {
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "GCP Private Key": r"\"private_key\":\s*\"-----BEGIN",
    "RSA Private Key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "Razorpay Key": r"rzp_(live|test)_[0-9a-zA-Z]{14}",
}

IGNORED_DIRS = {".git", "venv", "node_modules", "dist", "__pycache__", ".pytest_cache", ".gemini"}
FLAGGED = []

for root, dirs, files in os.walk(PROJECT_ROOT):
    dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
    for file in files:
        if file in [".env", "cloud_security.db", "threat_model.pkl"] or file.endswith(".pyc"):
            continue
        filepath = os.path.join(root, file)
        rel_path = os.path.relpath(filepath, PROJECT_ROOT)
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                for label, p in PATTERNS.items():
                    matches = re.findall(p, content)
                    real_matches = [m for m in matches if "EXAMPLE" not in str(m) and "your_" not in str(m) and "mock_" not in str(m)]
                    if real_matches:
                        FLAGGED.append((rel_path, label, len(real_matches)))
        except Exception:
            pass

print("==================================================")
print("REPOSITORY SECURITY AUDIT RESULTS")
print("==================================================")
if not FLAGGED:
    print("STATUS: PASS (Zero secrets detected in source/documentation)")
else:
    for f, label, count in FLAGGED:
        print(f"SECRET DETECTED:")
        print(f"File: {f}")
        print(f"Type: {label}")
        print("Action: ROTATION REQUIRED / REMOVE")
print("==================================================")
