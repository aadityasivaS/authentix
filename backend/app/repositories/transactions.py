from datetime import datetime, timezone
from typing import Any
from app.core.database import database


class TransactionRepository:
    def __init__(self) -> None:
        self.memory: dict[str, dict[str, Any]] = {}

    def create(self, transaction: dict[str, Any]) -> None:
        self.memory[transaction["id"]] = transaction
        collection = database.collection("transactions")
        if collection is not None:
            collection.replace_one({"id": transaction["id"]}, transaction, upsert=True)

    def get(self, transaction_id: str) -> dict[str, Any] | None:
        collection = database.collection("transactions")
        if collection is not None:
            result = collection.find_one({"id": transaction_id}, {"_id": 0})
            if result:
                return result
        return self.memory.get(transaction_id)

    def update(self, transaction_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        current = self.get(transaction_id)
        if current is None:
            return None
        current.update(updates)
        current["updatedAt"] = datetime.now(timezone.utc).isoformat()
        self.create(current)
        return current


transactions = TransactionRepository()
