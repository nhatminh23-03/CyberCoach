from __future__ import annotations

from typing import Any

from ..models.responses import ScanResponse
from .domain_utils import normalize_url_input as _normalize_url
from .heuristics import run_heuristics
from .history import history_store
from .llm import (
    build_consensus_result,
    build_fallback_result,
    call_dual_llm_with_errors,
    call_llm_with_error,
    resolve_llm_config,
)
from .ocr import extract_text_from_image
from .pii import redact_pii
from .service_data import language_map, risk_labels


LANGUAGE_MAP = language_map()
RISK_LABELS = risk_labels() or {
    "safe": "Safe",
    "suspicious": "Suspicious",
    "high_risk": "High Risk",
}


def normalize_language(language: str) -> str:
    """Map API language codes to the legacy language names used by the app."""
    if not language:
        return "English"
    return LANGUAGE_MAP.get(language.strip().lower(), language.strip())
def _confidence_label(confidence_score: float | None, heuristic_score: int) -> str:
    if confidence_score is not None:
        if confidence_score >= 0.8:
            return "High"
        if confidence_score >= 0.5:
            return "Medium"
        return "Low"
    if heuristic_score >= 6:
        return "Medium"
    return "Low"


def _humanize_pattern(pattern: str) -> str:
    return pattern.replace("_", " ").title()


def _primary_finding(findings: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not findings:
        return None

    priority = {
        "phishtank_match": 100,
        "official_entity_impersonation": 95,
        "page_brand_impersonation": 94,
        "subdomain_impersonation": 90,
        "homoglyph": 88,
        "domain_mismatch": 85,
        "cross_domain_redirect": 84,
        "external_form_action": 83,
        "login_form": 82,
        "legal_threat": 80,
        "qr_account_lure": 79,
        "credential_ask": 75,
        "meta_refresh_redirect": 73,
        "suspicious_tld": 70,
        "insecure_destination": 69,
        "multi_hop_redirect": 68,
        "credential_lure_page": 67,
        "urgency": 65,
        "deadline_conflict": 60,
        "visual_brand_impersonation": 58,
        "visual_credential_prompt": 57,
        "visual_payment_request_ui": 56,
        "visual_account_security_ui": 55,
        "visual_delivery_notice_ui": 54,
        "visual_system_alert_ui": 53,
        "visual_urgent_cta": 52,
        "visual_mobile_message_ui": 51,
    }
    return max(
        findings,
        key=lambda item: (
            priority.get(item.get("type", ""), 0),
            3 if item.get("severity") == "high" else 2 if item.get("severity") == "medium" else 1,
        ),
    )


def _build_unified_response(
    *,
    scan_type: str,
    original_input: str,
    redacted_input: str | None,
    redactions: list[dict[str, str]],
    heuristics: dict[str, Any],
    llm_result: dict[str, Any],
    provider_used: str | None,
    language: str,
    ocr_metadata: dict[str, Any] | None = None,
    claude_result: dict[str, Any] | None = None,
    gpt_result: dict[str, Any] | None = None,
    model_errors: list[dict[str, str]] | None = None,
) -> ScanResponse:
    risk_level = llm_result.get("risk_level", "safe")
    reasons = llm_result.get("reasons") or []
    actions = llm_result.get("actions") or []
    explanation = llm_result.get("explanation") or "No summary available."
    heuristic_findings = heuristics.get("findings", [])
    confidence_score = llm_result.get("confidence")
    primary_finding = _primary_finding(heuristic_findings)

    signals = [item["detail"] for item in heuristic_findings] or reasons
    likely_pattern = _humanize_pattern(primary_finding["type"]) if primary_finding else RISK_LABELS.get(risk_level, "Safe")

    payload = ScanResponse(
        scan_type=scan_type,
        risk_label=RISK_LABELS.get(risk_level, "Safe"),
        risk_score=heuristics.get("score", 0),
        confidence=_confidence_label(confidence_score, heuristics.get("score", 0)),
        likely_scam_pattern=likely_pattern,
        summary=explanation,
        top_reasons=reasons[:3] or signals[:3],
        recommended_actions=actions[:3],
        signals=signals,
        original_input=original_input,
        redacted_input=redacted_input,
        provider_used=provider_used,
        metadata={
            "language": language,
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "heuristic_score": heuristics.get("score", 0),
            "heuristic_findings": heuristic_findings,
            "urls": heuristics.get("urls", []),
            "url_evidence": heuristics.get("url_evidence", []),
            "url_live_inspection": heuristics.get("live_url_inspection", []),
            "evidence_buckets": heuristics.get("evidence_buckets", []),
            "redactions": redactions,
            "redaction_count": len(redactions),
            "ai_available": llm_result.get("ai_available", True),
            "decision_source": llm_result.get("decision_source", "heuristic_fallback"),
            "consensus": llm_result.get("consensus", {}),
            "model_runs": llm_result.get("model_runs", []),
            "claude_result": claude_result,
            "gpt_result": gpt_result,
            "model_errors": model_errors or [],
            "ocr": ocr_metadata or {},
        },
    )

    entry = history_store.add(payload.model_dump())
    payload.metadata["history_id"] = entry.entry_id
    payload.metadata["history_count"] = history_store.count()
    return payload


def _analyze_text_input(scan_type: str, text: str, language: str, privacy_mode: bool) -> ScanResponse:
    """Run the shared text analysis pipeline for message and URL inputs."""
    normalized_language = normalize_language(language)
    original_input = text.strip()
    if not original_input:
        raise ValueError("Text input is required.")

    llm_config = resolve_llm_config()
    redacted_input, redactions = redact_pii(original_input) if privacy_mode else (original_input, [])
    heuristics = run_heuristics(original_input, enable_live_url_checks=scan_type == "url")

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    model_errors: list[dict[str, str]] = []
    if llm_config.api_key:
        if llm_config.provider == "openrouter":
            claude_result, gpt_result, model_errors = call_dual_llm_with_errors(
                redacted_input, heuristics, llm_config, normalized_language
            )
            ai_result = build_consensus_result(claude_result, gpt_result, heuristics, llm_config, normalized_language)
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(claude_result, None, heuristics, llm_config, normalized_language)
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, scan_type)
    return _build_unified_response(
        scan_type=scan_type,
        original_input=original_input,
        redacted_input=redacted_input if privacy_mode else None,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
    )


def analyze_message(text: str, language: str = "en", privacy_mode: bool = True) -> ScanResponse:
    """Analyze a pasted message with the preserved Streamlit backend logic."""
    return _analyze_text_input("message", text, language, privacy_mode)


def analyze_url(url: str, language: str = "en", privacy_mode: bool = True) -> ScanResponse:
    """Analyze a URL by reusing the existing text-based heuristics and LLM flow."""
    return _analyze_text_input("url", _normalize_url(url), language, privacy_mode)


def analyze_screenshot(
    image_bytes: bytes,
    media_type: str = "image/png",
    language: str = "en",
    privacy_mode: bool = True,
    qr_payloads: list[str] | None = None,
    ocr_override_text: str | None = None,
) -> ScanResponse:
    """Analyze a screenshot by extracting text first, then running the shared pipeline."""
    normalized_language = normalize_language(language)
    extracted_text, ocr_metadata = extract_text_from_image(image_bytes, media_type, normalized_language)
    normalized_qr_payloads = []
    for payload in qr_payloads or []:
        stripped = payload.strip()
        if stripped and stripped not in normalized_qr_payloads:
            normalized_qr_payloads.append(stripped)

    override_text = (ocr_override_text or "").strip()

    analysis_parts: list[str] = []
    if override_text:
        analysis_parts.append(override_text)
    elif extracted_text:
        analysis_parts.append(extracted_text)
    if normalized_qr_payloads:
        analysis_parts.append("[Detected QR payloads]\n" + "\n".join(normalized_qr_payloads))

    analysis_input = "\n\n".join(part for part in analysis_parts if part).strip()
    if not analysis_input:
        reason = (ocr_metadata or {}).get("reason", "Could not extract text from image.")
        raise ValueError(reason)

    llm_config = resolve_llm_config()
    enhanced_ocr_metadata = {
        **(ocr_metadata or {}),
        "analysis_text": override_text or extracted_text or "",
        "ocr_override_used": bool(override_text),
        "ocr_override_text": override_text,
        "original_extracted_text": extracted_text or "",
        "qr_payloads": normalized_qr_payloads,
        "qr_detected": bool(normalized_qr_payloads),
    }
    redacted_input, redactions = redact_pii(analysis_input) if privacy_mode else (analysis_input, [])
    heuristics = run_heuristics(
        analysis_input,
        enable_live_url_checks=True,
        screenshot_metadata=enhanced_ocr_metadata,
    )

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    model_errors: list[dict[str, str]] = []
    if llm_config.api_key:
        if llm_config.provider == "openrouter":
            claude_result, gpt_result, model_errors = call_dual_llm_with_errors(
                redacted_input, heuristics, llm_config, normalized_language
            )
            ai_result = build_consensus_result(claude_result, gpt_result, heuristics, llm_config, normalized_language)
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(claude_result, None, heuristics, llm_config, normalized_language)
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, "screenshot")
    return _build_unified_response(
        scan_type="screenshot",
        original_input=analysis_input,
        redacted_input=redacted_input if privacy_mode else None,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        ocr_metadata=enhanced_ocr_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
    )
