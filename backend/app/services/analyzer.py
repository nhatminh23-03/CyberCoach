from __future__ import annotations

from typing import Any

from ..models.responses import ScanResponse
from .heuristics import run_heuristics
from .history import history_store
from .llm import build_fallback_result, call_dual_llm, call_llm, resolve_llm_config
from .ocr import extract_text_from_image
from .pii import redact_pii


LANGUAGE_MAP = {
    "en": "English",
    "english": "English",
    "es": "Spanish",
    "spanish": "Spanish",
    "zh": "Chinese",
    "chinese": "Chinese",
    "vi": "Vietnamese",
    "vietnamese": "Vietnamese",
    "ko": "Korean",
    "korean": "Korean",
    "tl": "Tagalog",
    "tagalog": "Tagalog",
    "fr": "French",
    "french": "French",
}

RISK_LABELS = {
    "safe": "Safe",
    "suspicious": "Suspicious",
    "high_risk": "High Risk",
}


def normalize_language(language: str) -> str:
    """Map API language codes to the legacy language names used by the app."""
    if not language:
        return "English"
    return LANGUAGE_MAP.get(language.strip().lower(), language.strip())


def _normalize_url(url: str) -> str:
    stripped = url.strip()
    if not stripped.startswith(("http://", "https://")):
        stripped = "https://" + stripped
    return stripped


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
) -> ScanResponse:
    risk_level = llm_result.get("risk_level", "safe")
    reasons = llm_result.get("reasons") or []
    actions = llm_result.get("actions") or []
    explanation = llm_result.get("explanation") or "No summary available."
    heuristic_findings = heuristics.get("findings", [])
    confidence_score = llm_result.get("confidence")

    signals = [item["detail"] for item in heuristic_findings] or reasons
    likely_pattern = _humanize_pattern(heuristic_findings[0]["type"]) if heuristic_findings else RISK_LABELS.get(risk_level, "Safe")

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
            "redactions": redactions,
            "redaction_count": len(redactions),
            "ai_available": llm_result.get("ai_available", True),
            "claude_result": claude_result,
            "gpt_result": gpt_result,
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
    heuristics = run_heuristics(original_input)

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    if llm_config.api_key:
        if llm_config.provider == "openrouter":
            claude_result, gpt_result = call_dual_llm(redacted_input, heuristics, llm_config, normalized_language)
            ai_result = claude_result or gpt_result
            provider_used = "openrouter" if ai_result else None
        else:
            claude_result = call_llm(redacted_input, heuristics, llm_config, normalized_language)
            ai_result = claude_result
            provider_used = llm_config.provider if ai_result else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language)
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
    )


def analyze_message(text: str, language: str = "en", privacy_mode: bool = True) -> ScanResponse:
    """Analyze a pasted message with the preserved Streamlit backend logic."""
    return _analyze_text_input("message", text, language, privacy_mode)


def analyze_url(url: str, language: str = "en", privacy_mode: bool = True) -> ScanResponse:
    """Analyze a URL by reusing the existing text-based heuristics and LLM flow."""
    return _analyze_text_input("url", _normalize_url(url), language, privacy_mode)


def analyze_screenshot(image_bytes: bytes, media_type: str = "image/png", language: str = "en", privacy_mode: bool = True) -> ScanResponse:
    """Analyze a screenshot by extracting text first, then running the shared pipeline."""
    normalized_language = normalize_language(language)
    extracted_text, ocr_metadata = extract_text_from_image(image_bytes, media_type)
    if not extracted_text:
        reason = (ocr_metadata or {}).get("reason", "Could not extract text from image.")
        raise ValueError(reason)

    llm_config = resolve_llm_config()
    redacted_input, redactions = redact_pii(extracted_text) if privacy_mode else (extracted_text, [])
    heuristics = run_heuristics(extracted_text)

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    if llm_config.api_key:
        if llm_config.provider == "openrouter":
            claude_result, gpt_result = call_dual_llm(redacted_input, heuristics, llm_config, normalized_language)
            ai_result = claude_result or gpt_result
            provider_used = "openrouter" if ai_result else None
        else:
            claude_result = call_llm(redacted_input, heuristics, llm_config, normalized_language)
            ai_result = claude_result
            provider_used = llm_config.provider if ai_result else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language)
    return _build_unified_response(
        scan_type="screenshot",
        original_input=extracted_text,
        redacted_input=redacted_input if privacy_mode else None,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        ocr_metadata=ocr_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
    )
