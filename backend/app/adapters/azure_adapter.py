import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from azure.identity import ClientSecretCredential
from azure.core.exceptions import ClientAuthenticationError, HttpResponseError

from ..config import settings
from .base import BaseCloudAdapter

class AzureAdapter(BaseCloudAdapter):
    """
    Microsoft Azure Cloud Adapter using azure-identity and Microsoft Identity SDK.
    Authenticates Service Principals/App Registrations and normalizes Activity Log events.
    """

    def __init__(self):
        super().__init__("azure")
        self.client_id = settings.get("AZURE_CLIENT_ID")
        self.tenant_id = settings.get("AZURE_TENANT_ID") or "consumers"
        self.subscription_id = settings.get("AZURE_SUBSCRIPTION_ID")
        self.client_secret = settings.get("AZURE_CLIENT_SECRET")
        self._credential = None
        self._auth_scope = None

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def connect(self) -> bool:
        if not self.is_configured():
            self.last_status = "NOT CONFIGURED"
            self.last_error = "Missing Azure credentials in environment."
            return False
        try:
            # First attempt with configured tenant_id
            self._credential = ClientSecretCredential(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                client_secret=self.client_secret
            )
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
                "provider": "azure",
                "status": "NOT CONFIGURED",
                "details": "AZURE_CLIENT_ID or AZURE_CLIENT_SECRET not configured.",
                "last_checked": self.last_check_time
            }

        # Try authenticating across valid tenant endpoints & scopes (ARM or Graph for MSA/Entra)
        candidate_configs = [
            (self.tenant_id, "https://management.azure.com/.default", "Azure Resource Manager"),
            ("consumers", "https://graph.microsoft.com/.default", "Microsoft Entra ID / Graph"),
            (self.tenant_id, "https://graph.microsoft.com/.default", "Microsoft Entra ID"),
            ("common", "https://graph.microsoft.com/.default", "Microsoft Identity Platform")
        ]

        auth_success = False
        active_scope_name = ""

        for tenant_cand, scope_cand, desc in candidate_configs:
            try:
                cred = ClientSecretCredential(
                    tenant_id=tenant_cand,
                    client_id=self.client_id,
                    client_secret=self.client_secret
                )
                token = cred.get_token(scope_cand)
                if token and token.token:
                    self._credential = cred
                    self._auth_scope = scope_cand
                    self.tenant_id = tenant_cand
                    auth_success = True
                    active_scope_name = desc
                    break
            except Exception:
                continue

        if auth_success:
            self.last_status = "CONNECTED"
            self.last_error = None
            return {
                "provider": "azure",
                "status": "CONNECTED",
                "tenant_id": self.tenant_id,
                "client_id": self.client_id,
                "subscription_id": self.subscription_id or "Not specified",
                "scope": active_scope_name,
                "details": f"Authenticated successfully with {active_scope_name} (Tenant: {self.tenant_id}).",
                "last_checked": self.last_check_time
            }
        else:
            self.last_status = "INVALID"
            self.last_error = "Azure Entra authentication failed: Invalid Client Secret, Tenant ID, or Client ID."
            return {
                "provider": "azure",
                "status": "INVALID",
                "details": self.last_error,
                "last_checked": self.last_check_time
            }

    def collect_events(self, limit: int = 10, lookback_minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Collects Azure Activity and Entra ID security events within lookback window.
        Uses Azure Resource Manager / Insights REST API or synthetic fallbacks.
        """
        self.last_attempted_collection = datetime.now(timezone.utc).isoformat()
        events = []

        if self.is_configured():
            try:
                # Attempt to query Azure Monitor Activity Log REST API if subscription is configured
                if self.subscription_id and self._credential:
                    import urllib.request
                    import json
                    from datetime import timedelta
                    
                    start_time = datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)
                    token = self._credential.get_token("https://management.azure.com/.default")
                    
                    filter_str = f"eventTimestamp ge '{start_time.strftime('%Y-%m-%dT%H:%M:%SZ')}'"
                    encoded_filter = urllib.parse.quote(filter_str)
                    url = f"https://management.azure.com/subscriptions/{self.subscription_id}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter={encoded_filter}"
                    
                    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token.token}"})
                    try:
                        with urllib.request.urlopen(req, timeout=8) as resp:
                            if resp.status == 200:
                                data = json.loads(resp.read().decode("utf-8"))
                                raw_vals = data.get("value", [])[:limit]
                                for raw in raw_vals:
                                    norm = self.normalize_event(raw)
                                    norm["source_mode"] = "REAL"
                                    events.append(norm)
                                
                                self.last_status = "CONNECTED"
                                self.last_error = None
                                self.last_successful_collection = self.last_attempted_collection
                                self.source_mode = "REAL"
                                self.new_events_last_sync = len(events)
                                if len(events) == 0:
                                    self.last_collection_message = f"Azure Monitor active: 0 events found in last {lookback_minutes}m (Subscription idle)."
                                else:
                                    self.last_collection_message = f"Successfully collected {len(events)} Azure Activity Log events."
                    except urllib.error.HTTPError as http_err:
                        if http_err.code in [401, 403]:
                            self.last_status = "INSUFFICIENT_PERMISSIONS"
                            self.last_error = f"AuthorizationFailed (HTTP {http_err.code}): Service Principal lacks Reader role on subscription."
                            self.last_collection_message = "Collection failed: Service Principal requires Reader role on Azure subscription."
                        else:
                            self.last_status = "FAILED"
                            self.last_error = f"Azure Activity Log HTTP Error: {http_err.code}"
                            self.last_collection_message = f"Collection failed: {self.last_error}"
                else:
                    self.last_status = "CONNECTED"
                    self.last_collection_message = "Azure Entra authenticated (Subscription ID not set for log collection)."
            except Exception as e:
                err_str = str(e)
                if "AADSTS9002332" in err_str or "AADSTS9002346" in err_str or "consumers" in err_str:
                    self.last_status = "INSUFFICIENT_PERMISSIONS"
                    self.last_error = "Entra ID App Registration is Personal Account type (/consumers). ARM Activity Logs require an organizational App Registration with Reader role on the subscription."
                    self.last_collection_message = "Collection requires organizational App Registration with Reader role on Azure subscription."
                elif "AADSTS700016" in err_str or "AADSTS7000215" in err_str:
                    self.last_status = "INVALID"
                    self.last_error = "Invalid Azure Client Secret or Application ID."
                    self.last_collection_message = "Collection failed: Invalid Azure credentials."
                else:
                    self.last_status = "FAILED"
                    self.last_error = err_str
                    self.last_collection_message = f"Collection error: {err_str}"

        if not events:
            if settings.is_demo_mode or not self.is_configured():
                events = self._generate_live_sample_events(limit)
                for ev in events:
                    ev["source_mode"] = "DEMO"
                self.source_mode = "DEMO"
                if not self.last_collection_message:
                    self.last_collection_message = f"Generated {len(events)} synthetic events (Demo Mode)."

        self.events_collected_count += len(events)
        return events

    def normalize_event(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes Azure Activity Log event to Canonical Event Schema.
        """
        if "cloud_provider" in raw_event and "event_type" in raw_event and "ip_address" in raw_event:
            return raw_event

        event_id = raw_event.get("id") or raw_event.get("correlationId") or f"AZ-{uuid.uuid4().hex[:8].upper()}"
        event_time = raw_event.get("eventTimestamp") or raw_event.get("timestamp") or datetime.now(timezone.utc).isoformat()
        caller = raw_event.get("caller") or raw_event.get("claims", {}).get("name") or "azure_service_principal"
        
        operation_name = ""
        op = raw_event.get("operationName")
        if isinstance(op, dict):
            operation_name = op.get("value", "")
        elif isinstance(op, str):
            operation_name = op

        # Determine event_type
        if any(k in operation_name.lower() for k in ["signin", "login", "auth"]):
            event_type = "login"
        elif any(k in operation_name.lower() for k in ["read", "get", "action"]):
            event_type = "resource_access"
        else:
            event_type = "api_call"

        ip_addr = raw_event.get("callerIpAddress") or "20.198.118.5"
        resource = raw_event.get("resourceId") or "azure_keyvault"

        return {
            "event_id": str(event_id),
            "timestamp": str(event_time),
            "cloud_provider": "azure",
            "user_id": str(caller),
            "event_type": event_type,
            "ip_address": ip_addr if self._is_valid_ipv4(ip_addr) else "20.198.118.5",
            "location": "US",
            "failed_attempts": int(raw_event.get("failed_attempts", 0)),
            "resource": resource,
            "request_frequency": int(raw_event.get("request_frequency", 1)),
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
                "event_id": f"EVT-AZ-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "azure",
                "user_id": "azure_devops_sp",
                "event_type": "resource_access",
                "ip_address": "20.40.160.25",
                "location": "US",
                "failed_attempts": 0,
                "resource": "azure_keyvault",
                "request_frequency": 3
            },
            {
                "event_id": f"EVT-AZ-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "azure",
                "user_id": "cloud_admin_azure",
                "event_type": "login",
                "ip_address": "104.42.240.60",
                "location": "US",
                "failed_attempts": 0,
                "resource": "azure_portal",
                "request_frequency": 1
            },
            {
                "event_id": f"EVT-AZ-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": now,
                "cloud_provider": "azure",
                "user_id": "analytics_worker",
                "event_type": "api_call",
                "ip_address": "51.144.100.12",
                "location": "GB",
                "failed_attempts": 0,
                "resource": "azure_blob_finance",
                "request_frequency": 4
            }
        ]
        return samples[:count]
