from __future__ import annotations

from backend.app.services.analyzer import analyze_message
from backend.app.services.reports import generate_markdown_report, generate_text_report


def test_report_generation_includes_core_sections_for_message_result():
    result = analyze_message(
        "Microsoft security alert: verify your account now at https://microsoft-login-check.co/verify",
        language="en",
        privacy_mode=True,
    )

    text_report = generate_text_report(result)
    markdown_report = generate_markdown_report(result)

    assert "CyberCoach Safety Report" in text_report
    assert "Key Findings" in text_report
    assert "Recommended Actions" in text_report
    assert "# CyberCoach Safety Report" in markdown_report
    assert "## Summary" in markdown_report
    assert "## Recommended Actions" in markdown_report


def test_report_generation_includes_document_section_when_document_metadata_exists():
    from backend.app.services.analyzer import analyze_document
    from tests.helpers.asset_factory import docx_bytes

    payload = docx_bytes(
        paragraphs=["Review the secure invoice today."],
        links=[("Open Secure File", "https://secure-sharepoint-review-login.co/open")],
    )
    result = analyze_document(
        payload,
        filename="invoice.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        language="en",
        privacy_mode=True,
    )

    text_report = generate_text_report(result)

    assert "Document X-Ray" in text_report
    assert "embedded links" in text_report.lower()


def test_markdown_report_escapes_user_controlled_markdown_sequences():
    payload = {
        "scan_type": "message",
        "risk_label": "Suspicious",
        "confidence": "Medium",
        "likely_scam_pattern": "# Fake Heading",
        "summary": "User wrote\n## injected heading\n[click me](https://evil.example)",
        "top_reasons": ["- [ ] fake task item", "> quoted warning"],
        "recommended_actions": ["Do not click [`now`](https://evil.example)"],
        "redacted_input": None,
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
            "document": {
                "file_name": "invoice_[review].pdf",
                "file_type": "pdf",
                "inspectable": True,
                "link_pairs": [
                    {
                        "display_text": "Open [secure] file",
                        "target_url": "https://evil.example/path_(review)",
                    }
                ],
            },
            "voice": {
                "session_id": "voice-123",
                "transcript_segments": [{"text": "Caller said: #urgent [pay now](https://evil.example)"}],
            },
        },
    }

    report = generate_markdown_report(payload)

    assert "\n## injected heading" not in report
    assert "\\#\\# injected heading" in report
    assert "\\[click me\\]\\(https://evil.example\\)" in report
    assert "- [ ] Do not click \\[\\`now\\`\\]\\(https://evil.example\\)" in report
    assert "**Open \\[secure\\] file** -> `https://evil.example/path\\_\\(review\\)`" in report
    assert "Caller said: \\#urgent \\[pay now\\]\\(https://evil.example\\)" in report
