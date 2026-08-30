"""Audit Trail API — read-only access to the immutable-style decision log."""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    case_id: Optional[str] = Query(default=None),
    limit: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if case_id:
        q = q.filter(AuditLog.case_id == case_id)
    return q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
