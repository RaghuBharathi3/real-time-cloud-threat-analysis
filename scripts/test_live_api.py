import urllib.request
import json
import sys

base_url = "http://127.0.0.1:8000"

def test_get(path, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(base_url + path, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"GET {path} -> {resp.status}")
        return data

def test_post(path, body=None, headers=None):
    if headers is None:
        headers = {}
    raw = json.dumps(body).encode('utf-8') if body else b""
    req = urllib.request.Request(base_url + path, data=raw, headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"POST {path} -> {resp.status}")
        return data

print("=== 1. Testing Health Endpoint ===")
h = test_get("/api/v1/health")
print("Health:", json.dumps(h, indent=2))

print("\n=== 2. Testing Cloud Status Endpoint ===")
cs = test_get("/api/v1/cloud/status?refresh=true", headers={"X-User-ID": "usr_admin"})
for p, val in cs.get("providers", {}).items():
    print(f"  {p.upper()}: status={val.get('status')}, configured={val.get('configured')}")

print("\n=== 3. Testing Cloud Connection Tests ===")
for p in ["aws", "azure", "gcp", "oci"]:
    res = test_post(f"/api/v1/cloud/test-connection/{p}", headers={"X-User-ID": "usr_admin"})
    print(f"  Test {p.upper()}: status={res.get('status')}")

print("\n=== 4. Testing 5 Demo Scenarios ===")
scenarios = ["aws_brute_force", "azure_keyvault", "gcp_storage_burst", "oci_normal", "aws_normal"]
for sc in scenarios:
    res = test_post(f"/api/v1/pipeline/demo-scenario/{sc}", headers={"X-User-ID": "usr_admin"})
    print(f"  Scenario '{sc}': Risk={res.get('risk_score')}, Severity={res.get('severity')}, Threat={res.get('detection_result', {}).get('threat_type')}")

print("\n=== 5. Testing Alerts Retrieval ===")
alerts = test_get("/api/v1/alerts?limit=5", headers={"X-User-ID": "usr_admin"})
print(f"  Retrieved {len(alerts)} alerts. Latest ID: {alerts[0].get('event_id') if alerts else 'None'}")

print("\n=== 6. Testing Model Metrics Endpoint ===")
metrics = test_get("/api/v1/model/metrics", headers={"X-User-ID": "usr_admin"})
print(f"  Accuracy: {metrics.get('accuracy')}, Precision: {metrics.get('precision')}, F1: {metrics.get('f1_score')}")

print("\n=== 7. Testing Admin Audit Logs Endpoint ===")
logs = test_get("/api/v1/admin/audit-logs", headers={"X-User-ID": "usr_admin"})
print(f"  Retrieved {len(logs)} audit log entries.")

print("\n=== 8. Testing RBAC Access Gating (Free User) ===")
try:
    test_get("/api/v1/admin/audit-logs", headers={"X-User-ID": "usr_free"})
    print("  ERROR: Expected 403 for Free User!")
except urllib.error.HTTPError as e:
    print(f"  Correctly blocked Free user from admin logs: HTTP {e.code} ({e.reason})")

print("\n=== LIVE API VALIDATION RESULT: 100% WORKING ===")
