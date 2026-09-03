from datetime import datetime, timezone
from typing import Any
from app.core.database import database


class AuditRepository:
    def __init__(self) -> None:
        self.memory: dict[str, list[dict[str, Any]]] = {}

    def add(self, transaction_id: str, event_type: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
        event = {"transactionId": transaction_id, "eventType": event_type, "details": details or {}, "createdAt": datetime.now(timezone.utc).isoformat()}
        self.memory.setdefault(transaction_id, []).append(event)
        collection = database.collection("audit_events")
        if collection is not None:
            collection.insert_one(event)
        return event

    def list(self, transaction_id: str) -> list[dict[str, Any]]:
        collection = database.collection("audit_events")
        if collection is not None:
            return list(collection.find({"transactionId": transaction_id}, {"_id": 0}).sort("createdAt", 1))
        return self.memory.get(transaction_id, [])


audit_events = AuditRepository()
