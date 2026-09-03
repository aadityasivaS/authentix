from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from app.core.config import get_settings
from app.models.transactions import AnalyzeTransactionRequest, WalletDecisionRequest, BlockchainRecordRequest
from app.repositories.transactions import transactions
from app.repositories.audit_events import audit_events
from app.services.audit_service import record
from app.services.reality_defender import get_analyzer
from app.services.risk_engine import calculate_risk
from app.services.transaction_hash import transaction_hash

router = APIRouter(prefix="/transactions", tags=["transactions"])


def response(transaction: dict) -> dict:
    return {**transaction, "auditEvents": audit_events.list(transaction["id"])}


@router.post("/analyze", status_code=201)
async def analyze(payload: AnalyzeTransactionRequest) -> dict:
    values = payload.model_dump()
    analyzer = get_analyzer(get_settings())
    try:
        analysis = await analyzer.analyze(values["demoScenario"], values.pop("audioBase64"), values.pop("audioFilename"))
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if analysis["score"] is None:
        analysis["score"] = 0
    risk = calculate_risk(values, analysis)
    transaction_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    status = "verification_required" if risk["requiresVerification"] else "low_risk"
    transaction = {"id": transaction_id, **values, "analysis": analysis, "risk": risk, "status": status, "transactionHash": transaction_hash(values), "walletAuthorization": None, "blockchainTxHash": None, "createdAt": now, "updatedAt": now}
    transactions.create(transaction)
    record(transaction_id, "created")
    record(transaction_id, "analyzed", analysis=analysis, risk=risk)
    if status == "verification_required":
        record(transaction_id, "locked", reason="High risk requires independent executive verification")
    return response(transaction)


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str) -> dict:
    transaction = transactions.get(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return response(transaction)


@router.post("/{transaction_id}/decision")
async def decision(transaction_id: str, payload: WalletDecisionRequest) -> dict:
    transaction = transactions.get(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction["status"] not in {"verification_required", "low_risk"}:
        raise HTTPException(status_code=409, detail="Transaction already has a final decision")
    updated = transactions.update(transaction_id, {"status": payload.decision, "walletAuthorization": payload.model_dump()})
    record(transaction_id, payload.decision, walletAddress=payload.walletAddress)
    return response(updated)


@router.post("/{transaction_id}/blockchain")
async def blockchain(transaction_id: str, payload: BlockchainRecordRequest) -> dict:
    transaction = transactions.get(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction["status"] not in {"approved", "denied"}:
        raise HTTPException(status_code=409, detail="A wallet decision is required before recording on-chain")
    updated = transactions.update(transaction_id, {"status": "recorded", "blockchainTxHash": payload.blockchainTxHash})
    record(transaction_id, "recorded_on_chain", blockchainTxHash=payload.blockchainTxHash)
    return response(updated)
