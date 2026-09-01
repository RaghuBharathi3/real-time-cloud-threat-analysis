import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure robust absolute path for SQLite database across all working directories
db_dir = os.path.dirname(os.path.abspath(__file__))
default_db_file = os.path.join(db_dir, "cloud_security.db")

raw_db_url = os.environ.get("DATABASE_URL")
if not raw_db_url or "sqlite" in raw_db_url:
    DATABASE_URL = f"sqlite:///{default_db_file.replace(os.sep, '/')}"
else:
    DATABASE_URL = raw_db_url

# Handle Postgres or SQLite dialect connections
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    event_id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, index=True)
    cloud_provider = Column(String, default="aws", index=True)
    user_id = Column(String, index=True)
    event_type = Column(String)
    ip_address = Column(String)
    location = Column(String)
    failed_attempts = Column(Integer, default=0)
    resource = Column(String)
    request_frequency = Column(Integer, default=1)
    threat_status = Column(String, index=True)
    threat_type = Column(String)
    confidence = Column(Float)
    risk_score = Column(Integer, default=10)
    severity = Column(String, default="LOW")
    reasons = Column(Text)
    compliance_recommendations = Column(Text, default="{}")
    source_mode = Column(String, default="DEMO", index=True) # REAL or DEMO
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserProfile(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String)
    role = Column(String, default="ANALYST")  # ADMIN, ANALYST, USER
    is_pro = Column(Integer, default=0)       # 0: Free, 1: Pro
    subscription_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class BillingOrder(Base):
    __tablename__ = "billing_orders"

    order_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    amount = Column(Integer)
    currency = Column(String, default="INR")
    status = Column(String, default="created") # created, paid, failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    actor = Column(String, default="system", index=True)
    action = Column(String, index=True)
    details = Column(Text)

def migrate_db():
    """
    Ensures missing columns exist in SQLite database.
    """
    if str(engine.url).startswith("sqlite"):
        with engine.connect() as conn:
            try:
                res = conn.exec_driver_sql("PRAGMA table_info(security_alerts);").fetchall()
                cols = [r[1] for r in res]
                if "risk_score" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN risk_score INTEGER DEFAULT 10;")
                if "severity" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN severity VARCHAR DEFAULT 'LOW';")
                if "compliance_recommendations" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN compliance_recommendations TEXT DEFAULT '{}';")
                if "source_mode" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN source_mode VARCHAR DEFAULT 'DEMO';")
                if "created_at" not in cols:
                    conn.exec_driver_sql("ALTER TABLE security_alerts ADD COLUMN created_at DATETIME;")
                conn.commit()
            except Exception as e:
                print(f"Migration notice: {e}")

def init_db():
    Base.metadata.create_all(bind=engine)
    migrate_db()
    
    # Initialize default users
    db = SessionLocal()
    try:
        users = [
            UserProfile(user_id="usr_admin", username="admin_secops", email="admin@cloudsec.local", role="ADMIN", is_pro=1),
            UserProfile(user_id="usr_pro", username="senior_analyst", email="analyst@cloudsec.local", role="ANALYST", is_pro=1),
            UserProfile(user_id="usr_free", username="guest_user", email="guest@cloudsec.local", role="USER", is_pro=0)
        ]
        for u in users:
            existing = db.query(UserProfile).filter(UserProfile.user_id == u.user_id).first()
            if not existing:
                db.add(u)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding user profiles: {e}")
    finally:
        db.close()

def log_audit_event(actor: str, action: str, details: str):
    db = SessionLocal()
    try:
        entry = AuditLog(
            actor=actor,
            action=action,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to log audit event: {e}")
    finally:
        db.close()
