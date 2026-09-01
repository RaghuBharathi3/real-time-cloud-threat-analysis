# 12. Authentication & Role-Based Access Control (RBAC)

This document describes the user session management, access tiers, and role-based permissions implemented in the platform.

---

## 1. Authentication Architecture

For academic demonstration and high local reliability, the platform implements a local database-backed session model managed in SQLite (`backend/app/db.py`).

> [!NOTE]
> **Supabase Integration Status**: Supabase cloud authentication is supported as an optional integration but is decoupled from the critical path to ensure zero-dependency local operation.

---

## 2. User Roles & Permission Matrix

The application seeds three default user profiles to demonstrate authorization boundaries:

| User ID | Username | Role | Tier | Permissions & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `usr_admin` | `admin_secops` | **ADMIN** | **PRO** | Full administrative rights: Continuous event streaming, model retraining, multi-cloud log sync, access to system audit logs. |
| `usr_pro` | `senior_analyst` | **ANALYST** | **PRO** | Multi-cloud ingestion across AWS, Azure, GCP, and OCI; deep event diagnostics; compliance mapping viewer. |
| `usr_free` | `guest_user` | **USER** | **FREE** | Single-cloud baseline ingestion (AWS only); restricted from retraining models, viewing audit logs, or syncing secondary clouds. |

---

## 3. Server-Side Route Protection

FastAPI dependency injection enforces access control at the endpoint level:

```python
def require_admin(user: UserProfile = Depends(get_current_user)):
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Admin privilege required to perform this action."
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

Protected endpoints include:
- `POST /api/v1/model/train` $\rightarrow$ `require_admin`
- `POST /api/v1/pipeline/simulate-next` $\rightarrow$ `require_admin`
- `GET /api/v1/admin/audit-logs` $\rightarrow$ `require_admin`
- `POST /api/v1/cloud/sync/{azure|gcp|oci}` $\rightarrow$ `require_pro_tier`
