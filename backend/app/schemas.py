"""Pydantic schemas — request/response contracts for the API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------

class GoogleLoginIn(BaseModel):
    credential: str = Field(description="The Google ID token (JWT) returned by Google Identity Services.")


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Incoming events ----------

class PaymentEventIn(BaseModel):
    customer_name: str
    customer_email: EmailStr
    amount: float = Field(gt=0)
    currency: str = "USD"
    status: str = Field(description="succeeded | failed")
    failure_code: Optional[str] = Field(
        default=None,
        description="e.g. insufficient_funds, card_expired, bank_decline, network_error",
    )
    case_id: Optional[str] = Field(
        default=None, description="If this event refers to an existing case (e.g. a retry outcome)"
    )


class CheckoutEventIn(BaseModel):
    customer_name: str
    customer_email: EmailStr
    amount: float = Field(gt=0)
    currency: str = "USD"
    abandonment_reason: Optional[str] = Field(
        default=None, description="e.g. price_hesitation, no_reason, shipping_cost, distraction"
    )


# ---------- Recovery case ----------

class AuditLogOut(BaseModel):
    id: str
    case_id: str
    timestamp: datetime
    event: str
    ai_recommendation: Optional[str]
    policy_decision: str
    explanation: Optional[str]
    execution_result: Optional[str]

    class Config:
        from_attributes = True


class RecoveryCaseOut(BaseModel):
    id: str
    customer_name: str
    customer_email: str
    amount: float
    currency: str
    event_type: str
    failure_code: Optional[str]
    failure_reason: Optional[str]
    recoverability_score: Optional[int]
    recommended_strategy: Optional[str]
    ai_explanation: Optional[str]
    status: str
    attempts: int
    max_attempts: int
    last_attempt_at: Optional[datetime]
    opted_out: bool
    recovered_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecoveryCaseDetailOut(RecoveryCaseOut):
    audit_logs: List[AuditLogOut] = []


class ProcessResultOut(BaseModel):
    case: RecoveryCaseOut
    audit_log: AuditLogOut


# ---------- Analytics ----------

class StrategyPerformance(BaseModel):
    strategy: str
    attempts: int
    recovered_count: int
    recovered_amount: float
    recovery_rate: float


class DashboardOut(BaseModel):
    total_revenue_at_risk: float
    total_revenue_recovered: float
    recovery_rate: float
    active_cases: int
    stopped_cases: int
    recovered_cases: int
    exhausted_cases: int
    total_cases: int
    performance_by_strategy: List[StrategyPerformance]
    cases_by_status: dict
    revenue_over_time: list
