# 12. Authentication and Role-Based Access Control (RBAC)

## Purpose
This document specifies user session management, access tiers, and route authorization policies implemented in the platform.

---

## 1. Authentication Architecture

For local evaluation and offline reliability, the platform uses a local SQLite database session model (`backend/app/db.py`). Active sessions are selected via the `X-User-ID` request header.

Note: Supabase authentication integration is decoupled from the critical path to ensure local operations function without internet dependencies.

---

## 2. User Roles and Permissions

The system seeds three default user profiles to demonstrate role-based access control:

| User ID | Username | Role | Tier | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `usr_admin` | `admin_secops` | ADMIN | PRO | Full administrative control: event streaming, model retraining, multi-cloud log sync, and system audit logs. |
| `usr_pro` | `senior_analyst` | ANALYST | PRO | Multi-cloud ingestion across AWS, Azure, GCP, and OCI; deep event diagnostics; compliance mapping viewer. |
| `usr_free` | `guest_user` | USER | FREE | Single-cloud ingestion (AWS only); restricted from retraining models, viewing audit logs, or syncing secondary clouds. |

---

## 3. Server-Side Route Protection

FastAPI dependency injection enforces access control at the endpoint level:

```python
def require_admin(user: UserProfile = Depends(get_current_user)):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Admin privilege required."
        )
    return user

def require_pro_tier(user: UserProfile = Depends(get_current_user)):
    if user.is_pro != 1 and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Multi-Cloud feature requires an active Pro Subscription."
        )
    return user
```

### Protected Endpoints
- `POST /api/v1/model/train` -> Requires ADMIN role
- `POST /api/v1/pipeline/simulate-next` -> Requires ADMIN role
- `GET /api/v1/admin/audit-logs` -> Requires ADMIN role
- `POST /api/v1/cloud/sync/{azure|gcp|oci}` -> Requires PRO tier
