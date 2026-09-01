import re
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field, field_validator, ValidationError

class SecurityEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    timestamp: str = Field(..., description="ISO 8601 formatted timestamp")
    cloud_provider: str = Field("aws", description="Cloud provider name: aws, azure, gcp, oci")
    user_id: str = Field(..., description="Identifier of the user")
    event_type: str = Field(..., description="Type of event: login, resource_access, api_call")
    ip_address: str = Field(..., description="Source IPv4 address")
    location: Optional[str] = Field("Unknown", description="Geographic location code")
    failed_attempts: int = Field(0, ge=0, description="Number of failed authentication attempts")
    resource: str = Field(..., description="Target cloud resource")
    request_frequency: int = Field(1, ge=1, description="Count of requests in the last 1 minute")

    @field_validator("cloud_provider")
    @classmethod
    def validate_cloud_provider(cls, v: str) -> str:
        provider = str(v).lower().strip()
        allowed = {"aws", "azure", "gcp", "oci"}
        if provider not in allowed:
            raise ValueError(f"cloud_provider must be one of {allowed}, got '{v}'")
        return provider

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        event = str(v).lower().strip()
        allowed = {"login", "resource_access", "api_call"}
        if event not in allowed:
            raise ValueError(f"event_type must be one of {allowed}, got '{v}'")
        return event

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        ipv4_pattern = r"^(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$"
        if not re.match(ipv4_pattern, str(v).strip()):
            raise ValueError(f"ip_address must be a valid IPv4 address, got '{v}'")
        return str(v).strip()

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        iso_pattern = r"^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$"
        if not re.match(iso_pattern, str(v).strip()):
            raise ValueError(f"timestamp must be in a valid ISO 8601 format, got '{v}'")
        return str(v).strip().replace(" ", "T")

def validate_raw_event(raw_data: dict) -> SecurityEvent:
    """
    Validates a single raw dictionary against the SecurityEvent Pydantic schema.
    Raises ValidationError if invalid.
    """
    if not isinstance(raw_data, dict):
        raise ValueError("Event data must be a valid JSON dictionary.")
    return SecurityEvent(**raw_data)

# Alias for consistent module naming
validate_security_event = validate_raw_event

def validate_batch_events(raw_events: List[Dict[str, Any]]) -> Tuple[List[SecurityEvent], List[Dict[str, Any]]]:
    """
    Validates a batch of raw events, isolating errors so a single malformed event
    does not fail the entire batch.
    Returns (valid_events, rejected_events_with_reasons).
    """
    valid = []
    rejected = []
    for raw in raw_events:
        try:
            evt = validate_raw_event(raw)
            valid.append(evt)
        except (ValidationError, ValueError, Exception) as e:
            rejected.append({
                "raw_event": raw,
                "error": str(e)
            })
    return valid, rejected
