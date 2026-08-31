import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .config import settings

DATABASE_URL = settings["DATABASE_URL"]

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    event_id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    cloud_provider = Column(String, default="aws") # aws, azure, gcp, oci
    user_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    location = Column(String, default="Unknown")
    resource = Column(String, nullable=False)
    failed_attempts = Column(Integer, default=0)
    request_frequency = Column(Integer, default=1)
    
    # Preprocessing outputs (numeric features saved as reference)
    is_sensitive_resource = Column(Integer, default=0)
    is_unusual_location = Column(Integer, default=0)
    
    # Model threat detection outputs
    threat_status = Column(String, nullable=False)  # "Normal" or "Suspicious"
    threat_type = Column(String, nullable=False)    # e.g. "Possible Brute-Force Activity"
    confidence = Column(Float, default=0.0)
    reasons = Column(Text, default="[]")           # JSON-serialized list
    processed_at = Column(DateTime, default=datetime.utcnow)

class SystemUser(Base):
    __tablename__ = "system_users"

    user_id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(String, default="USER") # USER, ANALYST, ADMIN
    is_pro = Column(Integer, default=0) # 0 = Free, 1 = Pro
    subscription_expires_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Pre-populate default users for evaluators to test
    db = SessionLocal()
    try:
        if db.query(SystemUser).count() == 0:
            default_users = [
                SystemUser(user_id="usr_admin", username="admin", role="ADMIN", is_pro=1),
                SystemUser(user_id="usr_analyst", username="analyst", role="ANALYST", is_pro=1),
                SystemUser(user_id="usr_free", username="user_free", role="USER", is_pro=0),
                SystemUser(user_id="usr_pro", username="user_pro", role="USER", is_pro=1),
            ]
            db.add_all(default_users)
            db.commit()
    except Exception as e:
        print(f"[DB Init] Seeding users failed: {e}")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
