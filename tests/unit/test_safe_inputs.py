from __future__ import annotations

from backend.app.services.analyzer import analyze_message, analyze_url, analyze_voice_recording
from tests.helpers.asset_factory import wav_tone_bytes


def test_safe_message_stays_out_of_high_risk(message_fixtures):
    result = analyze_message(message_fixtures["safe_personal_text"]["text"], language="en", privacy_mode=True)

    assert result.risk_label in {"Safe", "Suspicious"}
    assert result.risk_label != "High Risk"


def test_safe_url_stays_out_of_high_risk(url_fixtures):
    result = analyze_url(url_fixtures["safe_company"]["url"], language="en", privacy_mode=True)

    assert result.risk_label in {"Safe", "Suspicious"}
    assert result.risk_label != "High Risk"


def test_safe_voice_transcript_does_not_escalate_like_a_scam(voice_transcript_fixtures):
    result = analyze_voice_recording(
        wav_tone_bytes(),
        filename="safe-call.wav",
        media_type="audio/wav",
        language="en",
        privacy_mode=True,
        transcript_override=voice_transcript_fixtures["safe_support"]["transcript"],
    )

    assert result.risk_label in {"Safe", "Suspicious"}
    assert "High Risk" != result.risk_label
