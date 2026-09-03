import asyncio
import base64
import uuid
from typing import Any, Protocol
import httpx
from app.core.config import Settings


class DeepfakeAnalyzer(Protocol):
    async def analyze(self, scenario: str, audio_base64: str | None, filename: str | None) -> dict[str, Any]: ...


class MockRealityDefender:
    RESULTS = {
        "legitimate": ("AUTHENTIC", 8),
        "suspicious": ("SUSPICIOUS", 48),
        "deepfake_attack": ("FAKE", 78),
    }

    async def analyze(self, scenario: str, audio_base64: str | None, filename: str | None) -> dict[str, Any]:
        status, score = self.RESULTS[scenario]
        return {"provider": "Reality Defender", "mode": "mock", "requestId": f"mock-{uuid.uuid4()}", "status": status, "score": score, "evaluationIssue": None}


class RealityDefenderClient:
    base_url = "https://api.prd.realitydefender.xyz/api"

    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.reality_defender_api_key
        self.poll_seconds = settings.reality_defender_poll_seconds

    async def analyze(self, scenario: str, audio_base64: str | None, filename: str | None) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("REALITY_DEFENDER_API_KEY is required in real mode")
        if not audio_base64 or not filename:
            raise ValueError("An audio file is required in real mode")
        try:
            media = base64.b64decode(audio_base64)
        except ValueError as exc:
            raise ValueError("audioBase64 is not valid base64") from exc
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.base_url}/files/aws-presigned", headers=headers, json={"fileName": filename})
            response.raise_for_status()
            upload = response.json()
            # Reality Defender responses may wrap upload values in `response`.
            upload_details = upload.get("response", upload)
            signed_url = upload_details.get("url") or upload_details.get("signedUrl")
            request_id = upload_details.get("requestId") or upload_details.get("request_id")
            if not signed_url or not request_id:
                raise RuntimeError("Reality Defender presigned upload response was incomplete")
            put = await client.put(signed_url, content=media, headers={})
            put.raise_for_status()
            for _ in range(15):
                result = await client.get(f"{self.base_url}/media/users/{request_id}", headers=headers)
                result.raise_for_status()
                payload = result.json()
                summary = payload.get("resultsSummary") or {}
                status = summary.get("status")
                if status in {"AUTHENTIC", "FAKE", "SUSPICIOUS", "NOT_APPLICABLE", "UNABLE_TO_EVALUATE"}:
                    metadata = summary.get("metadata") or {}
                    return {"provider": "Reality Defender", "mode": "real", "requestId": request_id, "status": status, "score": metadata.get("finalScore"), "evaluationIssue": metadata.get("reasons") or summary.get("error")}
                await asyncio.sleep(self.poll_seconds)
        raise RuntimeError("Reality Defender analysis timed out")


def get_analyzer(settings: Settings) -> DeepfakeAnalyzer:
    if settings.reality_defender_mode.lower() == "mock":
        return MockRealityDefender()
    if settings.reality_defender_mode.lower() == "real":
        return RealityDefenderClient(settings)
    raise ValueError("REALITY_DEFENDER_MODE must be 'mock' or 'real'")
