# AUTHENTIX blockchain

Hardhat project containing the tamper-evident authorization contract.

## Structure

```text
contracts/                     # Solidity source
  TransactionAuthorization.sol # Hash-only authorization record
scripts/deploy.ts              # Deployment script
test/                          # Hardhat contract tests
hardhat.config.ts              # Compiler and optional Sepolia network config
```

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

After deployment, copy the deployed contract address to `frontend/.env` as `VITE_CONTRACT_ADDRESS`. Do not commit `.env`, RPC credentials, or private keys.
