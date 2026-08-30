"""
Analytics API
=============

Aggregates case data into the metrics the admin dashboard needs:
revenue at risk, revenue recovered, recovery rate, case counts by status,
and performance broken down by recovery strategy.
"""
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecoveryCase, CaseStatus
from app.schemas import DashboardOut, StrategyPerformance

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    cases = db.query(RecoveryCase).all()

    total_revenue_at_risk = sum(c.amount for c in cases)
    total_revenue_recovered = sum(c.recovered_amount for c in cases)
    recovery_rate = (
        round(100 * total_revenue_recovered / total_revenue_at_risk, 1)
        if total_revenue_at_risk > 0 else 0.0
    )

    cases_by_status = defaultdict(int)
    for c in cases:
        cases_by_status[c.status] += 1

    active_cases = cases_by_status.get(CaseStatus.OPEN.value, 0) + cases_by_status.get(CaseStatus.IN_PROGRESS.value, 0)
    stopped_cases = cases_by_status.get(CaseStatus.STOPPED.value, 0)
    recovered_cases = cases_by_status.get(CaseStatus.RECOVERED.value, 0)
    exhausted_cases = cases_by_status.get(CaseStatus.EXHAUSTED.value, 0)

    # Performance by strategy
    strat_attempts = defaultdict(int)
    strat_recovered_count = defaultdict(int)
    strat_recovered_amount = defaultdict(float)

    for c in cases:
        if c.recommended_strategy:
            strat_attempts[c.recommended_strategy] += 1
            if c.status == CaseStatus.RECOVERED.value:
                strat_recovered_count[c.recommended_strategy] += 1
                strat_recovered_amount[c.recommended_strategy] += c.recovered_amount

    performance_by_strategy = []
    for strategy, attempts in strat_attempts.items():
        recovered_count = strat_recovered_count.get(strategy, 0)
        performance_by_strategy.append(
            StrategyPerformance(
                strategy=strategy,
                attempts=attempts,
                recovered_count=recovered_count,
                recovered_amount=round(strat_recovered_amount.get(strategy, 0.0), 2),
                recovery_rate=round(100 * recovered_count / attempts, 1) if attempts else 0.0,
            )
        )
    performance_by_strategy.sort(key=lambda p: p.attempts, reverse=True)

    # Revenue over time (grouped by day of case creation)
    by_day = defaultdict(lambda: {"at_risk": 0.0, "recovered": 0.0})
    for c in cases:
        day = c.created_at.strftime("%Y-%m-%d")
        by_day[day]["at_risk"] += c.amount
        by_day[day]["recovered"] += c.recovered_amount
    revenue_over_time = [
        {"date": day, "at_risk": round(v["at_risk"], 2), "recovered": round(v["recovered"], 2)}
        for day, v in sorted(by_day.items())
    ]

    return DashboardOut(
        total_revenue_at_risk=round(total_revenue_at_risk, 2),
        total_revenue_recovered=round(total_revenue_recovered, 2),
        recovery_rate=recovery_rate,
        active_cases=active_cases,
        stopped_cases=stopped_cases,
        recovered_cases=recovered_cases,
        exhausted_cases=exhausted_cases,
        total_cases=len(cases),
        performance_by_strategy=performance_by_strategy,
        cases_by_status=dict(cases_by_status),
        revenue_over_time=revenue_over_time,
    )
