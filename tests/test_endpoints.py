import urllib.request
import json
import sys

API_URL = "http://127.0.0.1:8000"

def test_api():
    print("Verifying Backend API User Flows...")
    
    # 1. Health check
    try:
        with urllib.request.urlopen(f"{API_URL}/api/v1/health") as r:
            health = json.loads(r.read().decode())
            print(f"  [+] /api/v1/health: OK - {health}")
    except Exception as e:
        print(f"  [-] /api/v1/health: FAILED - {e}")
        sys.exit(1)
        
    # 2. Train Model
    try:
        req = urllib.request.Request(
            f"{API_URL}/api/v1/model/train",
            headers={"X-User-ID": "usr_admin"},
            method="POST"
        )
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            print(f"  [+] /api/v1/model/train: OK - Accuracy: {res['metrics']['accuracy']:.4f}")
    except Exception as e:
        print(f"  [-] /api/v1/model/train: FAILED - {e}")
        sys.exit(1)

    # 3. Simulate Event Ingestion
    try:
        req = urllib.request.Request(
            f"{API_URL}/api/v1/pipeline/simulate-next",
            headers={"X-User-ID": "usr_admin"},
            method="POST"
        )
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            print(f"  [+] /api/v1/pipeline/simulate-next: OK - Event {res['event_id']} classified as {res['detection_result']['threat_status']}")
    except Exception as e:
        print(f"  [-] /api/v1/pipeline/simulate-next: FAILED - {e}")
        sys.exit(1)


    # 4. Fetch alerts
    try:
        with urllib.request.urlopen(f"{API_URL}/api/v1/alerts") as r:
            alerts = json.loads(r.read().decode())
            print(f"  [+] /api/v1/alerts: OK - Retrieved {len(alerts)} records.")
            if len(alerts) > 0:
                print(f"    Latest alert: {alerts[0]['event_id']} ({alerts[0]['threat_status']})")
    except Exception as e:
        print(f"  [-] /api/v1/alerts: FAILED - {e}")
        sys.exit(1)

    print("\nAll Backend Endpoints Verified Successfully!")

if __name__ == "__main__":
    test_api()
