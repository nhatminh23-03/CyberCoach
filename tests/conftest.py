from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.history import history_store
from backend.app.services.rate_limit import rate_limiter
from backend.app.services.voice_guard import voice_session_store
from tests.helpers.fixtures import load_fixture_json, load_snapshot_json


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def reset_runtime_state(monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest):
    history_store.set_enabled(False)
    history_store.reset()
    rate_limiter.reset()
    voice_session_store._sessions.clear()

    if request.node.get_closest_marker("live_model"):
        yield
        return

    for key in [
        "ANTHROPIC_API_KEY",
        "OPENROUTER_API_KEY",
        "LLM_PROVIDER",
        "ANTHROPIC_MODEL",
        "OPENROUTER_MODEL",
        "SECOND_MODEL",
        "OPENROUTER_SITE_URL",
        "OPENROUTER_APP_NAME",
        "VOICE_MEDIA_MODEL",
    ]:
        monkeypatch.delenv(key, raising=False)

    yield

    history_store.set_enabled(False)
    history_store.reset()
    rate_limiter.reset()
    voice_session_store._sessions.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def message_fixtures():
    return load_fixture_json("text", "messages.json")


@pytest.fixture(scope="session")
def url_fixtures():
    return load_fixture_json("urls", "urls.json")


@pytest.fixture(scope="session")
def voice_transcript_fixtures():
    return load_fixture_json("voice", "transcripts.json")


@pytest.fixture(scope="session")
def golden_snapshots():
    return load_snapshot_json("heuristic_golden.json")
