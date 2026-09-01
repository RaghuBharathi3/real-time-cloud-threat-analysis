from typing import Dict, Any, List, Optional
from .base import BaseCloudAdapter
from .aws_adapter import AWSAdapter
from .azure_adapter import AzureAdapter
from .gcp_adapter import GCPAdapter
from .oci_adapter import OCIAdapter

_ADAPTER_REGISTRY: Dict[str, BaseCloudAdapter] = {}

def get_adapter(provider_name: str) -> Optional[BaseCloudAdapter]:
    """
    Returns singleton instance of the requested cloud adapter.
    """
    p = provider_name.lower().strip()
    if p not in _ADAPTER_REGISTRY:
        if p == "aws":
            _ADAPTER_REGISTRY[p] = AWSAdapter()
        elif p == "azure":
            _ADAPTER_REGISTRY[p] = AzureAdapter()
        elif p == "gcp":
            _ADAPTER_REGISTRY[p] = GCPAdapter()
        elif p == "oci":
            _ADAPTER_REGISTRY[p] = OCIAdapter()
        else:
            return None
    return _ADAPTER_REGISTRY[p]

def get_all_adapters() -> Dict[str, BaseCloudAdapter]:
    for p in ["aws", "azure", "gcp", "oci"]:
        if p not in _ADAPTER_REGISTRY:
            get_adapter(p)
    return _ADAPTER_REGISTRY

def get_multi_cloud_status(refresh: bool = False) -> Dict[str, Any]:
    """
    Returns connection status and metrics for all cloud providers.
    Never exposes raw secrets or keys.
    """
    adapters = get_all_adapters()
    results = {}
    for name, adapter in adapters.items():
        if refresh or adapter.last_status in ["NOT CONFIGURED", "CHECKING"]:
            val_res = adapter.validate_credentials()
            results[name] = {
                "provider": name,
                "status": val_res.get("status"),
                "last_check": val_res.get("last_checked"),
                "details": val_res.get("details"),
                "error": adapter.last_error,
                "events_processed": adapter.events_collected_count,
                "threats_detected": adapter.threats_flagged_count,
                "latest_risk_level": adapter.last_risk_level
            }
        else:
            results[name] = adapter.get_connection_status()
            
    return results
