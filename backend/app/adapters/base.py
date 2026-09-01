from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime

class BaseCloudAdapter(ABC):
    """
    Abstract Base Class for Multi-Cloud Adapters.
    Ensures uniform interface across AWS, Azure, GCP, and OCI.
    """

    def __init__(self, provider_name: str):
        self.provider_name = provider_name.lower()
        self.last_status: str = "NOT CONFIGURED"
        self.last_check_time: Optional[str] = None
        self.last_attempted_collection: Optional[str] = None
        self.last_successful_collection: Optional[str] = None
        self.last_collection_message: Optional[str] = None
        self.last_error: Optional[str] = None
        self.events_collected_count: int = 0
        self.new_events_last_sync: int = 0
        self.threats_flagged_count: int = 0
        self.last_risk_level: str = "LOW"
        self.source_mode: str = "DEMO"

    @abstractmethod
    def is_configured(self) -> bool:
        """Checks whether the necessary environment configuration/credentials exist."""
        pass

    @abstractmethod
    def connect(self) -> bool:
        """Initializes client SDK connections with the cloud provider."""
        pass

    @abstractmethod
    def validate_credentials(self) -> Dict[str, Any]:
        """
        Validates cloud credentials against live provider APIs.
        """
        pass

    @abstractmethod
    def collect_events(self, limit: int = 10, lookback_minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Collects security/audit events from the cloud provider.
        """
        pass

    @abstractmethod
    def normalize_event(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates a cloud-specific log payload into the Canonical Event Schema.
        """
        pass

    def get_connection_status(self) -> Dict[str, Any]:
        """
        Returns cached or quick status representation safe for UI and API consumption.
        """
        return {
            "provider": self.provider_name,
            "status": self.last_status,
            "last_check": self.last_check_time,
            "last_attempted_collection": self.last_attempted_collection,
            "last_successful_collection": self.last_successful_collection,
            "last_collection_message": self.last_collection_message,
            "error": self.last_error,
            "events_processed": self.events_collected_count,
            "new_events_last_sync": self.new_events_last_sync,
            "threats_detected": self.threats_flagged_count,
            "latest_risk_level": self.last_risk_level,
            "source_mode": self.source_mode
        }
