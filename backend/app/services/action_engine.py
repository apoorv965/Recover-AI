"""
Action Engine
=============

The only component that actually "does" anything, and only after the Policy
Engine has authorized it. In a production system this is where you'd call a
payment gateway's retry API, enqueue an email/SMS via a messaging provider,
or generate a hosted recovery-link checkout session. For this MVP the
integrations are simulated, but the module boundary is real: this is where
you'd plug in Stripe/Braintree retries, SendGrid/Twilio reminders, etc.
"""
from datetime import datetime

from app.models import RecoveryCase, Strategy

SIMULATED_EXECUTION = {
    Strategy.IMMEDIATE_RETRY.value: "Charged card immediately via payment gateway retry API.",
    Strategy.DELAYED_RETRY.value: "Scheduled a retry charge in 24 hours via payment gateway.",
    Strategy.PERSONALIZED_REMINDER.value: "Sent a personalized email/SMS reminder to the customer.",
    Strategy.RECOVERY_LINK.value: "Generated and sent a one-click hosted recovery checkout link.",
    Strategy.NO_ACTION.value: "No customer-facing action taken.",
}


def execute(case: RecoveryCase, strategy: str, now: datetime = None) -> str:
    """
    Execute the authorized strategy against the case.

    Mutates the in-memory `case` object's attempt bookkeeping (the caller is
    responsible for committing the DB session). Returns a human-readable
    execution result string for the audit log.
    """
    now = now or datetime.utcnow()

    if strategy != Strategy.NO_ACTION.value:
        case.attempts += 1
        case.last_attempt_at = now

    return SIMULATED_EXECUTION.get(strategy, f"Executed unrecognized strategy '{strategy}'.")
