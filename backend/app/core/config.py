from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import ipaddress
from pathlib import Path
from urllib.parse import urlparse

from .secrets import get_secret


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_APP_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_APP_DIR / "data"


@dataclass(frozen=True)
class Settings:
    """Runtime configuration for the FastAPI backend."""

    app_name: str
    app_version: str
    environment: str
    is_production: bool
    api_prefix: str
    data_dir: Path
    default_anthropic_model: str
    default_openrouter_model: str
    default_second_model: str
    default_live_voice_model: str
    default_voice_media_model: str
    openrouter_messages_url: str
    openrouter_chat_url: str
    history_limit: int
    public_scan_history_enabled: bool
    max_message_length: int
    max_url_length: int
    max_transcript_length: int
    max_screenshot_upload_bytes: int
    max_document_upload_bytes: int
    max_voice_upload_bytes: int
    max_report_payload_bytes: int
    trust_proxy_headers: bool
    rate_limit_window_seconds: int
    rate_limit_url_precheck_requests: int
    rate_limit_text_scan_requests: int
    rate_limit_upload_requests: int
    rate_limit_report_requests: int
    rate_limit_voice_start_requests: int
    rate_limit_voice_update_requests: int
    rate_limit_voice_finalize_requests: int
    rate_limit_voice_stream_connect_requests: int
    rate_limit_voice_stream_message_requests: int
    cors_allowed_origins: list[str]


class ConfigurationError(RuntimeError):
    """Raised when the runtime environment is unsafe or incomplete."""


def _secret_bool(name: str, default: str = "false") -> bool:
    value = get_secret(name, default).strip().lower()
    return value in {"1", "true", "yes", "on"}


def _resolve_environment() -> str:
    for key in ("APP_ENV", "ENVIRONMENT", "FASTAPI_ENV", "NODE_ENV"):
        value = get_secret(key, "").strip().lower()
        if value:
            return value
    return "development"


def _is_production_environment(environment: str) -> bool:
    return environment in {"production", "prod"}


def _is_local_host(host: str | None) -> bool:
    if not host:
        return True

    normalized = host.strip().lower().strip("[]")
    if normalized in {"localhost", "127.0.0.1", "::1", "0.0.0.0"}:
        return True

    try:
        return not ipaddress.ip_address(normalized).is_global
    except ValueError:
        return normalized.endswith(".local")


def _validate_origin(origin: str) -> str | None:
    cleaned = origin.strip()
    if not cleaned:
        return "Encountered an empty CORS origin."
    if cleaned == "*":
        return "Wildcard CORS origins are not allowed in production."

    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return f"CORS origin '{cleaned}' must be an absolute http(s) URL."
    if parsed.username or parsed.password:
        return f"CORS origin '{cleaned}' must not include credentials."
    if _is_local_host(parsed.hostname):
        return f"CORS origin '{cleaned}' points to a local or non-public host."

    return None


def validate_settings(settings: Settings) -> None:
    issues: list[str] = []
    configured_provider = get_secret("LLM_PROVIDER", "").strip().lower()

    if configured_provider and configured_provider not in {"anthropic", "openrouter"}:
        issues.append("LLM_PROVIDER must be either 'anthropic' or 'openrouter' when set.")

    if settings.is_production:
        if not settings.cors_allowed_origins:
            issues.append("CORS_ALLOWED_ORIGINS must include at least one public origin in production.")

        for origin in settings.cors_allowed_origins:
            origin_issue = _validate_origin(origin)
            if origin_issue:
                issues.append(origin_issue)

        if configured_provider == "anthropic" and not get_secret("ANTHROPIC_API_KEY", "").strip():
            issues.append("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic in production.")
        if configured_provider == "openrouter" and not get_secret("OPENROUTER_API_KEY", "").strip():
            issues.append("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter in production.")

    if issues:
        joined = "\n- ".join(issues)
        raise ConfigurationError(f"CyberCoach configuration is unsafe or incomplete:\n- {joined}")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached backend settings."""
    environment = _resolve_environment()
    settings = Settings(
        app_name=get_secret("APP_NAME", "CyberCoach Backend"),
        app_version=get_secret("APP_VERSION", "0.1.0"),
        environment=environment,
        is_production=_is_production_environment(environment),
        api_prefix=get_secret("API_PREFIX", "/api"),
        data_dir=DATA_DIR,
        default_anthropic_model=get_secret("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        default_openrouter_model=get_secret("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.6"),
        default_second_model=get_secret("SECOND_MODEL", "openai/gpt-5.3-chat"),
        default_live_voice_model=get_secret("LIVE_VOICE_MODEL", "google/gemini-2.5-flash"),
        default_voice_media_model=get_secret("VOICE_MEDIA_MODEL", "google/gemini-2.5-flash"),
        openrouter_messages_url=get_secret("OPENROUTER_MESSAGES_URL", "https://openrouter.ai/api/v1/messages"),
        openrouter_chat_url=get_secret("OPENROUTER_CHAT_URL", "https://openrouter.ai/api/v1/chat/completions"),
        history_limit=int(get_secret("HISTORY_LIMIT", "200")),
        public_scan_history_enabled=_secret_bool("ENABLE_PUBLIC_SCAN_HISTORY", "false"),
        max_message_length=int(get_secret("MAX_MESSAGE_LENGTH", "10000")),
        max_url_length=int(get_secret("MAX_URL_LENGTH", "2048")),
        max_transcript_length=int(get_secret("MAX_TRANSCRIPT_LENGTH", "32000")),
        max_screenshot_upload_bytes=int(get_secret("MAX_SCREENSHOT_UPLOAD_BYTES", str(8 * 1024 * 1024))),
        max_document_upload_bytes=int(get_secret("MAX_DOCUMENT_UPLOAD_BYTES", str(12 * 1024 * 1024))),
        max_voice_upload_bytes=int(get_secret("MAX_VOICE_UPLOAD_BYTES", str(100 * 1024 * 1024))),
        max_report_payload_bytes=int(get_secret("MAX_REPORT_PAYLOAD_BYTES", str(512 * 1024))),
        trust_proxy_headers=_secret_bool("TRUST_PROXY_HEADERS", "false"),
        rate_limit_window_seconds=int(get_secret("RATE_LIMIT_WINDOW_SECONDS", "60")),
        rate_limit_url_precheck_requests=int(get_secret("RATE_LIMIT_URL_PRECHECK_REQUESTS", "60")),
        rate_limit_text_scan_requests=int(get_secret("RATE_LIMIT_TEXT_SCAN_REQUESTS", "24")),
        rate_limit_upload_requests=int(get_secret("RATE_LIMIT_UPLOAD_REQUESTS", "8")),
        rate_limit_report_requests=int(get_secret("RATE_LIMIT_REPORT_REQUESTS", "20")),
        rate_limit_voice_start_requests=int(get_secret("RATE_LIMIT_VOICE_START_REQUESTS", "12")),
        rate_limit_voice_update_requests=int(get_secret("RATE_LIMIT_VOICE_UPDATE_REQUESTS", "120")),
        rate_limit_voice_finalize_requests=int(get_secret("RATE_LIMIT_VOICE_FINALIZE_REQUESTS", "20")),
        rate_limit_voice_stream_connect_requests=int(get_secret("RATE_LIMIT_VOICE_STREAM_CONNECT_REQUESTS", "20")),
        rate_limit_voice_stream_message_requests=int(get_secret("RATE_LIMIT_VOICE_STREAM_MESSAGE_REQUESTS", "180")),
        cors_allowed_origins=[
            origin.strip()
            for origin in get_secret(
                "CORS_ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ],
    )
    validate_settings(settings)
    return settings
