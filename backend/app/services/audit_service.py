from app.repositories.audit_events import audit_events


def record(transaction_id: str, event_type: str, **details: object) -> None:
    audit_events.add(transaction_id, event_type, details)
