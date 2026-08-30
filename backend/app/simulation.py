"""
Synthetic Transaction Simulator
================================

Generates a realistic batch of transactions to populate the demo:
  - successful payments        (no revenue at risk)
  - temporary payment failures (network/processor issues -> highly recoverable)
  - permanent payment failures (expired card, fraud flag -> low recoverability)
  - checkout abandonment       (mixed recoverability)

Most generated cases are also run through the AI -> Policy -> Action pipeline
(with backdated timestamps so cooldown rules are naturally satisfied) so that,
immediately after seeding, the dashboard shows meaningful revenue-at-risk and
revenue-recovered numbers. A subset of cases are left untouched ("open") so
the live demo can show the pipeline running in real time from the UI.
"""
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import RawEvent, RecoveryCase, EventType, CaseStatus
from app.services import ai_agent, policy_engine, action_engine, audit_service

FIRST_NAMES = ["Ava", "Liam", "Noah", "Emma", "Olivia", "Mia", "Ethan", "Sophia",
               "Lucas", "Isla", "Mason", "Zoe", "Amir", "Priya", "Diego", "Yuki",
               "Fatima", "Leo", "Nora", "Kai"]
LAST_NAMES = ["Patel", "Garcia", "Chen", "Smith", "Johnson", "Kim", "Rossi", "Nguyen",
              "Muller", "Silva", "Khan", "Andersson", "Dubois", "Ivanov", "Tanaka"]

TEMP_FAILURE_CODES = ["network_error", "processor_timeout", "bank_decline"]
PERM_FAILURE_CODES = ["card_expired", "fraud_flag", "insufficient_funds"]
ABANDON_REASONS = ["price_hesitation", "shipping_cost", "distraction", "no_reason"]


def _random_customer():
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    email = f"{name.lower().replace(' ', '.')}{random.randint(1,999)}@example.com"
    return name, email


def _random_amount(high_value=False):
    if high_value:
        return round(random.uniform(300, 2500), 2)
    return round(random.uniform(15, 400), 2)


def _open_case(db, event_type, amount, failure_code, created_at):
    name, email = _random_customer()
    event = RawEvent(
        event_type=event_type,
        customer_name=name,
        customer_email=email,
        amount=amount,
        failure_code=failure_code,
        created_at=created_at,
    )
    db.add(event)
    db.flush()

    case = RecoveryCase(
        source_event_id=event.id,
        customer_name=name,
        customer_email=email,
        amount=amount,
        event_type=event_type,
        failure_code=failure_code,
        status=CaseStatus.OPEN.value,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(case)
    db.flush()

    audit_service.record(
        db, case.id, event="case_opened",
        policy_decision="n/a",
        explanation=f"Detected {event_type} (code: {failure_code}). Revenue at risk: ${amount:,.2f}.",
        execution_result="RecoveryCase created.",
        timestamp=created_at,
    )
    return case


def _run_pipeline_step(db: Session, case: RecoveryCase, sim_time: datetime):
    """Run one AI -> Policy -> Action -> Audit cycle at a simulated point in time."""
    recommendation = ai_agent.analyze_case(case)
    case.failure_reason = recommendation.failure_reason
    case.recoverability_score = recommendation.recoverability_score
    case.recommended_strategy = recommendation.strategy
    case.ai_explanation = recommendation.explanation

    decision = policy_engine.evaluate(case, recommendation.strategy, now=sim_time)

    if decision.allowed:
        execution_result = action_engine.execute(case, recommendation.strategy, now=sim_time)
    else:
        execution_result = "Blocked — no action executed."

    case.status = decision.resulting_status
    case.updated_at = sim_time
    db.flush()

    audit_service.record(
        db, case.id, event="case_processed",
        ai_recommendation=recommendation.strategy,
        policy_decision="allowed" if decision.allowed else "blocked",
        explanation=f"AI: {recommendation.explanation} | Policy: {decision.reason}",
        execution_result=execution_result,
        timestamp=sim_time,
    )
    return decision


def _simulate_case_lifecycle(db: Session, case: RecoveryCase, base_time: datetime, recovery_chance: float):
    """
    Simulate a case having lived through some pipeline cycles already, spaced
    hours apart so the cooldown policy is naturally satisfied, ending in a
    randomized realistic outcome (recovered / exhausted / still in progress / stopped).
    """
    time_cursor = base_time
    # Small chance the customer opts out immediately after the first contact
    will_opt_out = random.random() < 0.06

    for attempt_num in range(3):
        time_cursor += timedelta(hours=random.randint(2, 30))
        decision = _run_pipeline_step(db, case, time_cursor)

        if case.recommended_strategy == "no_action":
            break
        if not decision.allowed:
            break

        # Chance of recovery after this contact attempt
        if random.random() < recovery_chance:
            time_cursor += timedelta(hours=random.randint(1, 12))
            case.status = CaseStatus.RECOVERED.value
            case.recovered_amount = case.amount
            case.updated_at = time_cursor
            db.flush()
            audit_service.record(
                db, case.id, event="payment_succeeded",
                policy_decision="stop_all_actions",
                explanation="Payment succeeded following recovery outreach.",
                execution_result=f"Recovered ${case.amount:,.2f}.",
                timestamp=time_cursor,
            )
            return

        if will_opt_out and attempt_num == 0:
            time_cursor += timedelta(hours=1)
            case.opted_out = True
            case.status = CaseStatus.STOPPED.value
            case.updated_at = time_cursor
            db.flush()
            audit_service.record(
                db, case.id, event="customer_opted_out",
                policy_decision="blocked",
                explanation="Customer requested STOP / opted out of further contact.",
                execution_result="All future recovery actions blocked for this case.",
                timestamp=time_cursor,
            )
            return
    # otherwise: leaves the case in whatever state the loop landed on
    # (in_progress or exhausted), ready to be shown mid-flow in the demo.


def generate_batch(db: Session, count: int = 120, seed: int = 42):
    """
    Generate `count` synthetic transactions across the required mix and run
    most of the resulting cases through the pipeline so the dashboard has
    meaningful numbers immediately after seeding.
    """
    random.seed(seed)
    now = datetime.utcnow()

    # Target distribution
    n_success = int(count * 0.35)
    n_temp_fail = int(count * 0.25)
    n_perm_fail = int(count * 0.20)
    n_abandoned = count - n_success - n_temp_fail - n_perm_fail

    created_cases = []

    # 1. Successful payments — logged as events only, no case (no revenue at risk)
    for _ in range(n_success):
        name, email = _random_customer()
        created_at = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
        db.add(RawEvent(
            event_type=EventType.PAYMENT_SUCCEEDED.value,
            customer_name=name, customer_email=email,
            amount=_random_amount(), created_at=created_at,
        ))

    # 2. Temporary failures — high recoverability
    for _ in range(n_temp_fail):
        created_at = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
        case = _open_case(
            db, EventType.PAYMENT_FAILED.value,
            _random_amount(high_value=random.random() < 0.25),
            random.choice(TEMP_FAILURE_CODES),
            created_at,
        )
        created_cases.append((case, created_at, 0.55))  # high recovery chance

    # 3. Permanent failures — low recoverability
    for _ in range(n_perm_fail):
        created_at = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
        case = _open_case(
            db, EventType.PAYMENT_FAILED.value,
            _random_amount(high_value=random.random() < 0.15),
            random.choice(PERM_FAILURE_CODES),
            created_at,
        )
        created_cases.append((case, created_at, 0.12))  # low recovery chance

    # 4. Checkout abandonment — mixed recoverability
    for _ in range(n_abandoned):
        created_at = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
        case = _open_case(
            db, EventType.CHECKOUT_ABANDONED.value,
            _random_amount(high_value=random.random() < 0.2),
            random.choice(ABANDON_REASONS),
            created_at,
        )
        created_cases.append((case, created_at, 0.35))

    db.commit()

    # Run ~70% of created cases through the pipeline now; leave the rest "open"
    # so the live demo can show real-time processing from the UI.
    random.shuffle(created_cases)
    split_point = int(len(created_cases) * 0.7)
    to_simulate = created_cases[:split_point]

    for case, created_at, recovery_chance in to_simulate:
        _simulate_case_lifecycle(db, case, created_at, recovery_chance)

    db.commit()

    return {
        "total_events": count,
        "successful_payments": n_success,
        "temporary_failures": n_temp_fail,
        "permanent_failures": n_perm_fail,
        "abandoned_checkouts": n_abandoned,
        "cases_created": len(created_cases),
        "cases_pre_processed": len(to_simulate),
        "cases_left_open": len(created_cases) - len(to_simulate),
    }
