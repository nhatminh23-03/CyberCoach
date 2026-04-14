from __future__ import annotations

from backend.app.services.history import history_store
from tests.helpers.asset_factory import docx_bytes, wav_tone_bytes


def assert_scan_shape(payload: dict, expected_type: str):
    assert payload["scan_type"] == expected_type
    assert payload["risk_label"] in {"Safe", "Suspicious", "High Risk"}
    assert isinstance(payload["summary"], str) and payload["summary"]
    assert isinstance(payload["recommended_actions"], list)
    assert isinstance(payload["top_reasons"], list)
    assert "metadata" in payload


def test_message_scan_endpoint_returns_reasonable_payload(client):
    response = client.post(
        "/api/scan/message",
        json={
            "text": "Call me at 415-555-0100 and log in at https://paypal-security-check-login.com/review today.",
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert_scan_shape(payload, "message")
    assert payload["redacted_input"] is not None
    assert payload["metadata"]["redaction_count"] >= 1


def test_url_scan_and_precheck_endpoints_work_together(client, url_fixtures):
    risky_url = url_fixtures["lookalike_domain"]["url"]

    precheck = client.get("/api/scan/url-precheck", params={"url": risky_url})
    assert precheck.status_code == 200
    assert precheck.json()["domain"]

    response = client.post(
        "/api/scan/url",
        json={"url": risky_url, "language": "en", "privacy_mode": True},
    )

    assert response.status_code == 200
    payload = response.json()
    assert_scan_shape(payload, "url")
    assert payload["metadata"]["url_evidence"]
    assert payload["metadata"]["evidence_buckets"]


def test_history_endpoint_collects_completed_scans(client):
    client.post("/api/scan/message", json={"text": "hello", "language": "en", "privacy_mode": True})
    client.post("/api/scan/url", json={"url": "https://github.com", "language": "en", "privacy_mode": True})

    response = client.get("/api/scan/history")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == history_store.count() == 2
    assert items[0]["scan_type"] in {"message", "url"}


def test_report_endpoint_generates_downloadable_text_report(client):
    result = client.post(
        "/api/scan/message",
        json={"text": "Please verify your account at https://microsoft-secure-login.co", "language": "en", "privacy_mode": True},
    ).json()

    report = client.post("/api/report", json={"result": result, "format": "txt"})

    assert report.status_code == 200
    assert report.headers["content-type"].startswith("text/plain")
    assert "attachment; filename=" in report.headers["content-disposition"]
    assert "CyberCoach Safety Report" in report.text


def test_voice_live_session_start_update_and_finalize_flow(client, voice_transcript_fixtures):
    start = client.post("/api/scan/voice/start", json={"language": "en", "privacy_mode": True})
    assert start.status_code == 200
    session = start.json()

    transcript = voice_transcript_fixtures["bank_impersonation"]["transcript"]
    segments = [{"text": sentence.strip(), "timestamp": ""} for sentence in transcript.split(". ") if sentence.strip()]
    update = client.post(
        "/api/scan/voice/update",
        json={
            "session_id": session["session_id"],
            "transcript_text": transcript,
            "transcript_segments": segments,
            "voice_signals": [],
            "elapsed_seconds": 33,
            "include_ai": False,
        },
    )
    assert update.status_code == 200
    live_payload = update.json()
    assert_scan_shape(live_payload, "voice")
    assert live_payload["metadata"]["voice"]["analysis_state"] == "live"

    finalize = client.post(
        "/api/scan/voice/finalize",
        json={
            "session_id": session["session_id"],
            "transcript_text": transcript,
            "transcript_segments": segments,
            "voice_signals": [],
            "elapsed_seconds": 36,
            "include_ai": False,
        },
    )
    assert finalize.status_code == 200
    final_payload = finalize.json()
    assert_scan_shape(final_payload, "voice")
    assert final_payload["metadata"]["voice"]["analysis_state"] == "final"


def test_voice_upload_endpoint_accepts_transcript_override(client, voice_transcript_fixtures):
    transcript = voice_transcript_fixtures["family_emergency"]["transcript"]
    audio_bytes = wav_tone_bytes()

    response = client.post(
        "/api/scan/voice/upload",
        files={"file": ("family-emergency.wav", audio_bytes, "audio/wav")},
        data={"language": "en", "privacy_mode": "true", "transcript_override_text": transcript},
    )

    assert response.status_code == 200
    payload = response.json()
    assert_scan_shape(payload, "voice")
    assert payload["metadata"]["voice"]["transcription_source"] == "manual_override"


def test_document_scan_endpoint_returns_document_metadata(client):
    payload = docx_bytes(
        paragraphs=["Payroll update required today."],
        links=[("Review payroll file", "https://payroll-verification-login.co/open")],
    )

    response = client.post(
        "/api/scan/document",
        files={
            "file": (
                "payroll.docx",
                payload,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 200
    body = response.json()
    assert_scan_shape(body, "document")
    assert body["metadata"]["document"]["link_pairs"]
