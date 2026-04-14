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
