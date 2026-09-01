import time
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, Header
from datetime import datetime, timezone

# Rate limit rules: (max_requests, window_seconds)
RATE_LIMIT_RULES = {
    "auth": (10, 60),          # 10 req / 60s
    "cloud_test": (20, 60),    # 20 req / 60s
    "cloud_sync": (20, 60),    # 20 req / 60s
    "pipeline": (60, 60),      # 60 req / 60s
    "ml_train": (5, 60),       # 5 req / 60s
    "admin": (30, 60),         # 30 req / 60s
    "general": (120, 60)       # 120 req / 60s
}

class SlidingWindowRateLimiter:
    """
    Thread-safe sliding window in-memory rate limiter.
    Tracks requests by client identifier (User ID or Client IP) per endpoint category.
    """
    def __init__(self):
        # key format: f"{category}:{client_id}" -> list of request timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, category: str, client_id: str) -> tuple[bool, int, int]:
        """
        Evaluates whether the request is permitted.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        rule = RATE_LIMIT_RULES.get(category, RATE_LIMIT_RULES["general"])
        max_requests, window_seconds = rule
        now = time.time()
        window_start = now - window_seconds

        key = f"{category}:{client_id}"
        timestamps = self._history[key]

        # Purge timestamps outside the active window
        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        self._history[key] = valid_timestamps

        if len(valid_timestamps) >= max_requests:
            oldest_timestamp = valid_timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest_timestamp)))
            return False, 0, retry_after

        # Record this request timestamp
        self._history[key].append(now)
        remaining = max_requests - len(self._history[key])
        return True, remaining, 0

# Global Rate Limiter Instance
limiter = SlidingWindowRateLimiter()

def check_rate_limit(category: str):
    """
    FastAPI dependency factory for endpoint rate limiting.
    """
    async def dependency(request: Request, x_user_id: Optional[str] = Header(None)):
        # Determine client identifier
        client_ip = request.client.host if request.client else "127.0.0.1"
        client_id = x_user_id or client_ip

        allowed, remaining, retry_after = limiter.is_allowed(category, client_id)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {category.upper()} operations. Please wait {retry_after} seconds before retrying.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(RATE_LIMIT_RULES.get(category, (120, 60))[0]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after)
                }
            )
        return True

    return dependency
