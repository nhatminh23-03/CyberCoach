from __future__ import annotations

from backend.app.services.analyzer import analyze_document, analyze_message, analyze_url, analyze_voice_recording
from tests.helpers.asset_factory import docx_bytes, wav_tone_bytes


def _finding_types(result) -> set[str]:
    return {item["type"] for item in result.metadata.get("heuristic_findings", [])}


def _assert_actions_and_summary(result, expected_snapshot: dict[str, object]):
    summary = result.summary.lower()
    for fragment in expected_snapshot.get("summaryContains", []):
        assert str(fragment).lower() in summary

    action_text = " ".join(result.recommended_actions).lower()
    for fragment in expected_snapshot.get("actionsContain", []):
        assert str(fragment).lower() in action_text


def test_message_golden_case_matches_expected_shape(golden_snapshots, message_fixtures):
    fixture = message_fixtures["bank_fraud_alert"]
    expected = golden_snapshots["message_bank_fraud_alert"]

    result = analyze_message(fixture["text"], language="en", privacy_mode=True)

    assert result.scan_type == expected["scan_type"]
    assert result.risk_label == expected["risk_label"]
    assert set(expected["expectedFindingTypes"]).issubset(_finding_types(result))
    _assert_actions_and_summary(result, expected)


def test_url_golden_case_matches_expected_shape(golden_snapshots, url_fixtures):
    fixture = url_fixtures["misleading_subdomain"]
    expected = golden_snapshots["url_obvious_phish"]

    result = analyze_url(fixture["url"], language="en", privacy_mode=True)

    assert result.scan_type == expected["scan_type"]
    assert result.risk_label == expected["risk_label"]
    assert set(expected["expectedFindingTypes"]).issubset(_finding_types(result))
    _assert_actions_and_summary(result, expected)


def test_document_golden_case_matches_expected_shape(golden_snapshots):
    payload = docx_bytes(
        paragraphs=[
            "Secure Document Review Request",
            "Open the secure file today to avoid an invoice dispute and possible service interruption.",
        ],
        links=[("Open Secure File in SharePoint", "https://microsoft-sharepoint-secure-docs-login.co/verify-session")],
    )
    expected = golden_snapshots["document_fake_sharepoint"]

    result = analyze_document(
        payload,
        filename="sharepoint-review.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        language="en",
        privacy_mode=True,
    )

    assert result.scan_type == expected["scan_type"]
    assert result.risk_label == expected["risk_label"]
    assert set(expected["expectedFindingTypes"]).issubset(_finding_types(result))
    _assert_actions_and_summary(result, expected)


def test_voice_golden_case_matches_expected_shape(golden_snapshots, voice_transcript_fixtures):
    transcript = voice_transcript_fixtures["bank_impersonation"]["transcript"]
    expected = golden_snapshots["voice_bank_impersonation"]

    result = analyze_voice_recording(
        wav_tone_bytes(),
        filename="bank-call.wav",
        media_type="audio/wav",
        language="en",
        privacy_mode=True,
        transcript_override=transcript,
    )

    assert result.scan_type == expected["scan_type"]
    assert result.risk_label == expected["risk_label"]
    assert set(expected["expectedFindingTypes"]).issubset(_finding_types(result))
    _assert_actions_and_summary(result, expected)
