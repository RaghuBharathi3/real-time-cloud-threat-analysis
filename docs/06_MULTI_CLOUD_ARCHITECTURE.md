# 06. Multi-Cloud Architecture & Adapter Pattern

## 1. Uniform Adapter Architecture

To prevent vendor lock-in and decouple provider specifics from the core ML engine, all cloud connectors implement the unified `BaseCloudAdapter` interface.

```
                  ┌──────────────────────┐
                  │   BaseCloudAdapter   │
                  │   (Abstract Base)    │
                  └──────────┬───────────┘
                             │
       ┌─────────────────────┼─────────────────────┬─────────────────────┐
       │                     │                     │                     │
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│ AWSAdapter  │       │AzureAdapter │       │ GCPAdapter  │       │ OCIAdapter  │
└─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘
```

---

## 2. Common Adapter Interface (`BaseCloudAdapter`)

Defined in `backend/app/adapters/base.py`:

```python
class BaseCloudAdapter(ABC):
    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        self.last_status = "NOT CONFIGURED"
        self.events_collected_count = 0
        self.threats_flagged_count = 0

    @abstractmethod
    def connect(self) -> bool: ...

    @abstractmethod
    def validate_credentials(self) -> Dict[str, Any]: ...

    @abstractmethod
    def get_connection_status(self) -> Dict[str, Any]: ...

    @abstractmethod
    def collect_events(self, limit: int = 10) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def normalize_event(self, raw_event: Dict[str, Any]) -> Dict[str, Any]: ...
```

---

## 3. Provider Status Lifecycle

The system accurately distinguishes between 4 provider lifecycle states:

| Status Code | Meaning | System Behavior |
| :--- | :--- | :--- |
| `CONNECTED` | Credentials valid, identity confirmed via cloud STS / OAuth token. | Pulls live cloud audit telemetry and normalizes into pipeline. |
| `DEMO MODE` | Provider configured in simulation mode (e.g. OCI). | Ingests verified deterministic telemetry through the real ML pipeline. |
| `NOT CONFIGURED` | Environment variables or key files are missing. | Displays placeholder badge; does not block remaining cloud adapters. |
| `FAILED` | Authentication error or network failure. | Catches error, isolates provider, and logs diagnostic message. |

---

## 4. Multi-Cloud Status Aggregation

The registry (`backend/app/adapters/__init__.py`) exposes `get_multi_cloud_status(refresh=False)` which computes aggregate health across all 4 adapters without exposing private keys, secret strings, or tokens.
