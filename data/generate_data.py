import csv
import random
import os
from datetime import datetime, timedelta

def generate_ip():
    return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

def generate_dataset(filename, num_records, seed=42):
    random.seed(seed)
    
    # Static values
    users = [f"user_{i:03d}" for i in range(1, 50)]
    attacker_users = [f"attacker_{i:03d}" for i in range(1, 10)]
    normal_locations = ["US", "UK", "IN", "DE", "FR"]
    unusual_locations = ["CN", "RU", "KP", "Unknown"]
    
    normal_resources = ["ec2_dashboard", "s3_public_assets", "lambda_logging", "dynamodb_cache"]
    sensitive_resources = ["s3_bucket_finance", "ec2_admin_portal", "iam_policy_manager", "kms_keys"]
    
    start_time = datetime.now() - timedelta(days=1)
    
    fieldnames = [
        "event_id", "timestamp", "user_id", "event_type", 
        "ip_address", "location", "failed_attempts", "resource", 
        "request_frequency", "label"
    ]
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, mode='w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        
        for i in range(num_records):
            event_id = f"EVT{i:05d}"
            timestamp = (start_time + timedelta(seconds=random.randint(0, 86400))).isoformat()
            
            # Decide event class: 75% normal, 15% brute_force, 10% unauthorized_access
            choice = random.random()
            
            if choice < 0.75:
                # Normal activity
                user = random.choice(users)
                event_type = random.choice(["login", "resource_access", "api_call"])
                ip = f"192.168.{random.randint(1, 100)}.{random.randint(1, 254)}" if random.random() > 0.3 else generate_ip()
                location = random.choice(normal_locations)
                failed_attempts = random.choice([0, 0, 0, 0, 1])  # Mostly 0, occasionally 1
                resource = random.choice(normal_resources) if event_type != "login" else "cloud_console"
                request_frequency = random.randint(1, 4)
                label = "normal"
                
            elif choice < 0.90:
                # Brute-force authentication attack
                user = random.choice(attacker_users + users)
                event_type = "login"
                ip = generate_ip()
                location = random.choice(normal_locations + unusual_locations)
                failed_attempts = random.randint(5, 12)  # High failure count
                resource = "cloud_console"
                request_frequency = random.randint(5, 15)
                label = "brute_force"
                
            else:
                # Unauthorized access attack
                user = random.choice(attacker_users)
                event_type = random.choice(["resource_access", "api_call"])
                ip = generate_ip()
                location = random.choice(unusual_locations)
                failed_attempts = 0
                resource = random.choice(sensitive_resources)
                request_frequency = random.randint(15, 45)  # High request count / abnormal frequency
                label = "unauthorized_access"
                
            writer.writerow({
                "event_id": event_id,
                "timestamp": timestamp,
                "user_id": user,
                "event_type": event_type,
                "ip_address": ip,
                "location": location,
                "failed_attempts": failed_attempts,
                "resource": resource,
                "request_frequency": request_frequency,
                "label": label
            })
            
    print(f"Generated {num_records} events in {filename}")

if __name__ == "__main__":
    generate_dataset("data/raw/security_events.csv", 1000, seed=42)
    generate_dataset("data/raw/security_events_eval.csv", 150, seed=123)
