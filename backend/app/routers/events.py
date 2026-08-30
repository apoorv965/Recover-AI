"""
Events API
==========

Entry point for payment and checkout events, whether from a real payment
gateway webhook or the built-in simulator. Detection logic lives here:
failed payments and abandoned checkouts result in a new RecoveryCase.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RawEvent, RecoveryCase, EventType, CaseStatus
from app.schemas import PaymentEventIn, CheckoutEventIn, RecoveryCaseOut
from app.services import audit_service

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/payment", response_model=RecoveryCaseOut | None)
def receive_payment_event(payload: PaymentEventIn, db: Session = Depends(get_db)):
    """
    Receive a payment event.

    - status == "failed"    -> detect revenue at risk, open a RecoveryCase.
    - status == "succeeded" -> if it references an existing case_id, close it out
                                as recovered (immediate stop, per policy).
    """
    event = RawEvent(
        event_type=EventType.PAYMENT_FAILED.value if payload.status == "failed" else EventType.PAYMENT_SUCCEEDED.value,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        amount=payload.amount,
        currency=payload.currency,
        failure_code=payload.failure_code,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    if payload.status == "succeeded":
        if payload.case_id:
            case = db.query(RecoveryCase).filter(RecoveryCase.id == payload.case_id).first()
            if not case:
                raise HTTPException(status_code=404, detail="Referenced case_id not found")
            case.status = CaseStatus.RECOVERED.value
            case.recovered_amount = case.amount
            db.commit()
            db.refresh(case)
            audit_service.record(
                db, case.id, event="payment_succeeded",
                policy_decision="stop_all_actions",
                explanation="Payment succeeded; per policy, all recovery actions stop immediately.",
                execution_result="Case marked recovered.",
            )
            return case
        return None  # a plain successful payment with no at-risk case; nothing to track

    # Failed payment -> open a recovery case (revenue at risk detected)
    case = RecoveryCase(
        source_event_id=event.id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        amount=payload.amount,
        currency=payload.currency,
        event_type=EventType.PAYMENT_FAILED.value,
        failure_code=payload.failure_code,
        status=CaseStatus.OPEN.value,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    audit_service.record(
        db, case.id, event="case_opened",
        policy_decision="n/a",
        explanation=f"Detected failed payment (code: {payload.failure_code}). Revenue at risk: ${payload.amount:,.2f}.",
        execution_result="RecoveryCase created.",
    )
    return case


@router.post("/checkout", response_model=RecoveryCaseOut)
def receive_checkout_event(payload: CheckoutEventIn, db: Session = Depends(get_db)):
    """Receive a checkout-abandonment event and open a RecoveryCase for it."""
    event = RawEvent(
        event_type=EventType.CHECKOUT_ABANDONED.value,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        amount=payload.amount,
        currency=payload.currency,
        failure_code=payload.abandonment_reason,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    case = RecoveryCase(
        source_event_id=event.id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        amount=payload.amount,
        currency=payload.currency,
        event_type=EventType.CHECKOUT_ABANDONED.value,
        failure_code=payload.abandonment_reason,
        status=CaseStatus.OPEN.value,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    audit_service.record(
        db, case.id, event="case_opened",
        policy_decision="n/a",
        explanation=f"Detected checkout abandonment (reason: {payload.abandonment_reason}). Revenue at risk: ${payload.amount:,.2f}.",
        execution_result="RecoveryCase created.",
    )
    return case
