from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.core.config import get_settings
from backend.app.api.routes import report as report_routes
from backend.app.api.routes import scan as scan_routes
from backend.app.main import app
from backend.app.services.history import history_store
from backend.app.services.rate_limit import rate_limiter
from backend.app.services import url_intel
from tests.helpers.asset_factory import docx_bytes, png_with_text, wav_tone_bytes

settings = get_settings()


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


def test_history_endpoint_is_disabled_by_default(client):
    client.post("/api/scan/message", json={"text": "hello", "language": "en", "privacy_mode": True})
    client.post("/api/scan/url", json={"url": "https://github.com", "language": "en", "privacy_mode": True})

    response = client.get("/api/scan/history")

    assert response.status_code == 404
    assert "disabled" in response.json()["detail"].lower()
    assert history_store.count() == 0


def test_completed_scans_do_not_expose_history_metadata_when_history_is_disabled(client):
    response = client.post(
        "/api/scan/message",
        json={"text": "Please review this account alert now.", "language": "en", "privacy_mode": True},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "history_id" not in payload["metadata"]
    assert "history_count" not in payload["metadata"]
    assert history_store.count() == 0


def test_second_client_cannot_read_another_clients_completed_scans_when_history_is_disabled(client):
    client.post(
        "/api/scan/message",
        json={"text": "Review your statement at https://safe-bank.example", "language": "en", "privacy_mode": True},
    )

    with TestClient(app) as second_client:
        response = second_client.get("/api/scan/history")

    assert response.status_code == 404
    assert "disabled" in response.json()["detail"].lower()
    assert history_store.count() == 0


def test_privacy_mode_keeps_history_entries_redacted_when_history_is_explicitly_enabled(client):
    history_store.set_enabled(True)

    response = client.post(
        "/api/scan/message",
        json={
            "text": "Jane Doe can be reached at jane@example.com or 415-555-0112.",
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 200

    history = client.get("/api/scan/history")

    assert history.status_code == 200
    payload = history.json()["items"][0]
    assert payload["result"]["metadata"]["privacy_mode"] is True
    assert "jane@example.com" not in payload["snippet"]
    assert "415-555-0112" not in payload["snippet"]
    assert "jane@example.com" not in payload["result"]["original_input"]
    assert "415-555-0112" not in payload["result"]["original_input"]


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


def test_screenshot_scan_endpoint_returns_reasonable_payload(client):
    image_bytes = png_with_text(["Package delivery issue", "Review now", "https://ups-redelivery-help.top/track"])

    response = client.post(
        "/api/scan/screenshot",
        files={"image": ("delivery.png", image_bytes, "image/png")},
        data={
            "language": "en",
            "privacy_mode": "true",
            "ocr_override_text": "UPS delivery issue. Review now at https://ups-redelivery-help.top/track",
            "qr_payloads": '["https://ups-redelivery-help.top/track"]',
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert_scan_shape(payload, "screenshot")
    assert payload["metadata"]["ocr"]["ocr_override_used"] is True
    assert payload["metadata"]["ocr"]["qr_payloads"] == ["https://ups-redelivery-help.top/track"]
    assert payload["top_reasons"]


def test_message_scan_rejects_oversized_text(client):
    response = client.post(
        "/api/scan/message",
        json={
            "text": "x" * (settings.max_message_length + 1),
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 413
    assert "at most" in response.json()["detail"].lower()


def test_url_scan_rejects_oversized_url(client):
    response = client.post(
        "/api/scan/url",
        json={
            "url": f"https://example.com/{'a' * settings.max_url_length}",
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 413
    assert "at most" in response.json()["detail"].lower()


def test_voice_update_rejects_oversized_transcript(client):
    start = client.post("/api/scan/voice/start", json={"language": "en", "privacy_mode": True})
    session = start.json()

    response = client.post(
        "/api/scan/voice/update",
        json={
            "session_id": session["session_id"],
            "transcript_text": "x" * (settings.max_transcript_length + 1),
            "transcript_segments": [],
            "voice_signals": [],
            "elapsed_seconds": 1,
            "include_ai": False,
        },
    )

    assert response.status_code == 413
    assert "at most" in response.json()["detail"].lower()


def test_screenshot_scan_rejects_oversized_upload(client):
    response = client.post(
        "/api/scan/screenshot",
        files={"image": ("oversized.png", b"x" * (settings.max_screenshot_upload_bytes + 1), "image/png")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 413
    assert "maximum allowed size" in response.json()["detail"].lower()


def test_document_scan_rejects_oversized_upload(client):
    response = client.post(
        "/api/scan/document",
        files={
            "file": (
                "oversized.pdf",
                b"x" * (settings.max_document_upload_bytes + 1),
                "application/pdf",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 413
    assert "maximum allowed size" in response.json()["detail"].lower()


def test_voice_upload_rejects_oversized_recording(client):
    response = client.post(
        "/api/scan/voice/upload",
        files={
            "file": (
                "oversized.wav",
                b"x" * (settings.max_voice_upload_bytes + 1),
                "audio/wav",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 413
    assert "maximum allowed size" in response.json()["detail"].lower()


def test_report_generation_rejects_oversized_result_payload(client):
    large_result = client.post(
        "/api/scan/message",
        json={
            "text": "Account notice " + ("a" * 500),
            "language": "en",
            "privacy_mode": True,
        },
    ).json()
    large_result["original_input"] = "x" * (settings.max_report_payload_bytes + 1)

    response = client.post("/api/report", json={"result": large_result, "format": "txt"})

    assert response.status_code == 413
    assert "report source payload is too large" in response.json()["detail"].lower()


def test_url_scan_blocks_private_destinations_in_full_endpoint(client):
    response = client.post(
        "/api/scan/url",
        json={"url": "http://127.0.0.1/admin", "language": "en", "privacy_mode": True},
    )

    assert response.status_code == 200
    payload = response.json()
    inspection = payload["metadata"]["url_live_inspection"][0]
    assert inspection["inspection_attempted"] is False
    assert "local" in inspection["blocked_reason"].lower()


def test_url_scan_rejects_mixed_public_private_dns_answers_in_full_endpoint(client, monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        return [
            (url_intel.socket.AF_INET, url_intel.socket.SOCK_STREAM, url_intel.socket.IPPROTO_TCP, "", ("93.184.216.34", 443)),
            (url_intel.socket.AF_INET, url_intel.socket.SOCK_STREAM, url_intel.socket.IPPROTO_TCP, "", ("10.0.0.7", 443)),
        ]

    monkeypatch.setattr(url_intel.socket, "getaddrinfo", fake_getaddrinfo)

    response = client.post(
        "/api/scan/url",
        json={"url": "https://mixed-dns.example/login", "language": "en", "privacy_mode": True},
    )

    assert response.status_code == 200
    payload = response.json()
    inspection = payload["metadata"]["url_live_inspection"][0]
    assert inspection["inspection_attempted"] is False
    assert "private" in inspection["blocked_reason"].lower()


def test_report_endpoint_escapes_markdown_sensitive_user_content(client):
    response = client.post(
        "/api/report",
        json={
            "format": "md",
                "result": {
                    "scan_type": "message",
                    "risk_label": "Suspicious",
                    "risk_score": 7,
                    "confidence": "Medium",
                    "likely_scam_pattern": "# Fake Heading",
                    "summary": "User wrote\n## injected heading\n[click me](https://evil.example)",
                    "top_reasons": ["- [ ] fake task item", "> quoted warning"],
                    "recommended_actions": ["Do not click [`now`](https://evil.example)"],
                    "signals": ["[Reset now](https://evil.example) ##"],
                    "original_input": "User wrote\n## injected heading\n[click me](https://evil.example)",
                    "redacted_input": None,
                    "provider_used": None,
                    "metadata": {
                    "language": "English",
                    "decision_source": "heuristic_fallback",
                    "heuristic_findings": [
                        {
                            "type": "credential_ask",
                            "severity": "high",
                            "detail": "[Reset now](https://evil.example) ##",
                        }
                    ],
                },
            },
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    report = response.text
    assert "\n## injected heading" not in report
    assert "\\#\\# injected heading" in report
    assert "\\[click me\\]\\(https://evil.example\\)" in report
    assert "- [ ] Do not click \\[\\`now\\`\\]\\(https://evil.example\\)" in report


def test_message_scan_internal_errors_are_sanitized(client, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("OpenRouter parser failed at /tmp/secrets with api_key=abc123")

    monkeypatch.setattr(scan_routes, "analyze_message", boom)

    response = client.post(
        "/api/scan/message",
        json={"text": "Please help", "language": "en", "privacy_mode": True},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Message scan failed. Please try again."
    assert response.headers.get("x-error-id")
    assert "api_key" not in response.text
    assert "/tmp/secrets" not in response.text


def test_report_generation_internal_errors_are_sanitized(client, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("markdown formatter crashed with /private/tmp/internal-state")

    monkeypatch.setattr(report_routes, "generate_text_report", boom)

    result = client.post(
        "/api/scan/message",
        json={"text": "Please review this message", "language": "en", "privacy_mode": True},
    ).json()
    response = client.post("/api/report", json={"result": result, "format": "txt"})

    assert response.status_code == 500
    assert response.json()["detail"] == "Report generation failed. Please try again."
    assert response.headers.get("x-error-id")
    assert "/private/tmp/internal-state" not in response.text


def test_voice_stream_internal_errors_are_sanitized(client, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("provider timeout from ws://internal-service with token=secret")

    monkeypatch.setattr(scan_routes, "analyze_voice_session_update", boom)

    with client.websocket_connect("/api/scan/voice/ws") as websocket:
        ready = websocket.receive_json()
        assert ready["type"] == "ready"

        websocket.send_json(
            {
                "type": "update",
                "request_id": "req-123",
                "session_id": "session-123",
                "transcript_text": "hello",
                "transcript_segments": [{"text": "hello", "timestamp": ""}],
                "voice_signals": [],
                "elapsed_seconds": 1,
                "include_ai": False,
            }
        )
        payload = websocket.receive_json()

    assert payload["type"] == "error"
    assert payload["request_id"] == "req-123"
    assert payload["detail"] == "Voice stream analysis failed. Please try again."
    assert payload["error_id"]
    assert "token=secret" not in str(payload)
    assert "internal-service" not in str(payload)


def test_url_destination_errors_are_sanitized():
    original_resolve_public_target = url_intel._resolve_public_target
    original_open_pinned_connection = url_intel._open_pinned_connection

    def boom(*args, **kwargs):
        raise RuntimeError("internal fetch crashed at /srv/app/provider")

    try:
        url_intel._resolve_public_target = lambda url: (
            url_intel.ResolvedPublicTarget(
                normalized_url=url,
                scheme="https",
                host="example.com",
                port=443,
                request_path="/login",
                connect_host="93.184.216.34",
                resolved_addresses=("93.184.216.34",),
            ),
            "",
        )
        url_intel._open_pinned_connection = boom
        payload = url_intel.inspect_url_destination("https://example.com/login")
    finally:
        url_intel._resolve_public_target = original_resolve_public_target
        url_intel._open_pinned_connection = original_open_pinned_connection

    assert payload["error"] == "Destination check could not be completed."
    assert "/srv/app/provider" not in str(payload)


def test_message_scan_rate_limits_repeat_requests(client):
    rate_limiter.override_rule("text_scan", limit=1, window_seconds=60)

    first = client.post(
        "/api/scan/message",
        json={"text": "Please review this alert.", "language": "en", "privacy_mode": True},
    )
    second = client.post(
        "/api/scan/message",
        json={"text": "Please review this alert.", "language": "en", "privacy_mode": True},
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Too many scan requests. Please wait and try again."
    assert second.headers.get("Retry-After")


def test_upload_endpoints_rate_limit_repeat_uploads(client):
    rate_limiter.override_rule("upload_scan", limit=1, window_seconds=60)

    first = client.post(
        "/api/scan/document",
        files={
            "file": (
                "payroll.docx",
                docx_bytes(paragraphs=["Payroll review"]),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )
    second = client.post(
        "/api/scan/document",
        files={
            "file": (
                "payroll.docx",
                docx_bytes(paragraphs=["Payroll review"]),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Too many upload requests. Please wait and try again."


def test_report_endpoint_rate_limits_repeat_requests(client):
    rate_limiter.override_rule("report", limit=1, window_seconds=60)
    result = client.post(
        "/api/scan/message",
        json={"text": "Please verify your account today.", "language": "en", "privacy_mode": True},
    ).json()

    first = client.post("/api/report", json={"result": result, "format": "txt"})
    second = client.post("/api/report", json={"result": result, "format": "txt"})

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Too many report requests. Please wait and try again."


def test_voice_stream_rate_limits_repeat_messages(client, voice_transcript_fixtures):
    rate_limiter.override_rule("voice_ws_message", limit=1, window_seconds=60)
    start = client.post("/api/scan/voice/start", json={"language": "en", "privacy_mode": True})
    session = start.json()
    transcript = voice_transcript_fixtures["bank_impersonation"]["transcript"]
    segments = [{"text": sentence.strip(), "timestamp": ""} for sentence in transcript.split(". ") if sentence.strip()]

    with client.websocket_connect("/api/scan/voice/ws") as websocket:
        ready = websocket.receive_json()
        assert ready["type"] == "ready"

        websocket.send_json(
            {
                "type": "update",
                "request_id": "req-1",
                "session_id": session["session_id"],
                "transcript_text": transcript,
                "transcript_segments": segments,
                "voice_signals": [],
                "elapsed_seconds": 10,
                "include_ai": False,
            }
        )
        first = websocket.receive_json()
        websocket.send_json(
            {
                "type": "update",
                "request_id": "req-2",
                "session_id": session["session_id"],
                "transcript_text": transcript,
                "transcript_segments": segments,
                "voice_signals": [],
                "elapsed_seconds": 12,
                "include_ai": False,
            }
        )
        second = websocket.receive_json()

    assert first["type"] == "analysis"
    assert second["type"] == "error"
    assert second["request_id"] == "req-2"
    assert second["detail"] == "Too many live stream updates. Please wait and try again."
    assert second["retry_after_seconds"] >= 1
