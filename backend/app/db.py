import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_PATH = os.path.join(os.path.dirname(__file__), "cloud_security.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    event_id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
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

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
