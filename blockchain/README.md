# AUTHENTIX blockchain

Hardhat project containing the tamper-evident authorization contract.

## Structure

```text
contracts/                     # Solidity source
  TransactionAuthorization.sol # Hash-only authorization record
scripts/deploy.ts              # Deployment script
test/                          # Hardhat contract tests
hardhat.config.ts              # Compiler and optional Sepolia network config
tsconfig.json                  # Hardhat-specific TypeScript settings
```

The npm scripts explicitly load this folder's `tsconfig.json`; do not run Hardhat from the repository root.

## Contract behavior

`TransactionAuthorization.authorize(bytes32 transactionHash, bool approved, string metadata)` stores one record per transaction hash:

- caller wallet address
- block timestamp
- approval or rejection decision
- non-sensitive metadata

It rejects attempts to overwrite an existing authorization. It must never receive the raw amount, beneficiary, account reference, audio, or API data.

The backend’s canonical `transactionHash` is the exact value that the wallet signs and the contract receives.

## Environment and commands

Copy `.env.example` to `.env` only when deploying to Sepolia.

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
```

```powershell
npm install
npm run compile
npm test
npm run deploy
```

## Local development chain

Use this workflow to test the contract without a public network, API, or MongoDB.

Terminal 1 — start and leave the local Hardhat blockchain running:

```powershell
cd blockchain
npm run node
```

Terminal 2 — deploy to that local chain:

```powershell
cd blockchain
npm run deploy:local
```

`deploy:local` is an alias for deployment to the local `localhost` network. Copy the printed contract address into `frontend/.env` as `VITE_CONTRACT_ADDRESS` only when you want to connect the dashboard through MetaMask.

After deployment, copy the deployed contract address to `frontend/.env` as `VITE_CONTRACT_ADDRESS`. Do not commit `.env`, RPC credentials, or private keys.
