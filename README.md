# AUTHENTIX

Deepfake-resistant executive transaction authorization demo. AUTHENTIX combines a Reality Defender risk signal, transaction context, independent wallet authorization, MongoDB audit records, and a hash-only blockchain record. It does **not** transfer money.

## What you need

- Node.js 20+ and npm
- Python 3.11+
- A MongoDB Atlas connection string (recommended for shared team data)
- MetaMask only if you want to demonstrate on-chain recording
- A Reality Defender API key only for live AI analysis; mock mode needs no key

## Run the full demo in mock mode

Mock mode is the quickest complete demo: it runs frontend + backend + MongoDB, and provides deterministic AI results without calling Reality Defender.

### 1. Configure MongoDB and backend

Create a free MongoDB Atlas cluster, create a database user, allow your development IP address, then copy its connection string. From the repository root, run:

```powershell
Copy-Item backend/.env.example backend/.env
```

Open `backend/.env` and set your connection string. Keep mock mode enabled:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/
MONGODB_DB=authentix
REALITY_DEFENDER_MODE=mock
REALITY_DEFENDER_API_KEY=
CORS_ORIGINS=http://localhost:5173
```

> You can leave `MONGODB_URI` blank temporarily. The API will then use in-memory data, which is lost whenever it restarts.

### 2. Start the FastAPI backend — terminal 1

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Confirm the API is working by opening [http://localhost:8000/health](http://localhost:8000/health). It should show `"realityDefenderMode":"mock"`.

### 3. Start the React dashboard — terminal 2

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

### 4. Run the demo

1. Select **Legitimate**, enter `10000`, and analyze. It should produce a low-risk result.
2. Select **Suspicious**, analyze, and review the increased context risk.
3. Select **Deepfake attack**, enter `2500000`, and analyze. The result should be high risk and become `verification_required`.
4. Click **Approve as executive** or **Deny request**. With no contract configured, this is the dashboard’s local demo authorization path.
5. Check your MongoDB Atlas `authentix` database: `transactions` holds the record and `audit_events` holds its lifecycle history.

Every mock result is visibly labeled **Mock analysis**. Do not present it as live AI detection.

## Add the local blockchain + MetaMask flow

This enables the contract record step in the dashboard. Keep the backend and frontend running from the previous section.

### 1. Start a local Hardhat chain — terminal 3

```powershell
cd blockchain
npm install
npm run node
```

Leave this terminal running. Copy one displayed private key only into a local test MetaMask account; never use or import a real wallet key for this demo.

### 2. Deploy the contract — terminal 4

```powershell
cd blockchain
npm run deploy:local
```

Copy the printed `TransactionAuthorization deployed to:` address.

### 3. Configure MetaMask and the frontend

In MetaMask, add a local network:

```text
Network name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

Import a Hardhat test account using the private key from terminal 3. Then update `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_CONTRACT_ADDRESS=<deployed-contract-address>
```

Restart `npm run dev` after editing the file. Run the high-risk scenario again and choose approve or deny. MetaMask will ask for a signature and contract transaction confirmation. AUTHENTIX then saves the blockchain transaction hash to MongoDB and the audit trail.

## Use the live Reality Defender API

After mock mode works, update `backend/.env`:

```env
REALITY_DEFENDER_MODE=real
REALITY_DEFENDER_API_KEY=<your-reality-defender-api-key>
```

Restart FastAPI. Real mode requires both `audioBase64` and `audioFilename` in the analysis request. The present UI is intentionally mock-first; add an audio upload control before using real mode through the dashboard. The backend obtains a signed upload URL, uploads the audio, and polls Reality Defender for the ensemble result.

## Checks

Run these before a demo or merge:

```powershell
# Backend tests
cd backend
.\.venv\Scripts\pytest

# Frontend production build
cd frontend
npm run build

# Contract tests
cd blockchain
npm test
```

## Security rules

- Keep `.env`, MongoDB credentials, Reality Defender keys, RPC URLs, and private keys out of Git.
- Never store raw transaction details, audio, or API data in the contract. The contract stores only the backend-generated transaction hash, wallet, timestamp, decision, and safe metadata.
- A deepfake score is a risk signal, not proof of fraud.
- Read [AGENTS.md](AGENTS.md) and [docs/api-contract.md](docs/api-contract.md) before changing cross-team behavior.
