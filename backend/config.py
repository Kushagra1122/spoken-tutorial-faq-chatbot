from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str
    sarvam_api_key: str = ""
    sarvam_stt_model: str = "saaras:v3"
    sarvam_stt_language: str = "en-IN"
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_language: str = "en-IN"
    sarvam_tts_speaker: str = "shubh"
    sarvam_tts_codec: str = "mp3"
    sarvam_tts_pace: float = 0.85
    sarvam_tts_temperature: float = 0.4
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"
    similarity_high: float = 0.82
    similarity_low: float = 0.65
    similarity_min_absolute: float = 0.50
    similarity_margin: float = 0.18
    keyword_weight: float = 0.35
    max_history_messages: int = 20
    retrieval_top_k: int = 5
    faqs_path: Path = ROOT_DIR / "data" / "faqs.json"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://127.0.0.1:8000/api/auth/google/callback"
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    allowed_email_domain: str = "@edupyramids.org"
    frontend_url: str = "http://127.0.0.1:5173"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]


settings = Settings()
