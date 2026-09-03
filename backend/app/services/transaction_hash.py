import hashlib
import json
from typing import Any


HASH_FIELDS = ("amount", "currency", "beneficiary", "beneficiaryAccount")


def canonical_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    return {key: transaction[key] for key in HASH_FIELDS}


def transaction_hash(transaction: dict[str, Any]) -> str:
    payload = json.dumps(canonical_transaction(transaction), sort_keys=True, separators=(",", ":"))
    return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()
