"""
Audit Service
=============

Writes append-only entries to the audit trail. Rows are never updated or
deleted by application code, giving an immutable-style record of every
decision made in the system: what the AI recommended, what the Policy Engine
decided (and why), and what the Action Engine actually did.
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    case_id: str,
    event: str,
    policy_decision: str,
    explanation: str,
    ai_recommendation: str = None,
    execution_result: str = None,
    timestamp: datetime = None,
) -> AuditLog:
    log = AuditLog(
        case_id=case_id,
        timestamp=timestamp or datetime.utcnow(),
        event=event,
        ai_recommendation=ai_recommendation,
        policy_decision=policy_decision,
        explanation=explanation,
        execution_result=execution_result,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
