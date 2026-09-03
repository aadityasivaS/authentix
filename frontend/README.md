# AUTHENTIX frontend

React + Vite + Tailwind CSS dashboard for creating transaction requests, viewing risk analysis, and initiating executive authorization.

## Structure

```text
src/
├── api/             # Calls to the FastAPI transaction endpoints
├── types/           # Dashboard-local TypeScript response types
├── utils/wallet.ts  # MetaMask signing and optional smart-contract submission
├── App.tsx          # MVP dashboard and demo flow
├── main.tsx         # React entry point
└── style.css        # Tailwind import, theme tokens, and base/component styles
```

## Responsibilities

- Send transaction details and a demo scenario to `POST /transactions/analyze`.
- Display Reality Defender status, score, calculated risk, transaction hash, and audit events.
- Let users upload a supported, labelled audio file from the file system; the audio is Base64 encoded only for the request to the FastAPI backend.
- Always show **Mock analysis** when the backend responds with `analysis.mode: "mock"`.
- In local demo mode, submit a placeholder executive decision to the backend.
- When `VITE_CONTRACT_ADDRESS` is configured, use MetaMask to sign the backend hash, call the contract, then save the blockchain transaction hash through the API.

The frontend must not calculate transaction hashes, access MongoDB, or contain Reality Defender credentials.

## Environment

Copy `.env.example` to `.env`.

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_CONTRACT_ADDRESS=
```

Leave `VITE_CONTRACT_ADDRESS` blank for the no-wallet demo flow. Set it to a deployed `TransactionAuthorization` address to enable MetaMask and on-chain recording.

For live Reality Defender mode, choose a short labelled audio clip (maximum 20 MB) from the file system. Audio is required only when the backend sets `REALITY_DEFENDER_MODE=real`.

## Run

```powershell
npm install
npm run dev
```

Tailwind uses the Vite plugin (Tailwind v4), so the MVP does not need a `tailwind.config.js`. Use utility classes or the small reusable component classes in `src/style.css`.

If dependencies were installed before a version update, run `npm install` again before starting Vite.

Read `../docs/api-contract.md` before changing API payloads or statuses.
