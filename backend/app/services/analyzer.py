from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import uuid4

from ..models.responses import ScanResponse
from .document_intel import extract_document_artifacts
from .domain_utils import normalize_url_input as _normalize_url
from .heuristics import run_heuristics
from .history import history_store
from .llm import (
    build_consensus_result,
    build_fallback_result,
    call_dual_llm_with_errors,
    call_live_voice_llm_with_error,
    call_llm_with_error,
    call_second_llm_with_error,
    resolve_llm_config,
)
from .ocr import extract_text_from_image
from .pii import redact_pii
from .service_data import language_map, risk_labels
from .voice_guard import VoiceSession, build_voice_challenge_questions, build_voice_warnings, voice_session_store
from .voice_media import build_transcript_segments, transcribe_voice_media


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


def _sanitize_model_errors(model_errors: list[dict[str, str]] | None) -> list[dict[str, str]]:
    sanitized: list[dict[str, str]] = []
    for item in model_errors or []:
        slot = str(item.get("slot") or "primary")
        model = str(item.get("model") or "Configured model")
        sanitized.append(
            {
                "slot": slot,
                "model": model,
                "error": "This model review was unavailable for this scan.",
            }
        )
    return sanitized


def _protected_text(value: str | None, *, privacy_mode: bool) -> str | None:
    if value is None:
        return None
    text = str(value)
    if not privacy_mode:
        return text
    protected, _ = redact_pii(text)
    return protected


def _protected_segments(segments: list[dict[str, Any]] | None, *, privacy_mode: bool) -> list[dict[str, Any]]:
    if not segments:
        return []
    protected: list[dict[str, Any]] = []
    for item in segments:
        next_item = dict(item)
        next_item["text"] = _protected_text(str(item.get("text") or ""), privacy_mode=privacy_mode) or ""
        protected.append(next_item)
    return protected


def _sanitize_ocr_metadata(ocr_metadata: dict[str, Any] | None, *, privacy_mode: bool) -> dict[str, Any]:
    if not ocr_metadata:
        return {}
    sanitized = deepcopy(ocr_metadata)
    for key in ("extracted_text", "analysis_text", "original_extracted_text", "ocr_override_text"):
        if key in sanitized:
            sanitized[key] = _protected_text(sanitized.get(key), privacy_mode=privacy_mode)
    if isinstance(sanitized.get("qr_payloads"), list):
        sanitized["qr_payloads"] = [
            _protected_text(item, privacy_mode=privacy_mode) or "" for item in sanitized["qr_payloads"]
        ]
    return sanitized


def _sanitize_document_metadata(document_metadata: dict[str, Any] | None, *, privacy_mode: bool) -> dict[str, Any]:
    if not document_metadata:
        return {}
    sanitized = deepcopy(document_metadata)
    for key in ("text_preview", "extracted_text", "ocr_text"):
        if key in sanitized:
            sanitized[key] = _protected_text(sanitized.get(key), privacy_mode=privacy_mode)
    if isinstance(sanitized.get("extracted_urls"), list):
        sanitized["extracted_urls"] = [
            _protected_text(item, privacy_mode=privacy_mode) or "" for item in sanitized["extracted_urls"]
        ]
    if isinstance(sanitized.get("qr_payloads"), list):
        sanitized["qr_payloads"] = [
            _protected_text(item, privacy_mode=privacy_mode) or "" for item in sanitized["qr_payloads"]
        ]
    if isinstance(sanitized.get("link_pairs"), list):
        next_pairs: list[dict[str, Any]] = []
        for item in sanitized["link_pairs"]:
            if not isinstance(item, dict):
                continue
            next_item = dict(item)
            for key in ("display_text", "target_url"):
                if key in next_item:
                    next_item[key] = _protected_text(next_item.get(key), privacy_mode=privacy_mode)
            next_pairs.append(next_item)
        sanitized["link_pairs"] = next_pairs
    return sanitized


def _sanitize_voice_metadata(voice_metadata: dict[str, Any] | None, *, privacy_mode: bool) -> dict[str, Any]:
    if not voice_metadata:
        return {}
    sanitized = deepcopy(voice_metadata)
    if "transcript_text" in sanitized:
        sanitized["transcript_text"] = _protected_text(sanitized.get("transcript_text"), privacy_mode=privacy_mode)
    if "transcript_segments" in sanitized:
        sanitized["transcript_segments"] = _protected_segments(sanitized.get("transcript_segments"), privacy_mode=privacy_mode)
    return sanitized


def _sanitize_url_live_inspection(items: list[dict[str, Any]] | None, *, privacy_mode: bool) -> list[dict[str, Any]]:
    if not items:
        return []
    sanitized: list[dict[str, Any]] = []
    for item in items:
        next_item = deepcopy(item)
        for key in ("normalized_url", "final_url", "meta_refresh_target", "page_excerpt"):
            if key in next_item:
                next_item[key] = _protected_text(next_item.get(key), privacy_mode=privacy_mode)
        if isinstance(next_item.get("redirect_chain"), list):
            redirect_chain: list[dict[str, Any]] = []
            for redirect in next_item["redirect_chain"]:
                if not isinstance(redirect, dict):
                    continue
                redirect_chain.append(
                    {
                        **redirect,
                        "from_url": _protected_text(redirect.get("from_url"), privacy_mode=privacy_mode),
                        "to_url": _protected_text(redirect.get("to_url"), privacy_mode=privacy_mode),
                    }
                )
            next_item["redirect_chain"] = redirect_chain
        sanitized.append(next_item)
    return sanitized


def _primary_finding(findings: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not findings:
        return None

    priority = {
        "phishtank_match": 100,
        "official_entity_impersonation": 95,
        "page_brand_impersonation": 94,
        "document_protected": 93,
        "document_macro_enabled": 93,
        "document_link_mismatch": 92,
        "voice_family_emergency": 91,
        "subdomain_impersonation": 90,
        "voice_bank_impersonation": 90,
        "voice_government_impersonation": 89,
        "homoglyph": 88,
        "document_deceptive_cta": 87,
        "voice_payment_request": 86,
        "domain_mismatch": 85,
        "voice_secrecy_pressure": 84,
        "cross_domain_redirect": 84,
        "voice_otp_request": 83,
        "external_form_action": 83,
        "voice_call_control": 82,
        "login_form": 82,
        "legal_threat": 80,
        "invoice_payment_pressure": 79,
        "qr_account_lure": 79,
        "voice_pattern_suspicious": 78,
        "credential_ask": 75,
        "document_qr_payload": 74,
        "meta_refresh_redirect": 73,
        "suspicious_tld": 70,
        "insecure_destination": 69,
        "multi_hop_redirect": 68,
        "credential_lure_page": 67,
        "urgency": 65,
        "deadline_conflict": 60,
        "document_image_only": 59,
        "document_partial_analysis": 58,
        "visual_brand_impersonation": 58,
        "visual_credential_prompt": 57,
        "visual_payment_request_ui": 56,
        "visual_partial_login_ui": 56,
        "visual_account_security_ui": 55,
        "visual_notification_banner_ui": 55,
        "visual_delivery_notice_ui": 54,
        "visual_system_alert_ui": 53,
        "visual_browser_chrome_ui": 53,
        "visual_banking_app_ui": 52,
        "visual_cropped_context_ui": 52,
        "visual_urgent_cta": 52,
        "visual_mobile_message_ui": 51,
        "voice_audio_quality_limited": 50,
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
    document_metadata: dict[str, Any] | None = None,
    voice_metadata: dict[str, Any] | None = None,
    claude_result: dict[str, Any] | None = None,
    gpt_result: dict[str, Any] | None = None,
    model_errors: list[dict[str, str]] | None = None,
    persist_history: bool = True,
    privacy_mode: bool = False,
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

    protected_input = _protected_text(redacted_input if privacy_mode else original_input, privacy_mode=False) or ""
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
        original_input=protected_input,
        redacted_input=redacted_input if privacy_mode else None,
        provider_used=provider_used,
        metadata={
            "language": language,
            "privacy_mode": privacy_mode,
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "heuristic_score": heuristics.get("score", 0),
            "heuristic_findings": heuristic_findings,
            "urls": heuristics.get("urls", []),
            "url_evidence": heuristics.get("url_evidence", []),
            "url_live_inspection": _sanitize_url_live_inspection(
                heuristics.get("live_url_inspection", []),
                privacy_mode=privacy_mode,
            ),
            "evidence_buckets": heuristics.get("evidence_buckets", []),
            "redactions": redactions,
            "redaction_count": len(redactions),
            "ai_available": llm_result.get("ai_available", True),
            "decision_source": llm_result.get("decision_source", "heuristic_fallback"),
            "consensus": llm_result.get("consensus", {}),
            "model_runs": llm_result.get("model_runs", []),
            "claude_result": claude_result,
            "gpt_result": gpt_result,
            "model_errors": _sanitize_model_errors(model_errors),
            "ocr": _sanitize_ocr_metadata(ocr_metadata, privacy_mode=privacy_mode),
            "document": _sanitize_document_metadata(document_metadata, privacy_mode=privacy_mode),
            "voice": _sanitize_voice_metadata(voice_metadata, privacy_mode=privacy_mode),
        },
    )

    if persist_history:
        entry = history_store.add(payload.model_dump())
        if entry is not None:
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
            ai_result = build_consensus_result(
                claude_result,
                gpt_result,
                heuristics,
                llm_config,
                normalized_language,
                scan_type=scan_type,
            )
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(
                    claude_result,
                    None,
                    heuristics,
                    llm_config,
                    normalized_language,
                    scan_type=scan_type,
                )
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, scan_type)
    return _build_unified_response(
        scan_type=scan_type,
        original_input=original_input,
        redacted_input=redacted_input,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
        privacy_mode=privacy_mode,
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
            ai_result = build_consensus_result(
                claude_result,
                gpt_result,
                heuristics,
                llm_config,
                normalized_language,
                scan_type="screenshot",
            )
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(
                    claude_result,
                    None,
                    heuristics,
                    llm_config,
                    normalized_language,
                    scan_type="screenshot",
                )
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, "screenshot")
    return _build_unified_response(
        scan_type="screenshot",
        original_input=analysis_input,
        redacted_input=redacted_input,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        ocr_metadata=enhanced_ocr_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
        privacy_mode=privacy_mode,
    )


def analyze_document(
    file_bytes: bytes,
    filename: str,
    media_type: str = "application/octet-stream",
    language: str = "en",
    privacy_mode: bool = True,
) -> ScanResponse:
    """Analyze a suspicious PDF or DOCX by extracting document text, links, and QR payloads first."""
    normalized_language = normalize_language(language)
    document_metadata = extract_document_artifacts(
        file_bytes,
        filename=filename,
        media_type=media_type,
        language=normalized_language,
    )

    analysis_parts: list[str] = [f"[Document file]\n{filename}"]
    extracted_text = str(document_metadata.get("extracted_text") or "").strip()
    if extracted_text:
        analysis_parts.append(extracted_text)

    link_pairs = [item for item in document_metadata.get("link_pairs", []) if isinstance(item, dict)]
    if link_pairs:
        analysis_parts.append(
            "[Embedded links]\n"
            + "\n".join(
                f'{item.get("display_text", "link")} -> {item.get("target_url", "")}'
                for item in link_pairs[:12]
                if str(item.get("target_url") or "").strip()
            )
        )

    qr_payloads = [str(item).strip() for item in document_metadata.get("qr_payloads", []) if str(item).strip()]
    if qr_payloads:
        analysis_parts.append("[Detected QR payloads]\n" + "\n".join(qr_payloads))

    analysis_input = "\n\n".join(part for part in analysis_parts if part).strip()
    if len(analysis_input) > 12000:
        analysis_input = analysis_input[:12000].rstrip()
        document_metadata["text_truncated"] = True
        limitations = list(document_metadata.get("limitations", []))
        limitations.append("Only the first portion of the document was analyzed to keep the scan focused and responsive.")
        document_metadata["limitations"] = limitations

    llm_config = resolve_llm_config()
    redacted_input, redactions = redact_pii(analysis_input) if privacy_mode else (analysis_input, [])
    heuristics = run_heuristics(
        analysis_input,
        enable_live_url_checks=True,
        document_metadata=document_metadata,
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
            ai_result = build_consensus_result(
                claude_result,
                gpt_result,
                heuristics,
                llm_config,
                normalized_language,
                scan_type="document",
            )
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(
                    claude_result,
                    None,
                    heuristics,
                    llm_config,
                    normalized_language,
                    scan_type="document",
                )
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, "document")
    return _build_unified_response(
        scan_type="document",
        original_input=analysis_input,
        redacted_input=redacted_input,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        document_metadata=document_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
        privacy_mode=privacy_mode,
    )


def start_voice_session(language: str = "en", privacy_mode: bool = True) -> dict[str, Any]:
    normalized_language = normalize_language(language)
    session = voice_session_store.start(language=normalized_language, privacy_mode=privacy_mode)
    return {
        "session_id": session.session_id,
        "status": "listening",
        "language": normalized_language,
        "privacy_mode": privacy_mode,
        "started_at": session.started_at,
        "challenge_questions": build_voice_challenge_questions("", []),
        "limitations": [
            "Live transcript quality depends on browser speech recognition, speakerphone volume, and room noise.",
            "CyberCoach treats suspicious voice-pattern hints as supportive signals, not proof of AI cloning.",
        ],
    }


LIVE_VOICE_AI_MIN_WORDS = 16
LIVE_VOICE_AI_GROWTH_THRESHOLD = 12
LIVE_VOICE_AI_RISK_DELTA = 1
LIVE_VOICE_AI_COOLDOWN_SECONDS = 10


def _summarize_live_ai(text: str) -> str:
    cleaned = " ".join((text or "").strip().split())
    if not cleaned:
        return ""
    for marker in (". ", "! ", "? "):
        if marker in cleaned:
            sentence = cleaned.split(marker, 1)[0].strip()
            if sentence:
                return sentence + ("" if sentence.endswith((".", "!", "?")) else marker.strip())
    return cleaned[:220].rstrip() + ("..." if len(cleaned) > 220 else "")


def _next_live_ai_state(
    *,
    session: VoiceSession,
    llm_config: Any,
    transcript_word_count: int,
    heuristic_score: int,
) -> tuple[str, str, bool]:
    if not llm_config.api_key:
        return (
            "ai_live_unavailable",
            "Live AI review is unavailable in this environment, so CyberCoach is using the transcript and local warning signs for the live alerts.",
            False,
        )

    if transcript_word_count < LIVE_VOICE_AI_MIN_WORDS and not session.live_ai_attempted:
        return (
            "ai_live_pending",
            "CyberCoach is collecting a little more transcript before starting live AI review so the call summary has enough context.",
            False,
        )

    if not session.live_ai_attempted:
        return ("ai_live_pending", "CyberCoach has enough transcript and is warming up a live AI review.", True)

    word_growth = transcript_word_count - session.live_ai_last_word_count
    score_delta = abs(heuristic_score - session.live_ai_last_heuristic_score)
    elapsed_since_last_ai = max(0, session.elapsed_seconds - session.live_ai_last_elapsed_seconds)
    should_refresh = (
        word_growth >= LIVE_VOICE_AI_GROWTH_THRESHOLD
        or score_delta >= LIVE_VOICE_AI_RISK_DELTA
        or elapsed_since_last_ai >= LIVE_VOICE_AI_COOLDOWN_SECONDS
    )
    if should_refresh:
        return ("ai_live_pending", "CyberCoach is refreshing the live AI review with the newest transcript.", True)

    if session.live_ai_state:
        return (session.live_ai_state, session.live_ai_summary, False)

    return ("heuristics_live_only", "CyberCoach is using the transcript and local warning signs for the live alerts in this session.", False)


def _run_live_voice_ai_review(
    *,
    session: VoiceSession,
    redacted_input: str,
    heuristics: dict[str, Any],
    language: str,
) -> tuple[dict[str, Any] | None, str | None, dict[str, Any] | None, dict[str, Any] | None, list[dict[str, str]], VoiceSession]:
    transcript_word_count = len(session.transcript_text.split())
    heuristic_score = int(heuristics.get("score", 0) or 0)
    llm_config = resolve_llm_config()
    state, summary, should_run = _next_live_ai_state(
        session=session,
        llm_config=llm_config,
        transcript_word_count=transcript_word_count,
        heuristic_score=heuristic_score,
    )

    if not should_run:
        updated_session = voice_session_store.apply_live_ai_review(
            session.session_id,
            state=state,
            summary=summary,
            reasons=session.live_ai_reasons,
            confidence=session.live_ai_confidence,
            action=session.live_ai_action,
            attempted=session.live_ai_attempted,
        )
        return None, None, None, None, [], updated_session

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    model_errors: list[dict[str, str]] = []
    if llm_config.provider == "openrouter":
        gpt_result, error = call_live_voice_llm_with_error(redacted_input, heuristics, llm_config, language)
        if error:
            model_errors = [{"slot": "live", "model": llm_config.live_voice_model, "error": error}]
        if gpt_result:
            ai_result = build_consensus_result(
                None,
                gpt_result,
                heuristics,
                llm_config,
                language,
                scan_type="voice",
            )
        provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
    else:
        claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, language)
        if error:
            model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
        if claude_result:
            ai_result = build_consensus_result(
                claude_result,
                None,
                heuristics,
                llm_config,
                language,
                scan_type="voice",
            )
        provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    if ai_result and ai_result.get("ai_available"):
        updated_session = voice_session_store.apply_live_ai_review(
            session.session_id,
            state="ai_live_active",
            summary=_summarize_live_ai(str(ai_result.get("explanation") or "")),
            reasons=[str(item) for item in (ai_result.get("reasons") or [])[:3]],
            confidence=_confidence_label(ai_result.get("confidence"), heuristic_score),
            action=((ai_result.get("actions") or [None])[0] if isinstance(ai_result.get("actions"), list) else None),
            attempted=True,
            transcript_word_count=transcript_word_count,
            heuristic_score=heuristic_score,
            elapsed_seconds=session.elapsed_seconds,
        )
        return ai_result, provider_used, claude_result, gpt_result, model_errors, updated_session

    fallback_summary = (
        "Live AI review was attempted but is unavailable right now, so CyberCoach is continuing with the transcript and local warning signs for the live alerts."
    )
    updated_session = voice_session_store.apply_live_ai_review(
        session.session_id,
        state="ai_live_unavailable",
        summary=fallback_summary,
        reasons=[],
        confidence=None,
        action=None,
        attempted=True,
        transcript_word_count=transcript_word_count,
        heuristic_score=heuristic_score,
        elapsed_seconds=session.elapsed_seconds,
    )
    return None, None, claude_result, gpt_result, model_errors, updated_session


def _analyze_voice_text(
    *,
    transcript_text: str,
    transcript_segments: list[dict[str, Any]],
    voice_signals: list[dict[str, Any]],
    language: str,
    privacy_mode: bool,
    session_id: str,
    started_at: str,
    updated_at: str,
    elapsed_seconds: int,
    persist_history: bool,
    allow_ai: bool,
) -> ScanResponse:
    normalized_language = normalize_language(language)
    original_input = transcript_text.strip()
    session = voice_session_store.get(session_id)
    transcript_word_count = len(original_input.split())
    limitations = [
        "Live transcript quality depends on browser speech recognition, speakerphone volume, and room noise.",
        "Suspicious voice-pattern hints are supportive signals, not proof that a caller is AI-generated.",
    ]

    if not original_input:
        live_ai_state = "ai_live_pending" if allow_ai else "heuristics_live_only"
        live_ai_summary = (
            "CyberCoach is collecting transcript before starting live AI review."
            if allow_ai
            else "Live AI review is off for this session, so CyberCoach is using the transcript and local warning signs for fast guidance."
        )
        fallback_result = {
            "risk_level": "safe",
            "confidence": None,
            "reasons": ["CyberCoach has not captured enough clear speech to analyze this call yet."],
            "actions": [
                "Ask the caller to slow down or repeat themselves if you want CyberCoach to keep listening.",
                "If the call feels urgent or asks for money, hang up and verify the request through a trusted number.",
            ],
            "explanation": "CyberCoach has not captured enough clear speech to score this call yet.",
            "ai_available": False,
            "decision_source": "heuristic_fallback",
            "consensus": {
                "status": "heuristic_fallback",
                "summary": "This live call session needs a little more finalized transcript before CyberCoach can score the risk.",
                "models_compared": 0,
                "agree": False,
                "strategy": "live_waiting",
            },
            "model_runs": [],
        }
        voice_metadata = {
            "session_id": session_id,
            "analysis_state": "final" if persist_history else "live",
            "started_at": started_at,
            "updated_at": updated_at,
            "elapsed_seconds": max(0, int(elapsed_seconds)),
            "transcript_segments": transcript_segments[-20:],
            "transcript_text": original_input,
            "transcript_word_count": transcript_word_count,
            "voice_signals": voice_signals,
            "listening_mode": "speakerphone_listener",
            "challenge_questions": build_voice_challenge_questions("", []),
            "live_warnings": [],
            "limitations": limitations,
            "live_ai_state": live_ai_state,
            "live_ai_summary": live_ai_summary,
            "live_ai_reasons": [],
            "live_ai_confidence": None,
            "live_ai_last_updated_at": updated_at,
            "live_ai_attempted": False,
            "live_ai_action": None,
        }
        return _build_unified_response(
            scan_type="voice",
            original_input="[No transcript captured yet]",
            redacted_input=None,
            redactions=[],
            heuristics={"findings": [], "score": 0, "urls": [], "url_evidence": [], "live_url_inspection": [], "evidence_buckets": []},
            llm_result=fallback_result,
            provider_used=None,
            language=normalized_language,
            voice_metadata=voice_metadata,
            persist_history=persist_history,
            privacy_mode=privacy_mode,
        )

    redacted_input, redactions = redact_pii(original_input) if privacy_mode else (original_input, [])
    heuristics = run_heuristics(
        original_input,
        enable_live_url_checks=False,
        voice_metadata={"voice_signals": voice_signals},
    )

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    model_errors: list[dict[str, str]] = []
    active_session = session
    if persist_history:
        llm_config = resolve_llm_config()
        if allow_ai and llm_config.api_key:
            if llm_config.provider == "openrouter":
                claude_result, gpt_result, model_errors = call_dual_llm_with_errors(
                    redacted_input, heuristics, llm_config, normalized_language
                )
                ai_result = build_consensus_result(
                    claude_result,
                    gpt_result,
                    heuristics,
                    llm_config,
                    normalized_language,
                    scan_type="voice",
                )
                provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
            else:
                claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
                if error:
                    model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
                if claude_result:
                    ai_result = build_consensus_result(
                        claude_result,
                        None,
                        heuristics,
                        llm_config,
                        normalized_language,
                        scan_type="voice",
                    )
                provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None
    elif allow_ai and session:
        ai_result, provider_used, claude_result, gpt_result, model_errors, active_session = _run_live_voice_ai_review(
            session=session,
            redacted_input=redacted_input,
            heuristics=heuristics,
            language=normalized_language,
        )

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, "voice")
    final_ai_available = bool(persist_history and ai_result and result.get("ai_available"))
    final_ai_state = (
        "final_ai_reviewed"
        if final_ai_available
        else ("ai_live_unavailable" if persist_history and allow_ai else "heuristics_live_only")
    )
    final_ai_summary = (
        _summarize_live_ai(str(result.get("explanation") or ""))
        if final_ai_available
        else (
            "A final AI voice review was unavailable for this call, so CyberCoach finalized the report from transcript heuristics."
            if persist_history and allow_ai
            else "CyberCoach used transcript heuristics to finalize this call report."
        )
    )
    voice_metadata = {
        "session_id": session_id,
        "analysis_state": "final" if persist_history else "live",
        "started_at": started_at,
        "updated_at": updated_at,
        "elapsed_seconds": max(0, int(elapsed_seconds)),
        "transcript_segments": transcript_segments[-20:],
        "transcript_text": original_input,
        "transcript_word_count": transcript_word_count,
        "voice_signals": voice_signals,
        "listening_mode": "speakerphone_listener",
        "challenge_questions": build_voice_challenge_questions(original_input, heuristics.get("findings", [])),
        "live_warnings": build_voice_warnings(heuristics.get("findings", []), voice_signals),
        "limitations": limitations,
        "live_ai_state": (
            final_ai_state
            if persist_history
            else (active_session.live_ai_state if active_session else ("heuristics_live_only" if not allow_ai else "ai_live_pending"))
        ),
        "live_ai_summary": (
            final_ai_summary
            if persist_history
            else (active_session.live_ai_summary if active_session else "")
        ),
        "live_ai_reasons": (
            [str(item) for item in (result.get("reasons") or [])[:3]]
            if final_ai_available
            else (active_session.live_ai_reasons if active_session else [])
        ),
        "live_ai_confidence": (
            _confidence_label(result.get("confidence"), heuristics.get("score", 0))
            if final_ai_available
            else (active_session.live_ai_confidence if active_session else None)
        ),
        "live_ai_last_updated_at": (
            updated_at
            if persist_history
            else (active_session.live_ai_last_updated_at if active_session else updated_at)
        ),
        "live_ai_attempted": (
            bool(allow_ai)
            if persist_history
            else (active_session.live_ai_attempted if active_session else False)
        ),
        "live_ai_action": (
            ((result.get("actions") or [None])[0] if isinstance(result.get("actions"), list) else None)
            if final_ai_available
            else (active_session.live_ai_action if active_session else None)
        ),
    }
    return _build_unified_response(
        scan_type="voice",
        original_input=original_input,
        redacted_input=redacted_input,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        voice_metadata=voice_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
        persist_history=persist_history,
        privacy_mode=privacy_mode,
    )


def analyze_voice_session_update(
    *,
    session_id: str,
    transcript_text: str,
    transcript_segments: list[dict[str, Any]],
    voice_signals: list[dict[str, Any]],
    elapsed_seconds: int,
    allow_ai: bool = False,
) -> ScanResponse:
    session = voice_session_store.update(
        session_id,
        transcript_text=transcript_text,
        transcript_segments=transcript_segments,
        voice_signals=voice_signals,
        elapsed_seconds=elapsed_seconds,
    )
    return _analyze_voice_text(
        transcript_text=session.transcript_text,
        transcript_segments=session.transcript_segments,
        voice_signals=session.voice_signals,
        language=session.language,
        privacy_mode=session.privacy_mode,
        session_id=session.session_id,
        started_at=session.started_at,
        updated_at=session.updated_at,
        elapsed_seconds=session.elapsed_seconds,
        persist_history=False,
        allow_ai=allow_ai,
    )


def finalize_voice_session(
    *,
    session_id: str,
    transcript_text: str,
    transcript_segments: list[dict[str, Any]],
    voice_signals: list[dict[str, Any]],
    elapsed_seconds: int,
    allow_ai: bool = True,
) -> ScanResponse:
    session = voice_session_store.update(
        session_id,
        transcript_text=transcript_text,
        transcript_segments=transcript_segments,
        voice_signals=voice_signals,
        elapsed_seconds=elapsed_seconds,
    )
    result = _analyze_voice_text(
        transcript_text=session.transcript_text,
        transcript_segments=session.transcript_segments,
        voice_signals=session.voice_signals,
        language=session.language,
        privacy_mode=session.privacy_mode,
        session_id=session.session_id,
        started_at=session.started_at,
        updated_at=session.updated_at,
        elapsed_seconds=session.elapsed_seconds,
        persist_history=True,
        allow_ai=allow_ai,
    )
    voice_session_store.close(session_id)
    return result


def analyze_voice_recording(
    file_bytes: bytes,
    *,
    filename: str,
    media_type: str,
    language: str = "en",
    privacy_mode: bool = True,
    transcript_override: str = "",
) -> ScanResponse:
    normalized_language = normalize_language(language)
    override_text = transcript_override.strip()

    transcription_source = "manual_override"
    transcription_model = "manual"
    transcript_text = override_text
    transcript_segments = build_transcript_segments(override_text) if override_text else []
    limitations: list[str] = []
    resolved_media_type = media_type

    if not transcript_text:
        transcription = transcribe_voice_media(
            file_bytes,
            filename=filename,
            media_type=media_type,
            language=language,
        )
        transcript_text = transcription.text
        transcript_segments = build_transcript_segments(transcription.text)
        transcription_source = transcription.source
        transcription_model = transcription.model
        limitations = transcription.limitations
        resolved_media_type = transcription.media_type

    voice_metadata = {
        "session_id": f"voice-upload-{uuid4().hex[:12]}",
        "analysis_state": "final",
        "started_at": "",
        "updated_at": "",
        "elapsed_seconds": 0,
        "transcript_segments": transcript_segments[-20:],
        "transcript_text": transcript_text,
        "transcript_word_count": len(transcript_text.split()),
        "voice_signals": [],
        "listening_mode": "uploaded_voicemail",
        "source_file_name": filename,
        "source_file_size": len(file_bytes),
        "source_media_type": resolved_media_type,
        "transcription_source": transcription_source,
        "transcription_model": transcription_model,
        "limitations": limitations
        or [
            "Uploaded voicemail analysis depends on transcription quality and can miss words in noisy recordings.",
            "CyberCoach analyzes the transcript and supportive audio hints, but does not prove whether a caller is AI-generated.",
        ],
        "live_ai_state": "ai_live_pending",
        "live_ai_summary": "CyberCoach is preparing the full AI review for this uploaded recording.",
        "live_ai_reasons": [],
        "live_ai_confidence": None,
        "live_ai_last_updated_at": "",
        "live_ai_attempted": False,
        "live_ai_action": None,
    }

    if not transcript_text:
        fallback_result = {
            "risk_level": "suspicious",
            "confidence": None,
            "reasons": ["CyberCoach could not extract enough spoken content from the uploaded recording."],
            "actions": [
                "Paste a transcript override if you can hear the call clearly yourself.",
                "If the call asks for money, account access, or a code, treat it as unverified until you call back through a trusted number.",
            ],
            "explanation": "The uploaded recording did not produce enough transcript to score the call confidently.",
            "ai_available": False,
            "decision_source": "heuristic_fallback",
            "consensus": {
                "status": "heuristic_fallback",
                "summary": "CyberCoach could not extract enough transcript from the uploaded recording to complete the review.",
                "models_compared": 0,
                "agree": False,
                "strategy": "voice_upload_waiting",
            },
            "model_runs": [],
        }
        voice_metadata["challenge_questions"] = build_voice_challenge_questions("", [])
        voice_metadata["live_warnings"] = []
        voice_metadata["live_ai_state"] = "ai_live_unavailable"
        voice_metadata["live_ai_summary"] = "CyberCoach could not extract enough transcript from the uploaded recording to start an AI review."
        return _build_unified_response(
            scan_type="voice",
            original_input="[No transcript captured from uploaded recording]",
            redacted_input=None,
            redactions=[],
            heuristics={"findings": [], "score": 0, "urls": [], "url_evidence": [], "live_url_inspection": [], "evidence_buckets": []},
            llm_result=fallback_result,
            provider_used=None,
            language=normalized_language,
            voice_metadata=voice_metadata,
            persist_history=True,
            privacy_mode=privacy_mode,
        )

    redacted_input, redactions = redact_pii(transcript_text) if privacy_mode else (transcript_text, [])
    heuristics = run_heuristics(
        transcript_text,
        enable_live_url_checks=False,
        voice_metadata={"voice_signals": []},
    )
    voice_metadata["challenge_questions"] = build_voice_challenge_questions(transcript_text, heuristics.get("findings", []))
    voice_metadata["live_warnings"] = build_voice_warnings(heuristics.get("findings", []), [])

    claude_result = None
    gpt_result = None
    ai_result = None
    provider_used = None
    model_errors: list[dict[str, str]] = []
    llm_config = resolve_llm_config()
    if llm_config.api_key:
        if llm_config.provider == "openrouter":
            claude_result, gpt_result, model_errors = call_dual_llm_with_errors(
                redacted_input, heuristics, llm_config, normalized_language
            )
            ai_result = build_consensus_result(
                claude_result,
                gpt_result,
                heuristics,
                llm_config,
                normalized_language,
                scan_type="voice",
            )
            provider_used = "openrouter" if ai_result and ai_result.get("ai_available") else None
        else:
            claude_result, error = call_llm_with_error(redacted_input, heuristics, llm_config, normalized_language)
            if error:
                model_errors = [{"slot": "primary", "model": llm_config.model, "error": error}]
            if claude_result:
                ai_result = build_consensus_result(
                    claude_result,
                    None,
                    heuristics,
                    llm_config,
                    normalized_language,
                    scan_type="voice",
                )
            provider_used = llm_config.provider if ai_result and ai_result.get("ai_available") else None

    result = ai_result or build_fallback_result(heuristics, redactions, normalized_language, "voice")
    voice_metadata["live_ai_state"] = "final_ai_reviewed" if ai_result and result.get("ai_available") else "ai_live_unavailable"
    voice_metadata["live_ai_summary"] = (
        _summarize_live_ai(str(result.get("explanation") or ""))
        if ai_result and result.get("ai_available")
        else "AI model review was unavailable for this uploaded voicemail, so CyberCoach used transcript heuristics."
    )
    voice_metadata["live_ai_reasons"] = [str(item) for item in (result.get("reasons") or [])[:3]] if ai_result else []
    voice_metadata["live_ai_confidence"] = (
        _confidence_label(result.get("confidence"), heuristics.get("score", 0))
        if ai_result and result.get("ai_available")
        else None
    )
    voice_metadata["live_ai_last_updated_at"] = ""
    voice_metadata["live_ai_attempted"] = True
    voice_metadata["live_ai_action"] = ((result.get("actions") or [None])[0] if isinstance(result.get("actions"), list) else None)
    return _build_unified_response(
        scan_type="voice",
        original_input=transcript_text,
        redacted_input=redacted_input,
        redactions=redactions,
        heuristics=heuristics,
        llm_result=result,
        provider_used=provider_used,
        language=normalized_language,
        voice_metadata=voice_metadata,
        claude_result=claude_result,
        gpt_result=gpt_result,
        model_errors=model_errors,
        persist_history=True,
        privacy_mode=privacy_mode,
    )
