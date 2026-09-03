from typing import Literal
from pydantic import BaseModel, Field


Scenario = Literal["legitimate", "suspicious", "deepfake_attack"]
Decision = Literal["approved", "denied"]


class AnalyzeTransactionRequest(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "INR"
    beneficiary: str = Field(min_length=1, max_length=120)
    beneficiaryAccount: str = Field(min_length=4, max_length=64)
    isNewBeneficiary: bool = False
    isUnusualTime: bool = False
    isUnknownDevice: bool = False
    urgencyDetected: bool = False
    demoScenario: Scenario = "legitimate"
    audioBase64: str | None = None
    audioFilename: str | None = None


class WalletDecisionRequest(BaseModel):
    decision: Decision
    walletAddress: str = Field(min_length=4)
    signature: str = Field(min_length=4)


class BlockchainRecordRequest(BaseModel):
    blockchainTxHash: str = Field(min_length=4)
