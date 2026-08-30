"""
AI Recovery Agent
==================

Responsible for ONE thing: looking at a RecoveryCase and producing a
*recommendation* — a failure classification, a recoverability score (0-100),
a suggested strategy, and a plain-English explanation.

CRITICAL DESIGN RULE:
The agent NEVER executes anything and NEVER touches money. Its output is
just a suggestion object that is handed to the Policy Engine, which is the
only component allowed to authorize an action. This mirrors the required
architecture: AI recommends -> Policy Engine validates -> Action Engine executes.

The scoring here is implemented as a transparent, deterministic rules engine
(rather than a black-box call) so every recommendation is explainable and
reproducible for the audit trail — appropriate for a financial-adjacent
decisioning system.
"""
from dataclasses import dataclass
from app.models import RecoveryCase, EventType, Strategy


# Failure codes mapped to a human-readable reason and a base recoverability score.
# Higher score == more likely a retry/reminder will recover the revenue.
FAILURE_PROFILES = {
    "insufficient_funds": {"reason": "Insufficient funds at time of charge", "base_score": 55},
    "card_expired": {"reason": "Card expired", "base_score": 35},
    "bank_decline": {"reason": "Bank declined the transaction", "base_score": 40},
    "network_error": {"reason": "Transient network/gateway error", "base_score": 85},
    "processor_timeout": {"reason": "Payment processor timeout", "base_score": 80},
    "fraud_flag": {"reason": "Flagged by fraud detection", "base_score": 10},
    "price_hesitation": {"reason": "Customer hesitated on price at checkout", "base_score": 45},
    "shipping_cost": {"reason": "Abandoned due to shipping cost", "base_score": 60},
    "distraction": {"reason": "Checkout abandoned mid-flow (likely distraction)", "base_score": 65},
    "no_reason": {"reason": "Checkout abandoned, no clear signal", "base_score": 40},
}

DEFAULT_FAILURE_PROFILE = {"reason": "Unclassified failure", "base_score": 30}


@dataclass
class AIRecommendation:
    failure_reason: str
    recoverability_score: int
    strategy: str
    explanation: str


def _score_to_strategy(event_type: str, score: int, failure_code: str) -> str:
    """Deterministic strategy selection based on event type + score band."""
    if failure_code == "fraud_flag":
        return Strategy.NO_ACTION.value

    if event_type == EventType.CHECKOUT_ABANDONED.value:
        if score >= 60:
            return Strategy.RECOVERY_LINK.value
        if score >= 40:
            return Strategy.PERSONALIZED_REMINDER.value
        return Strategy.NO_ACTION.value

    # payment_failed
    if score >= 75:
        return Strategy.IMMEDIATE_RETRY.value
    if score >= 45:
        return Strategy.DELAYED_RETRY.value
    if score >= 25:
        return Strategy.PERSONALIZED_REMINDER.value
    return Strategy.NO_ACTION.value


def analyze_case(case: RecoveryCase) -> AIRecommendation:
    """
    Produce a recommendation for the given case.

    Score adjustments:
      - Base score comes from the failure/abandonment profile.
      - High-value transactions are nudged toward more proactive outreach
        (the merchant has more to gain), but very high-value ones are
        slightly discounted to reflect higher fraud/chargeback caution.
      - Each prior attempt reduces the score (diminishing returns / fatigue).
      - Opted-out customers always score 0 and get no_action, enforced here
        for transparency even though the Policy Engine independently blocks
        contact with opted-out customers regardless of AI output.
    """
    profile = FAILURE_PROFILES.get(case.failure_code, DEFAULT_FAILURE_PROFILE)
    score = profile["base_score"]
    reason = profile["reason"]

    if case.opted_out:
        return AIRecommendation(
            failure_reason=reason,
            recoverability_score=0,
            strategy=Strategy.NO_ACTION.value,
            explanation="Customer has opted out of contact; recommending no_action.",
        )

    # Value-based adjustment
    if case.amount >= 500:
        score += 5
    elif case.amount >= 100:
        score += 10
    if case.amount >= 2000:
        score -= 10  # large amounts: be more conservative

    # Fatigue: each previous attempt reduces the chance the next one lands
    score -= case.attempts * 12

    score = max(0, min(100, score))
    strategy = _score_to_strategy(case.event_type, score, case.failure_code)

    explanation = (
        f"Classified as '{reason}' (code: {case.failure_code or 'n/a'}). "
        f"Base recoverability for this failure type is {profile['base_score']}, "
        f"adjusted for transaction amount (${case.amount:,.2f}) and "
        f"{case.attempts} prior attempt(s), yielding a score of {score}/100. "
        f"Recommended strategy: '{strategy}'."
    )

    return AIRecommendation(
        failure_reason=reason,
        recoverability_score=score,
        strategy=strategy,
        explanation=explanation,
    )
