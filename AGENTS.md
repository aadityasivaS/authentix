# AUTHENTIX contributor guide

AUTHENTIX is a 24-hour hackathon MVP for deepfake-resistant executive transaction authorization. It does **not** transfer money. It proves that an executive wallet authorized the exact transaction hash after risk analysis.

## Repository map and ownership

| Area | Folder | Owner focus |
|---|---|---|
| Dashboard | `frontend/` | React/Vite UI, API requests, MetaMask flow |
| API + AI | `backend/` | FastAPI, MongoDB, Reality Defender, risk engine, audit trail |
| Smart contract | `blockchain/` | Solidity, Hardhat tests/deployment |
| Shared agreement | `docs/api-contract.md` | API payloads and transaction lifecycle |

Avoid changing another area unless the change is required for integration. Update `docs/api-contract.md` before changing a backend/frontend request or response shape.

## Core flow

1. A user creates a transaction request in the React dashboard.
2. FastAPI analyzes the audio through Reality Defender, or a deterministic mock.
3. The risk engine combines that score with transaction-context signals.
4. High-risk requests become `verification_required`; an executive wallet approves or denies the exact transaction hash.
5. The Solidity contract records only the hash, wallet address, timestamp, decision, and non-sensitive metadata.
6. MongoDB stores the full transaction record and append-only audit events.

## Non-negotiable rules

- Deepfake analysis is a risk signal, never absolute fraud proof.
- Never put amounts, beneficiary details, account references, raw audio, API keys, or other sensitive data on-chain.
- The backend generates the canonical transaction hash. Do not duplicate hashing logic in the frontend.
- The hash must be calculated from exactly `amount`, `currency`, `beneficiary`, and `beneficiaryAccount` using the existing canonical JSON implementation.
- Keep Reality Defender API keys server-side in `backend/.env` only.
- Clearly label all mock AI output as **Mock analysis** in the UI.
- Do not claim that blockchain detects deepfakes or proves real-world identity.

## Reality Defender modes

Set these in `backend/.env` (copy from `backend/.env.example`):

```env
REALITY_DEFENDER_MODE=mock
MONGODB_URI=
```

- `mock` is the default. It has no external dependency and maps scenarios to fixed outcomes:
  - `legitimate` → `AUTHENTIC`, 8
  - `suspicious` → `SUSPICIOUS`, 48
  - `deepfake_attack` → `FAKE`, 78
- `real` requires `REALITY_DEFENDER_API_KEY` plus an audio file submitted as Base64 and filename. The provider workflow is signed upload URL → upload → result polling.

## API and statuses

Read `docs/api-contract.md` before editing either client or server behavior.

Lifecycle: `created → analyzed → low_risk | verification_required → approved | denied → recorded`.

API base URL: `http://localhost:8000/api/v1`

- `POST /transactions/analyze`
- `GET /transactions/{id}`
- `POST /transactions/{id}/decision`
- `POST /transactions/{id}/blockchain`

## Local commands

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Contract checks
cd blockchain
npm install
npm test
```

## Before handing off a change

1. Keep a change scoped to one folder wherever possible.
2. Add or update tests for API/risk/hash/contract behavior.
3. Run the relevant checks.
4. Confirm mock mode still works without a MongoDB URI or Reality Defender key.
5. Never commit `.env`, private keys, API keys, `node_modules`, or build artifacts.
