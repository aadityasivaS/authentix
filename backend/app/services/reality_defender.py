import base64
import importlib
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any, Protocol
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
    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.reality_defender_api_key
        self.poll_seconds = settings.reality_defender_poll_seconds

    async def analyze(self, scenario: str, audio_base64: str | None, filename: str | None) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("REALITY_DEFENDER_API_KEY is required in real mode")
        if not audio_base64 or not filename:
            raise ValueError("An audio file is required in real mode")
        try:
            media = base64.b64decode(audio_base64, validate=True)
        except ValueError as exc:
            raise ValueError("audioBase64 is not valid base64") from exc
        temporary_path: str | None = None
        try:
            sdk = importlib.import_module("realitydefender")
        except ModuleNotFoundError as exc:
            raise RuntimeError("The realitydefender package is not installed; install backend requirements") from exc
        client = sdk.RealityDefender(api_key=self.api_key)
        try:
            suffix = Path(filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
                temporary_file.write(media)
                temporary_path = temporary_file.name
            upload = await client.upload(file_path=temporary_path)
            request_id = upload["request_id"]
            result = await client.get_result(
                request_id,
                polling_interval=max(1, int(self.poll_seconds * 1000)),
            )
            score = result.get("score")
            if score is not None:
                score = score * 100
            return {
                "provider": "Reality Defender",
                "mode": "real",
                "requestId": request_id,
                "status": result["status"],
                "score": score,
                "evaluationIssue": None,
            }
        except Exception as exc:
            raise RuntimeError(f"Reality Defender SDK analysis failed: {exc}") from exc
        finally:
            if temporary_path:
                os.unlink(temporary_path)
            await client.cleanup()


def get_analyzer(settings: Settings) -> DeepfakeAnalyzer:
    if settings.reality_defender_mode.lower() == "mock":
        return MockRealityDefender()
    if settings.reality_defender_mode.lower() == "real":
        return RealityDefenderClient(settings)
    raise ValueError("REALITY_DEFENDER_MODE must be 'mock' or 'real'")
