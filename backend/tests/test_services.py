import pytest
from app.services.reality_defender import MockRealityDefender
from app.services.risk_engine import calculate_risk
from app.services.transaction_hash import transaction_hash


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario,status,score", [("legitimate", "AUTHENTIC", 8), ("suspicious", "SUSPICIOUS", 48), ("deepfake_attack", "FAKE", 78)])
async def test_mock_scenarios(scenario, status, score):
    result = await MockRealityDefender().analyze(scenario, None, None)
    assert result["mode"] == "mock"
    assert (result["status"], result["score"]) == (status, score)


def test_transaction_hash_is_stable_and_exact():
    first = {"amount": 10000, "currency": "INR", "beneficiary": "ABC", "beneficiaryAccount": "XXXX1234"}
    second = {**first, "amount": 10001}
    assert transaction_hash(first) == transaction_hash(first)
    assert transaction_hash(first) != transaction_hash(second)


def test_high_risk_requires_verification():
    transaction = {"amount": 2500000, "isNewBeneficiary": True, "isUnusualTime": True, "isUnknownDevice": True, "urgencyDetected": True}
    risk = calculate_risk(transaction, {"status": "FAKE", "score": 78})
    assert risk["requiresVerification"] is True
