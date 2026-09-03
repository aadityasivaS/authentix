from typing import Any


def calculate_risk(transaction: dict[str, Any], analysis: dict[str, Any]) -> dict[str, Any]:
    score = int(analysis["score"] * 0.50)
    reasons = [f"Deepfake signal: {analysis['status']} ({analysis['score']}%)"]
    if transaction["amount"] >= 500000:
        score += 15
        reasons.append("High transaction amount")
    if transaction["isNewBeneficiary"]:
        score += 12
        reasons.append("New beneficiary")
    if transaction["isUnusualTime"]:
        score += 8
        reasons.append("Unusual transaction time")
    if transaction["isUnknownDevice"]:
        score += 10
        reasons.append("Unknown device or session")
    if transaction["urgencyDetected"]:
        score += 8
        reasons.append("Urgency language detected")
    score = min(score, 100)
    level = "HIGH" if score >= 60 else "MEDIUM" if score >= 30 else "LOW"
    return {"score": score, "level": level, "reasons": reasons, "requiresVerification": level == "HIGH"}
