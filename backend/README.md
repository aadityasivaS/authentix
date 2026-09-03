# AUTHENTIX backend

FastAPI service responsible for transaction analysis, Reality Defender integration, risk decisions, canonical hashing, MongoDB persistence, and audit records.

## Structure

```text
app/
├── core/            # Environment configuration and MongoDB client
├── models/          # Pydantic request models
├── repositories/    # MongoDB access with in-memory local fallback
├── routes/          # HTTP endpoints
├── services/        # Reality Defender, risk, hash, and audit logic
└── main.py          # FastAPI application entry point
tests/               # Service-level tests
```

## Important modules

- `services/reality_defender.py`: one analyzer interface with live and deterministic mock implementations.
- `services/risk_engine.py`: combines AI score with transaction-context signals.
- `services/transaction_hash.py`: source of truth for hashing the exact approved transaction fields.
- `repositories/`: writes `transactions` and append-only `audit_events`; uses temporary in-memory data when MongoDB is not configured.
- `routes/transactions.py`: transaction creation, analysis, decision, and blockchain-record endpoints.

## Environment

Copy `.env.example` to `.env`.

```env
MONGODB_URI=
MONGODB_DB=authentix
REALITY_DEFENDER_MODE=mock
REALITY_DEFENDER_API_KEY=
```

`mock` mode requires no external key. Set `REALITY_DEFENDER_MODE=real` only with a valid API key and audio-file request payload. Never expose this key to the frontend.

## Run and test

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload
.\.venv\Scripts\pytest
```

API contract: `../docs/api-contract.md`. The contract receives hashes only—never pass full transaction data to blockchain code.
