from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from services.sarvam import SarvamError, SarvamService

router = APIRouter(prefix="/api/voice", tags=["voice"])
_sarvam = SarvamService()


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class TranscribeResponse(BaseModel):
    transcript: str


class SynthesizeResponse(BaseModel):
    audio_base64: str
    content_type: str


class VoiceStatusResponse(BaseModel):
    enabled: bool


@router.get("/status", response_model=VoiceStatusResponse)
async def voice_status() -> VoiceStatusResponse:
    return VoiceStatusResponse(enabled=_sarvam.enabled)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
) -> TranscribeResponse:
    if not _sarvam.enabled:
        raise HTTPException(
            status_code=503,
            detail="Voice input is not configured. Set SARVAM_API_KEY in .env",
        )

    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(audio) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 10 MB)")

    content_type = file.content_type or "audio/webm"
    filename = file.filename or "recording.webm"

    try:
        transcript = await _sarvam.transcribe(
            audio,
            filename=filename,
            content_type=content_type,
        )
    except SarvamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TranscribeResponse(transcript=transcript)


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(body: SynthesizeRequest) -> SynthesizeResponse:
    if not _sarvam.enabled:
        raise HTTPException(
            status_code=503,
            detail="Voice output is not configured. Set SARVAM_API_KEY in .env",
        )

    try:
        audio_base64, content_type = await _sarvam.synthesize(body.text)
    except SarvamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SynthesizeResponse(
        audio_base64=audio_base64,
        content_type=content_type,
    )
