"""
Policy Engine
=============

The single deterministic gatekeeper between AI recommendations and any
real-world action. The AI Agent's output is treated as advisory only —
nothing it suggests is executed until this module explicitly allows it.

Enforced policies (all hard-coded business rules, not learned/AI-driven):
  1. Maximum of `MAX_ATTEMPTS` recovery attempts per case.
  2. Minimum cooldown period between contact attempts on the same case.
  3. Immediate stop once a case is marked recovered (successful payment).
  4. Respect customer STOP / opt-out status — never contact again.
  5. Block any strategy that isn't in the allowed strategy set (defense in depth
     against a malformed or unexpected AI recommendation).

The engine returns a PolicyDecision that is always logged to the audit trail,
whether the action was allowed or blocked, together with the reason why.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models import RecoveryCase, CaseStatus, Strategy

MAX_ATTEMPTS = 3
COOLDOWN_MINUTES = 60  # minimum time required between two contact attempts

VALID_STRATEGIES = {s.value for s in Strategy}


@dataclass
class PolicyDecision:
    allowed: bool
    reason: str
    resulting_status: str  # status the case should move to regardless of allow/block


def evaluate(case: RecoveryCase, recommended_strategy: str, now: datetime = None) -> PolicyDecision:
    """Evaluate whether the AI's recommended strategy may be executed on this case."""
    now = now or datetime.utcnow()

    # Rule: already recovered -> hard stop, nothing may ever execute again.
    if case.status == CaseStatus.RECOVERED.value:
        return PolicyDecision(
            allowed=False,
            reason="Case already marked as recovered. No further action permitted.",
            resulting_status=CaseStatus.RECOVERED.value,
        )

    # Rule: respect opt-out / STOP status unconditionally.
    if case.opted_out:
        return PolicyDecision(
            allowed=False,
            reason="Customer has opted out (STOP). Contact is permanently blocked.",
            resulting_status=CaseStatus.STOPPED.value,
        )

    # Rule: strategy must be a recognized, allowed action.
    if recommended_strategy not in VALID_STRATEGIES:
        return PolicyDecision(
            allowed=False,
            reason=f"Unrecognized strategy '{recommended_strategy}' rejected by policy.",
            resulting_status=case.status,
        )

    # no_action never needs gating beyond the above — it does nothing.
    if recommended_strategy == Strategy.NO_ACTION.value:
        return PolicyDecision(
            allowed=True,
            reason="AI recommended no_action; nothing to gate.",
            resulting_status=case.status if case.status != CaseStatus.OPEN.value else CaseStatus.OPEN.value,
        )

    # Rule: maximum attempts.
    if case.attempts >= MAX_ATTEMPTS:
        return PolicyDecision(
            allowed=False,
            reason=f"Maximum recovery attempts ({MAX_ATTEMPTS}) already reached.",
            resulting_status=CaseStatus.EXHAUSTED.value,
        )

    # Rule: cooldown between attempts.
    if case.last_attempt_at is not None:
        elapsed = now - case.last_attempt_at
        if elapsed < timedelta(minutes=COOLDOWN_MINUTES):
            remaining = timedelta(minutes=COOLDOWN_MINUTES) - elapsed
            return PolicyDecision(
                allowed=False,
                reason=(
                    f"Cooldown active: {int(remaining.total_seconds() // 60)} minute(s) "
                    f"remaining before another contact attempt is permitted."
                ),
                resulting_status=case.status,
            )

    # All checks passed.
    return PolicyDecision(
        allowed=True,
        reason=f"All policy checks passed. '{recommended_strategy}' authorized.",
        resulting_status=CaseStatus.IN_PROGRESS.value,
    )
