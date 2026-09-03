# API contract

Base URL: `http://localhost:8000/api/v1`

## Transaction lifecycle

`created -> analyzed -> low_risk | verification_required -> approved | denied -> recorded`

High-risk transactions become `verification_required`. A final wallet decision changes them to `approved` or `denied`; submitting its chain transaction hash changes them to `recorded`.

## `POST /transactions/analyze`

Creates a transaction, gets a deepfake signal, calculates its risk, and writes an audit event. JSON body:

```json
{
  "amount": 2500000,
  "currency": "INR",
  "beneficiary": "ABC Ltd",
  "beneficiaryAccount": "XXXX1234",
  "isNewBeneficiary": true,
  "isUnusualTime": true,
  "isUnknownDevice": true,
  "urgencyDetected": true,
  "demoScenario": "deepfake_attack",
  "audioBase64": null,
  "audioFilename": "request.wav"
}
```

`demoScenario` is one of `legitimate`, `suspicious`, or `deepfake_attack`. In mock mode it selects the deterministic AI result. The response includes the transaction id, normalized analysis, risk score, status, transaction hash, and audit events.

## `GET /transactions/{id}`

Returns a transaction and its audit events.

## `POST /transactions/{id}/decision`

```json
{ "decision": "approved", "walletAddress": "0x...", "signature": "0x..." }
```

The frontend obtains the wallet signature for the exact `transactionHash`; this endpoint stores the decision but never treats a signature as a bank transfer.

## `POST /transactions/{id}/blockchain`

```json
{ "blockchainTxHash": "0x..." }
```

Stores the blockchain transaction reference after the contract call succeeds. No sensitive transaction details are sent to the contract.
