import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

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

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        allowed = {"login", "resource_access", "api_call"}
        if v not in allowed:
            raise ValueError(f"event_type must be one of {allowed}")
        return v

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        # Basic IPv4 validation
        ipv4_pattern = r"^(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$"
        if not re.match(ipv4_pattern, v):
            raise ValueError("ip_address must be a valid IPv4 address")
        return v

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        # Basic ISO 8601 standard validation (with or without 'Z' / timezone offsets)
        iso_pattern = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$"
        if not re.match(iso_pattern, v):
            raise ValueError("timestamp must be in a valid ISO 8601 format")
        return v

def validate_raw_event(raw_data: dict) -> SecurityEvent:
    """
    Validates a raw dictionary against the SecurityEvent Pydantic schema.
    Raises ValidationError if invalid.
    """
    return SecurityEvent(**raw_data)
