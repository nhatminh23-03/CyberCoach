from __future__ import annotations

from backend.app.services.heuristics import build_url_precheck, run_heuristics


def _finding_types(result: dict[str, object]) -> set[str]:
    return {item["type"] for item in result["findings"]}  # type: ignore[index]


def test_message_heuristics_flag_common_bank_phishing_patterns(message_fixtures):
    text = message_fixtures["bank_fraud_alert"]["text"]

    result = run_heuristics(text)

    assert {"credential_ask", "urgency", "official_entity_impersonation"} <= _finding_types(result)
    assert result["score"] >= 6


def test_url_heuristics_build_expected_bucket_breakdown(url_fixtures):
    result = run_heuristics(url_fixtures["misleading_subdomain"]["url"], enable_live_url_checks=False)

    bucket_keys = {bucket["key"] for bucket in result["evidence_buckets"]}  # type: ignore[index]
    assert bucket_keys == {"structural", "reputation", "destination"}
    assert {"official_entity_impersonation", "subdomain_impersonation"} <= _finding_types(result)


def test_voice_heuristics_detect_bank_control_and_otp(voice_transcript_fixtures):
    transcript = voice_transcript_fixtures["bank_impersonation"]["transcript"]

    result = run_heuristics(transcript, voice_metadata={"voice_signals": []})

    assert {"voice_bank_impersonation", "voice_call_control", "voice_otp_request"} <= _finding_types(result)


def test_url_precheck_parses_metadata_for_shorteners_and_raw_ips():
    shortener = build_url_precheck("bit.ly/reset-now")
    raw_ip = build_url_precheck("http://192.168.1.7/login")

    assert shortener["domain"] == "bit.ly"
    assert shortener["is_shortened"] is True
    assert raw_ip["is_raw_ip"] is True
