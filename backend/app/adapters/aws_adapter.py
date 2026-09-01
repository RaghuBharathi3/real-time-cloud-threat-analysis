import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, EndpointConnectionError

from ..config import settings
from .base import BaseCloudAdapter

class AWSAdapter(BaseCloudAdapter):
    """
    AWS Cloud Adapter using boto3.
    Interfaces with STS for identity/permission validation and CloudTrail for event collection.
    """

    def __init__(self):
        super().__init__("aws")
        self.access_key_id = settings.get("AWS_ACCESS_KEY_ID")
        self.secret_access_key = settings.get("AWS_SECRET_ACCESS_KEY")
        self.region = settings.get("AWS_REGION") or "ap-south-1"
        self.account_id = settings.get("AWS_ACCOUNT_ID")
        self._sts_client = None
        self._cloudtrail_client = None

    def is_configured(self) -> bool:
        return bool(self.access_key_id and self.secret_access_key)

    def connect(self) -> bool:
        if not self.is_configured():
            self.last_status = "NOT CONFIGURED"
            self.last_error = "Missing AWS access keys in environment."
            return False
        try:
            session = boto3.Session(
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region
            )
            self._sts_client = session.client("sts")
            self._cloudtrail_client = session.client("cloudtrail")
            return True
        except Exception as e:
            self.last_status = "INVALID"
            self.last_error = str(e)
            return False

    def validate_credentials(self) -> Dict[str, Any]:
        self.last_check_time = datetime.now(timezone.utc).isoformat()
        if not self.is_configured():
            self.last_status = "NOT CONFIGURED"
            return {
                "provider": "aws",
                "status": "NOT CONFIGURED",
                "details": "AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not configured.",
                "last_checked": self.last_check_time
            }

        if not self._sts_client:
            if not self.connect():
                return {
                    "provider": "aws",
                    "status": self.last_status,
                    "details": self.last_error,
                    "last_checked": self.last_check_time
                }

        try:
            # Check identity using STS
            identity = self._sts_client.get_caller_identity()
            self.account_id = identity.get("Account")
            arn = identity.get("Arn", "")
            user_id = identity.get("UserId", "")

            self.last_status = "CONNECTED"
            self.last_error = None
            return {
                "provider": "aws",
                "status": "CONNECTED",
                "account_id": self.account_id,
                "region": self.region,
                "arn": arn,
                "details": f"Authenticated successfully as {arn}",
                "last_checked": self.last_check_time
            }
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "ClientError")
            if code in ["InvalidClientTokenId", "SignatureDoesNotMatch", "AuthFailure"]:
                self.last_status = "INVALID"
            elif code in ["AccessDenied", "UnauthorizedOperation"]:
                self.last_status = "INSUFFICIENT_PERMISSIONS"
            else:
                self.last_status = "FAILED"
            self.last_error = f"AWS STS verification error: {code}"
            return {
                "provider": "aws",
                "status": self.last_status,
                "error_code": code,
                "details": self.last_error,
                "last_checked": self.last_check_time
            }
        except (NoCredentialsError, EndpointConnectionError) as e:
            self.last_status = "FAILED"
            self.last_error = str(e)
            return {
                "provider": "aws",
                "status": "FAILED",
                "details": self.last_error,
                "last_checked": self.last_check_time
            }
        except Exception as e:
            self.last_status = "FAILED"
            self.last_error = str(e)
            return {
                "provider": "aws",
                "status": "FAILED",
                "details": self.last_error,
                "last_checked": self.last_check_time
            }

    def collect_events(self, limit: int = 10, lookback_minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Queries AWS CloudTrail for management events within the lookback window.
        Gracefully handles permission boundaries and idle accounts without faking live data.
        """
        self.last_attempted_collection = datetime.now(timezone.utc).isoformat()
        events = []

        if self.connect() and self._cloudtrail_client:
            try:
                from datetime import timedelta
                start_time = datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)
                response = self._cloudtrail_client.lookup_events(
                    StartTime=start_time,
                    MaxResults=limit
                )
                raw_trail_events = response.get("Events", [])
                for ev in raw_trail_events:
                    norm = self.normalize_event(ev)
                    norm["source_mode"] = "REAL"
                    events.append(norm)

                self.last_status = "CONNECTED"
                self.last_error = None
                self.last_successful_collection = self.last_attempted_collection
                self.source_mode = "REAL"
                self.new_events_last_sync = len(events)
                if len(events) == 0:
                    self.last_collection_message = f"CloudTrail active: 0 events found in last {lookback_minutes}m (Account idle)."
                else:
                    self.last_collection_message = f"Successfully collected {len(events)} CloudTrail events."
            except ClientError as e:
                code = e.response.get("Error", {}).get("Code", "ClientError")
                if code in ["AccessDenied", "AccessDeniedException", "UnauthorizedOperation"]:
                    self.last_status = "INSUFFICIENT_PERMISSIONS"
                    self.last_error = "AccessDenied: IAM user lacks cloudtrail:LookupEvents policy permission."
                    self.last_collection_message = "Collection failed: Insufficient IAM permissions (attach SecurityAudit policy)."
                else:
                    self.last_status = "FAILED"
                    self.last_error = f"AWS CloudTrail lookup error: {code}"
                    self.last_collection_message = f"Collection failed: {self.last_error}"

                # Fallback to demo events ONLY if in Demo Mode
                if settings.is_demo_mode:
                    events = self._generate_live_sample_events(limit)
                    for ev in events:
                        ev["source_mode"] = "DEMO"
                    self.source_mode = "DEMO"
            except Exception as e:
                self.last_status = "FAILED"
                self.last_error = str(e)
                self.last_collection_message = f"Collection error: {str(e)}"
                if settings.is_demo_mode:
                    events = self._generate_live_sample_events(limit)
                    for ev in events:
                        ev["source_mode"] = "DEMO"
                    self.source_mode = "DEMO"
        else:
            # Running in pure Demo Mode without AWS credentials
            events = self._generate_live_sample_events(limit)
            for ev in events:
                ev["source_mode"] = "DEMO"
            self.source_mode = "DEMO"
            self.last_collection_message = f"Generated {len(events)} synthetic events (Demo Mode)."

        self.events_collected_count += len(events)
        return events

    def normalize_event(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes AWS CloudTrail event to Canonical Event Schema.
        """
        # Check if already canonical
        if "cloud_provider" in raw_event and "event_type" in raw_event and "ip_address" in raw_event:
            return raw_event

        event_id = raw_event.get("EventId") or raw_event.get("eventID") or f"AWS-{uuid.uuid4().hex[:8].upper()}"
        event_time = raw_event.get("EventTime")
        if isinstance(event_time, datetime):
            timestamp_str = event_time.isoformat()
        elif isinstance(event_time, str):
            timestamp_str = event_time
        else:
            timestamp_str = datetime.now(timezone.utc).isoformat()

        user_name = raw_event.get("Username") or "aws_iam_user"
        event_name = raw_event.get("EventName") or "DescribeInstances"
        
        # Determine event type
        if "login" in event_name.lower() or "auth" in event_name.lower() or event_name == "ConsoleLogin":
            event_type = "login"
        elif any(k in event_name.lower() for k in ["getobject", "putobject", "read", "access"]):
            event_type = "resource_access"
        else:
            event_type = "api_call"

        # Determine target resource
        resources = raw_event.get("Resources", [])
        if resources and isinstance(resources, list) and len(resources) > 0:
            resource_name = resources[0].get("ResourceName") or resources[0].get("ResourceType") or "aws_resource"
        else:
            resource_name = "s3_bucket_finance" if "s3" in event_name.lower() else "cloud_console"

        # Map IP
        ct_event_str = raw_event.get("CloudTrailEvent")
        ip_addr = "192.168.1.100"
        if ct_event_str and isinstance(ct_event_str, str):
            try:
                ct_json = json.loads(ct_event_str)
                ip_addr = ct_json.get("sourceIPAddress", ip_addr)
            except Exception:
                pass

        return {
            "event_id": str(event_id),
            "timestamp": timestamp_str,
            "cloud_provider": "aws",
            "user_id": str(user_name),
            "event_type": event_type,
            "ip_address": ip_addr if self._is_valid_ipv4(ip_addr) else "192.168.1.100",
            "location": "IN",
            "failed_attempts": 0,
            "resource": resource_name,
            "request_frequency": 1,
            "source_mode": raw_event.get("source_mode", "REAL")
        }

    def _is_valid_ipv4(self, ip: str) -> bool:
        import re
        pattern = r"^(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$"
        return bool(re.match(pattern, str(ip)))

    def _generate_live_sample_events(self, count: int = 5) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        samples = [
            {
                "event_id": f"EVT-AWS-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "aws",
                "user_id": "sec_operator_aws",
                "event_type": "resource_access",
                "ip_address": "13.232.10.45",
                "location": "IN",
                "failed_attempts": 0,
                "resource": "s3_bucket_finance",
                "request_frequency": 2
            },
            {
                "event_id": f"EVT-AWS-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "aws",
                "user_id": "admin_root",
                "event_type": "login",
                "ip_address": "52.66.12.80",
                "location": "IN",
                "failed_attempts": 0,
                "resource": "cloud_console",
                "request_frequency": 1
            },
            {
                "event_id": f"EVT-AWS-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "aws",
                "user_id": "dev_engineer",
                "event_type": "api_call",
                "ip_address": "15.206.8.21",
                "location": "IN",
                "failed_attempts": 0,
                "resource": "iam_policy_manager",
                "request_frequency": 5
            }
        ]
        return samples[:count]
