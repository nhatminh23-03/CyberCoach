from __future__ import annotations

import pytest

from backend.app.services.analyzer import analyze_document, analyze_message, analyze_url, analyze_voice_recording
from backend.app.services.llm import resolve_llm_config
from tests.helpers.asset_factory import docx_bytes, wav_tone_bytes


def _require_live_provider():
    config = resolve_llm_config()
    if not config.api_key:
        pytest.skip("No Anthropic/OpenRouter key is configured for live-model tests.")
    return config


def _require_live_result(result) -> None:
    if not result.provider_used and (result.metadata or {}).get("decision_source") == "heuristic_fallback":
        pytest.skip("A provider key is configured, but live model analysis was not reachable from this environment.")


@pytest.mark.live_model
def test_live_model_message_analysis_has_reasonable_shape():
    _require_live_provider()
    result = analyze_message(
        "PayPal alert: verify your account right now at https://paypal-security-check-login.com/review",
        language="en",
        privacy_mode=True,
    )
    _require_live_result(result)

    assert result.risk_label in {"Suspicious", "High Risk"}
    assert result.summary
    assert result.recommended_actions
    assert any("click" in item.lower() or "verify" in item.lower() for item in result.recommended_actions)


@pytest.mark.live_model
def test_live_model_url_analysis_mentions_risk_for_obvious_phish():
    _require_live_provider()
    result = analyze_url("https://microsoft-security-check-login.co/review", language="en", privacy_mode=True)
    _require_live_result(result)

    assert result.risk_label in {"Suspicious", "High Risk"}
    assert result.top_reasons
    assert result.summary


@pytest.mark.live_model
def test_live_model_document_analysis_keeps_document_context():
    _require_live_provider()
    payload = docx_bytes(
        paragraphs=["Review the secure billing document today."],
        links=[("Open Secure File", "https://secure-sharepoint-review-login.co/open")],
    )
    result = analyze_document(
        payload,
        filename="billing-review.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        language="en",
        privacy_mode=True,
    )
    _require_live_result(result)

    assert result.risk_label in {"Suspicious", "High Risk"}
    assert "document" in result.summary.lower() or "file" in result.summary.lower()


@pytest.mark.live_model
def test_live_model_voice_upload_analysis_preserves_call_guidance():
    _require_live_provider()
    result = analyze_voice_recording(
        wav_tone_bytes(),
        filename="credit-card-call.wav",
        media_type="audio/wav",
        language="en",
        privacy_mode=True,
        transcript_override=(
            "This is the fraud department for your credit card account. Stay on the line and read me the one-time code."
        ),
    )
    _require_live_result(result)

    assert result.risk_label in {"Suspicious", "High Risk"}
    assert any("trusted number" in item.lower() or "do not" in item.lower() for item in result.recommended_actions)
