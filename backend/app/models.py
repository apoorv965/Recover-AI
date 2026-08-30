"""
ORM models.

RawEvent        -> every payment/checkout event received (immutable log of inputs)
RecoveryCase    -> a case opened when revenue is "at risk" (failed payment / abandoned checkout)
AuditLog        -> immutable-style record of every AI recommendation + policy decision + execution
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class EventType(str, enum.Enum):
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_SUCCEEDED = "payment_succeeded"
    CHECKOUT_ABANDONED = "checkout_abandoned"


class CaseStatus(str, enum.Enum):
    OPEN = "open"                # newly created, not yet analyzed/processed
    IN_PROGRESS = "in_progress"  # at least one recovery action has been executed
    RECOVERED = "recovered"      # payment succeeded, revenue recovered
    STOPPED = "stopped"          # stopped due to opt-out or policy
    EXHAUSTED = "exhausted"      # max attempts reached without recovery


class Strategy(str, enum.Enum):
    IMMEDIATE_RETRY = "immediate_retry"
    DELAYED_RETRY = "delayed_retry"
    PERSONALIZED_REMINDER = "personalized_reminder"
    RECOVERY_LINK = "recovery_link"
    NO_ACTION = "no_action"


class User(Base):
    """An authenticated admin dashboard user, provisioned via Google Sign-In."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: gen_id("user"))
    google_sub = Column(String, unique=True, nullable=False, index=True)  # Google's stable user id ("sub" claim)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.utcnow)


class RawEvent(Base):
    """Every event received via the API/webhook simulator. Never mutated."""
    __tablename__ = "raw_events"

    id = Column(String, primary_key=True, default=lambda: gen_id("evt"))
    event_type = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    failure_code = Column(String, nullable=True)   # raw gateway/checkout failure code
    metadata_json = Column(Text, nullable=True)     # free-form JSON string for extra context
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("RecoveryCase", back_populates="source_event", uselist=False)


class RecoveryCase(Base):
    """A unit of revenue at risk that the agent tracks through to recovery or closure."""
    __tablename__ = "recovery_cases"

    id = Column(String, primary_key=True, default=lambda: gen_id("case"))
    source_event_id = Column(String, ForeignKey("raw_events.id"), nullable=True)

    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")

    event_type = Column(String, nullable=False)          # payment_failed | checkout_abandoned
    failure_code = Column(String, nullable=True)          # raw code from the event
    failure_reason = Column(String, nullable=True)        # AI-classified human-readable reason

    recoverability_score = Column(Integer, nullable=True)     # 0-100
    recommended_strategy = Column(String, nullable=True)
    ai_explanation = Column(Text, nullable=True)

    status = Column(String, default=CaseStatus.OPEN.value)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_attempt_at = Column(DateTime, nullable=True)
    opted_out = Column(Boolean, default=False)

    recovered_amount = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source_event = relationship("RawEvent", back_populates="case")
    audit_logs = relationship(
        "AuditLog", back_populates="case", order_by="AuditLog.timestamp"
    )


class AuditLog(Base):
    """
    Immutable-style audit trail. Rows are only ever inserted, never updated or deleted,
    so the full history of AI recommendations and policy decisions is always reconstructable.
    """
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: gen_id("audit"))
    case_id = Column(String, ForeignKey("recovery_cases.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    event = Column(String, nullable=False)                # e.g. "case_processed", "success_simulated"
    ai_recommendation = Column(String, nullable=True)      # strategy the AI proposed
    policy_decision = Column(String, nullable=False)       # allowed | blocked
    explanation = Column(Text, nullable=True)              # human-readable reasoning
    execution_result = Column(String, nullable=True)       # what the Action Engine actually did

    case = relationship("RecoveryCase", back_populates="audit_logs")
