from __future__ import annotations

from tests.helpers.asset_factory import (
    docx_bytes,
    encrypted_pdf,
    image_only_pdf,
    png_with_text,
    unsupported_binary,
    wav_tone_bytes,
    xlsm_bytes,
)


def test_screenshot_scan_supports_manual_ocr_override_and_qr_payloads(client):
    image_bytes = png_with_text(["Delivery issue", "Review your package now"])

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
    assert payload["scan_type"] == "screenshot"
    assert payload["metadata"]["ocr"]["ocr_override_used"] is True
    assert payload["metadata"]["ocr"]["qr_payloads"] == ["https://ups-redelivery-help.top/track"]


def test_screenshot_scan_returns_clear_error_for_empty_image(client):
    response = client.post(
        "/api/scan/screenshot",
        files={"image": ("empty.png", b"", "image/png")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_document_scan_rejects_unsupported_extensions(client):
    filename, payload = unsupported_binary("malware.exe")

    response = client.post(
        "/api/scan/document",
        files={"file": (filename, payload, "application/octet-stream")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 400
    assert "supports" in response.json()["detail"].lower()


def test_document_scan_marks_image_only_pdf_as_partial_review(client):
    response = client.post(
        "/api/scan/document",
        files={"file": ("scan-only.pdf", image_only_pdf(["Review the shared document today"]), "application/pdf")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["document"]["image_based"] is True
    assert payload["metadata"]["document"]["partial_analysis"] is True


def test_document_scan_marks_encrypted_pdf_as_protected(client):
    response = client.post(
        "/api/scan/document",
        files={"file": ("protected.pdf", encrypted_pdf(["Protected invoice"]), "application/pdf")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["document"]["protected"] is True
    assert payload["risk_label"] in {"Suspicious", "High Risk"}


def test_document_scan_accepts_macro_enabled_xlsm(client):
    response = client.post(
        "/api/scan/document",
        files={"file": ("invoice.xlsm", xlsm_bytes(), "application/vnd.ms-excel.sheet.macroEnabled.12")},
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["document"]["macro_enabled"] is True


def test_voice_upload_rejects_unsupported_media_types(client):
    response = client.post(
        "/api/scan/voice/upload",
        files={"file": ("call.txt", b"not audio", "text/plain")},
        data={"language": "en", "privacy_mode": "true", "transcript_override_text": ""},
    )

    assert response.status_code == 400
    assert "supports common audio" in response.json()["detail"].lower()


def test_message_and_url_endpoints_preserve_language_and_privacy_mode(client, message_fixtures, url_fixtures):
    message_response = client.post(
        "/api/scan/message",
        json={"text": message_fixtures["package_delivery_scam"]["text"], "language": "es", "privacy_mode": False},
    )
    url_response = client.post(
        "/api/scan/url",
        json={"url": url_fixtures["safe_company"]["url"], "language": "fr", "privacy_mode": True},
    )

    assert message_response.status_code == 200
    assert message_response.json()["metadata"]["language"] == "Spanish"
    assert message_response.json()["redacted_input"] is None

    assert url_response.status_code == 200
    assert url_response.json()["metadata"]["language"] == "French"


def test_message_privacy_mode_hides_raw_input_in_response(client):
    response = client.post(
        "/api/scan/message",
        json={
            "text": "Hi, I'm Jane Doe. Call me at 415-555-0100 or email jane@example.com right away.",
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_input"] == payload["redacted_input"]
    assert "415-555-0100" not in payload["original_input"]
    assert "jane@example.com" not in payload["original_input"]
    assert payload["metadata"]["privacy_mode"] is True


def test_url_privacy_mode_hides_raw_query_values_in_response(client):
    response = client.post(
        "/api/scan/url",
        json={
            "url": "https://example.com/reset?email=jane@example.com",
            "language": "en",
            "privacy_mode": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_input"] == payload["redacted_input"]
    assert "jane@example.com" not in payload["original_input"]


def test_screenshot_privacy_mode_hides_raw_extracted_text(client):
    image_bytes = png_with_text(["Bank alert", "Call 415-555-0199"])

    response = client.post(
        "/api/scan/screenshot",
        files={"image": ("bank-alert.png", image_bytes, "image/png")},
        data={
            "language": "en",
            "privacy_mode": "true",
            "ocr_override_text": "Hi, I'm Jane Doe. Call 415-555-0199 or email jane@example.com.",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "415-555-0199" not in payload["original_input"]
    assert "jane@example.com" not in payload["original_input"]
    assert "415-555-0199" not in payload["metadata"]["ocr"]["analysis_text"]
    assert "jane@example.com" not in payload["metadata"]["ocr"]["analysis_text"]


def test_document_privacy_mode_hides_raw_document_text_in_response_and_report(client):
    response = client.post(
        "/api/scan/document",
        files={
            "file": (
                "secure-review.docx",
                docx_bytes(
                    paragraphs=["Contact Jane Doe at jane@example.com or 415-555-0177 today."],
                    links=[("Open secure file", "https://example.com/review?email=jane@example.com")],
                ),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"language": "en", "privacy_mode": "true"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "jane@example.com" not in payload["original_input"]
    assert "415-555-0177" not in payload["original_input"]
    assert "jane@example.com" not in payload["metadata"]["document"]["extracted_text"]
    assert "415-555-0177" not in payload["metadata"]["document"]["text_preview"]
    assert "jane@example.com" not in payload["metadata"]["document"]["link_pairs"][0]["target_url"]

    report = client.post("/api/report", json={"result": payload, "format": "txt"})
    assert report.status_code == 200
    assert "jane@example.com" not in report.text
    assert "415-555-0177" not in report.text


def test_voice_privacy_mode_hides_raw_transcript_in_live_and_upload_flows(client):
    start = client.post("/api/scan/voice/start", json={"language": "en", "privacy_mode": True})
    session = start.json()
    transcript = "Hi, this is Jane Doe. Call me back at 415-555-0144 or email jane@example.com."

    update = client.post(
        "/api/scan/voice/update",
        json={
            "session_id": session["session_id"],
            "transcript_text": transcript,
            "transcript_segments": [{"text": transcript, "timestamp": ""}],
            "voice_signals": [],
            "elapsed_seconds": 5,
            "include_ai": False,
        },
    )

    assert update.status_code == 200
    live_payload = update.json()
    assert "415-555-0144" not in live_payload["original_input"]
    assert "jane@example.com" not in live_payload["metadata"]["voice"]["transcript_text"]
    assert "415-555-0144" not in live_payload["metadata"]["voice"]["transcript_segments"][0]["text"]

    upload = client.post(
        "/api/scan/voice/upload",
        files={"file": ("call.wav", wav_tone_bytes(), "audio/wav")},
        data={"language": "en", "privacy_mode": "true", "transcript_override_text": transcript},
    )

    assert upload.status_code == 200
    upload_payload = upload.json()
    assert "415-555-0144" not in upload_payload["original_input"]
    assert "jane@example.com" not in upload_payload["metadata"]["voice"]["transcript_text"]


def test_privacy_mode_off_preserves_raw_input_in_response(client):
    response = client.post(
        "/api/scan/message",
        json={
            "text": "Contact Jane Doe at jane@example.com or 415-555-0188.",
            "language": "en",
            "privacy_mode": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["redacted_input"] is None
    assert "jane@example.com" in payload["original_input"]
    assert "415-555-0188" in payload["original_input"]


def test_voice_finalize_returns_clear_error_for_missing_session(client):
    response = client.post(
        "/api/scan/voice/finalize",
        json={
            "session_id": "voice-missing",
            "transcript_text": "hello",
            "transcript_segments": [],
            "voice_signals": [],
            "elapsed_seconds": 1,
            "include_ai": False,
        },
    )

    assert response.status_code == 400
    assert "session not found" in response.json()["detail"].lower()
