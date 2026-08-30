"""
Recovery Cases API
==================

Exposes the core workflow:
    GET  /recovery-cases                 -> list + filter cases
    GET  /recovery-cases/{id}            -> case detail with full audit timeline
    POST /recovery-cases/{id}/process    -> run AI -> Policy -> Action pipeline once
    POST /recovery-cases/{id}/simulate-success -> demo helper: mark payment as recovered
    POST /recovery-cases/{id}/opt-out    -> mark customer as opted out (STOP)
"""
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecoveryCase, CaseStatus
from app.schemas import RecoveryCaseOut, RecoveryCaseDetailOut, ProcessResultOut, AuditLogOut
from app.services import ai_agent, policy_engine, action_engine, audit_service

router = APIRouter(prefix="/recovery-cases", tags=["recovery-cases"])


@router.get("", response_model=List[RecoveryCaseOut])
def list_cases(
    status: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(RecoveryCase)
    if status:
        q = q.filter(RecoveryCase.status == status)
    if event_type:
        q = q.filter(RecoveryCase.event_type == event_type)
    return q.order_by(RecoveryCase.created_at.desc()).all()


@router.get("/{case_id}", response_model=RecoveryCaseDetailOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/{case_id}/process", response_model=ProcessResultOut)
def process_case(case_id: str, db: Session = Depends(get_db)):
    """
    Run the full pipeline once: AI Agent recommends -> Policy Engine validates
    -> Action Engine executes (if allowed) -> Audit System records.
    """
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status in (CaseStatus.RECOVERED.value,):
        raise HTTPException(status_code=400, detail="Case already recovered; no further processing allowed.")

    # 1. AI recommends
    recommendation = ai_agent.analyze_case(case)
    case.failure_reason = recommendation.failure_reason
    case.recoverability_score = recommendation.recoverability_score
    case.recommended_strategy = recommendation.strategy
    case.ai_explanation = recommendation.explanation

    # 2. Policy Engine validates
    decision = policy_engine.evaluate(case, recommendation.strategy)

    # 3. Action Engine executes (only if allowed)
    if decision.allowed:
        execution_result = action_engine.execute(case, recommendation.strategy)
    else:
        execution_result = "Blocked — no action executed."

    case.status = decision.resulting_status
    db.commit()
    db.refresh(case)

    # 4. Audit System records
    log = audit_service.record(
        db, case.id,
        event="case_processed",
        ai_recommendation=recommendation.strategy,
        policy_decision="allowed" if decision.allowed else "blocked",
        explanation=f"AI: {recommendation.explanation} | Policy: {decision.reason}",
        execution_result=execution_result,
    )

    return ProcessResultOut(case=case, audit_log=log)


@router.post("/{case_id}/simulate-success", response_model=RecoveryCaseOut)
def simulate_success(case_id: str, db: Session = Depends(get_db)):
    """
    Demo helper: simulate the customer completing payment (e.g. after clicking
    a recovery link or a retry succeeding). Per policy this immediately stops
    all further recovery actions and marks revenue as recovered.
    """
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status == CaseStatus.RECOVERED.value:
        raise HTTPException(status_code=400, detail="Case already recovered.")

    case.status = CaseStatus.RECOVERED.value
    case.recovered_amount = case.amount
    db.commit()
    db.refresh(case)

    audit_service.record(
        db, case.id, event="payment_succeeded",
        policy_decision="stop_all_actions",
        explanation="Payment succeeded (simulated). Per policy, all recovery actions stop immediately.",
        execution_result=f"Recovered ${case.amount:,.2f}.",
    )
    return case


@router.post("/{case_id}/opt-out", response_model=RecoveryCaseOut)
def opt_out(case_id: str, db: Session = Depends(get_db)):
    """Mark a customer as opted out (STOP). The Policy Engine will block all future contact."""
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.opted_out = True
    case.status = CaseStatus.STOPPED.value
    db.commit()
    db.refresh(case)

    audit_service.record(
        db, case.id, event="customer_opted_out",
        policy_decision="blocked",
        explanation="Customer requested STOP / opted out of further contact.",
        execution_result="All future recovery actions blocked for this case.",
    )
    return case
