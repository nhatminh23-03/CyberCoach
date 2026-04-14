from __future__ import annotations

import pytest

from backend.app.core import config as config_module


def _clear_backend_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in [
        "APP_ENV",
        "ENVIRONMENT",
        "FASTAPI_ENV",
        "NODE_ENV",
        "CORS_ALLOWED_ORIGINS",
        "LLM_PROVIDER",
        "ANTHROPIC_API_KEY",
        "OPENROUTER_API_KEY",
    ]:
        monkeypatch.delenv(key, raising=False)


def _get_settings(monkeypatch: pytest.MonkeyPatch, **env: str):
    _clear_backend_env(monkeypatch)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    config_module.get_settings.cache_clear()
    try:
        return config_module.get_settings()
    finally:
        config_module.get_settings.cache_clear()


def test_production_rejects_localhost_cors_defaults(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(config_module.ConfigurationError) as exc:
        _get_settings(monkeypatch, APP_ENV="production")

    message = str(exc.value).lower()
    assert "cors origin" in message
    assert "localhost" in message


def test_production_rejects_localhost_api_provider_without_required_key(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(config_module.ConfigurationError) as exc:
        _get_settings(
            monkeypatch,
            APP_ENV="production",
            CORS_ALLOWED_ORIGINS="https://app.cybercoach.example",
            LLM_PROVIDER="openrouter",
        )

    message = str(exc.value).lower()
    assert "openrouter_api_key" in message


def test_production_accepts_public_cors_for_heuristics_only_mode(monkeypatch: pytest.MonkeyPatch):
    settings = _get_settings(
        monkeypatch,
        APP_ENV="production",
        CORS_ALLOWED_ORIGINS="https://app.cybercoach.example,https://admin.cybercoach.example",
    )

    assert settings.is_production is True
    assert settings.cors_allowed_origins == [
        "https://app.cybercoach.example",
        "https://admin.cybercoach.example",
    ]


def test_invalid_provider_is_rejected_even_outside_production(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(config_module.ConfigurationError) as exc:
        _get_settings(
            monkeypatch,
            APP_ENV="development",
            LLM_PROVIDER="something-else",
        )

    assert "llm_provider" in str(exc.value).lower()
