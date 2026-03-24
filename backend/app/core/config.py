from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from .secrets import get_secret


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_APP_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_APP_DIR / "data"


@dataclass(frozen=True)
class Settings:
    """Runtime configuration for the FastAPI backend."""

    app_name: str
    app_version: str
    api_prefix: str
    data_dir: Path
    default_anthropic_model: str
    default_openrouter_model: str
    default_second_model: str
    openrouter_messages_url: str
    openrouter_chat_url: str
    history_limit: int
    cors_allowed_origins: list[str]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached backend settings."""
    return Settings(
        app_name=get_secret("APP_NAME", "CyberCoach Backend"),
        app_version=get_secret("APP_VERSION", "0.1.0"),
        api_prefix=get_secret("API_PREFIX", "/api"),
        data_dir=DATA_DIR,
        default_anthropic_model=get_secret("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        default_openrouter_model=get_secret("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.6"),
        default_second_model=get_secret("SECOND_MODEL", "openai/gpt-5.3-chat"),
        openrouter_messages_url=get_secret("OPENROUTER_MESSAGES_URL", "https://openrouter.ai/api/v1/messages"),
        openrouter_chat_url=get_secret("OPENROUTER_CHAT_URL", "https://openrouter.ai/api/v1/chat/completions"),
        history_limit=int(get_secret("HISTORY_LIMIT", "200")),
        cors_allowed_origins=[
            origin.strip()
            for origin in get_secret(
                "CORS_ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ],
    )
