from __future__ import annotations

from backend.app.services.pii import redact_pii


def test_redact_pii_masks_common_sensitive_values():
    text = "Email me at alice@example.com or call 415-555-0100. My SSN is 123-45-6789."

    redacted_text, redactions = redact_pii(text)

    assert "[EMAIL REDACTED]" in redacted_text
    assert "[PHONE REDACTED]" in redacted_text
    assert "[SSN REDACTED]" in redacted_text
    assert {item["type"] for item in redactions} >= {"email", "phone", "ssn"}


def test_redact_pii_leaves_clean_text_unchanged_when_nothing_matches():
    text = "I can meet you at the coffee shop after lunch."

    redacted_text, redactions = redact_pii(text)

    assert redacted_text == text
    assert redactions == []
