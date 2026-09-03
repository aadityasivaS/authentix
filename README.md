# AUTHENTIX

Deepfake-resistant executive transaction authorization demo. The application combines a Reality Defender risk signal, transaction context, independent wallet authorization, MongoDB audit records, and a hash-only blockchain record.

## Quick start

1. Copy `backend/.env.example` to `backend/.env`. Mock mode is the default and needs no API key or MongoDB instance.
2. Start the API: `cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt; .\.venv\Scripts\uvicorn app.main:app --reload`
3. Start the dashboard: `cd frontend; npm install; npm run dev`
4. For the contract: `cd blockchain; npm install; npm test`

Set `MONGODB_URI` for persistent audit records. Set `REALITY_DEFENDER_MODE=real` and `REALITY_DEFENDER_API_KEY` only when using a live Reality Defender account.
