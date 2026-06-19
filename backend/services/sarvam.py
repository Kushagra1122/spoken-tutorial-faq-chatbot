import httpx

from config import settings
from services.speech_text import prepare_text_for_speech

SARVAM_BASE = "https://api.sarvam.ai"


def normalize_audio_content_type(content_type: str) -> str:
    """Sarvam accepts 'audio/webm' but rejects 'audio/webm;codecs=opus'."""
    base = content_type.split(";", 1)[0].strip().lower()
    return base or "audio/webm"


class SarvamError(Exception):
    pass


class SarvamService:
    def __init__(self) -> None:
        self._api_key = settings.sarvam_api_key

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        if not self._api_key:
            raise SarvamError("Sarvam AI API key is not configured")
        return {"api-subscription-key": self._api_key}

    async def transcribe(
        self,
        audio: bytes,
        *,
        filename: str = "recording.webm",
        content_type: str = "audio/webm",
    ) -> str:
        content_type = normalize_audio_content_type(content_type)
        data: dict[str, str] = {
            "model": settings.sarvam_stt_model,
            "mode": "transcribe",
            "language_code": settings.sarvam_stt_language,
        }
        if content_type in ("audio/webm", "video/webm", "audio/ogg"):
            data["input_audio_codec"] = "webm"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{SARVAM_BASE}/speech-to-text",
                headers=self._headers(),
                files={"file": (filename, audio, content_type)},
                data=data,
            )

        if response.status_code != 200:
            detail = _extract_error(response)
            raise SarvamError(detail or f"Speech-to-text failed ({response.status_code})")

        payload = response.json()
        transcript = (payload.get("transcript") or "").strip()
        if not transcript:
            raise SarvamError("No speech detected. Please try again.")
        return transcript

    async def synthesize(self, text: str) -> tuple[str, str]:
        speech_text = prepare_text_for_speech(text)
        if not speech_text:
            raise SarvamError("Nothing to speak")

        body = {
            "text": speech_text,
            "target_language_code": settings.sarvam_tts_language,
            "model": settings.sarvam_tts_model,
            "speaker": settings.sarvam_tts_speaker,
            "output_audio_codec": settings.sarvam_tts_codec,
            "pace": settings.sarvam_tts_pace,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{SARVAM_BASE}/text-to-speech",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=body,
            )

        if response.status_code != 200:
            detail = _extract_error(response)
            raise SarvamError(detail or f"Text-to-speech failed ({response.status_code})")

        payload = response.json()
        audios = payload.get("audios") or []
        if not audios:
            raise SarvamError("No audio returned from Sarvam AI")

        codec = settings.sarvam_tts_codec
        mime = "audio/mpeg" if codec == "mp3" else "audio/wav"
        return audios[0], mime


def _extract_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
        return payload.get("error", {}).get("message", "")
    except Exception:
        return response.text[:200]
