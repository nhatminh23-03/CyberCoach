from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any

import anthropic

from ..core.config import get_settings
from ..core.secrets import get_secret
from .service_data import detection_rule_list, fallback_translations


logger = logging.getLogger(__name__)


SCAN_RESPONSE_JSON_SCHEMA = {
    "name": "scan_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "risk_level": {"type": "string", "enum": ["safe", "suspicious", "high_risk"]},
            "confidence": {"type": "number"},
            "reasons": {"type": "array", "items": {"type": "string"}},
            "actions": {"type": "array", "items": {"type": "string"}},
            "explanation": {"type": "string"},
        },
        "required": ["risk_level", "confidence", "reasons", "actions", "explanation"],
        "additionalProperties": False,
    },
}

SCREENSHOT_VISUAL_SIGNAL_TYPES = tuple(detection_rule_list("screenshot_visual_signal_types")) or (
    "mobile_message_ui",
    "delivery_notice_ui",
    "payment_request_ui",
    "credential_prompt_ui",
    "system_alert_ui",
    "account_security_ui",
    "urgent_cta_ui",
    "brand_impersonation_ui",
    "qr_code_visible",
)


@dataclass(frozen=True)
class LLMConfig:
    """Resolved LLM provider configuration."""

    provider: str
    api_key: str
    model: str
    source: str
    secret_name: str
    site_url: str
    app_name: str
    second_model: str
    live_voice_model: str


def provider_label(provider: str) -> str:
    return "OpenRouter" if provider == "openrouter" else "Anthropic"


def resolve_llm_config(api_key_override: str = "") -> LLMConfig:
    """Resolve the active LLM provider, key source, and model from environment."""
    settings = get_settings()
    configured_provider = get_secret("LLM_PROVIDER", "").lower()
    anthropic_key = get_secret("ANTHROPIC_API_KEY")
    openrouter_key = get_secret("OPENROUTER_API_KEY")
    anthropic_model = get_secret("ANTHROPIC_MODEL", settings.default_anthropic_model)
    openrouter_model = get_secret("OPENROUTER_MODEL", settings.default_openrouter_model)
    openrouter_site_url = get_secret("OPENROUTER_SITE_URL")
    openrouter_app_name = get_secret("OPENROUTER_APP_NAME", "CyberCoach")
    second_model = get_secret("SECOND_MODEL", settings.default_second_model)
    live_voice_model = get_secret("LIVE_VOICE_MODEL", settings.default_live_voice_model)

    override = api_key_override.strip()
    if override:
        provider = configured_provider if configured_provider in {"anthropic", "openrouter"} else ""
        if not provider:
            provider = "openrouter" if override.startswith("sk-or-") else "anthropic"
        return LLMConfig(
            provider=provider,
            api_key=override,
            model=openrouter_model if provider == "openrouter" else anthropic_model,
            source="override",
            secret_name="",
            site_url=openrouter_site_url,
            app_name=openrouter_app_name,
            second_model=second_model,
            live_voice_model=live_voice_model,
        )

    if configured_provider == "openrouter" and openrouter_key:
        return LLMConfig(
            provider="openrouter",
            api_key=openrouter_key,
            model=openrouter_model,
            source="env",
            secret_name="OPENROUTER_API_KEY",
            site_url=openrouter_site_url,
            app_name=openrouter_app_name,
            second_model=second_model,
            live_voice_model=live_voice_model,
        )

    if configured_provider == "anthropic" and anthropic_key:
        return LLMConfig(
            provider="anthropic",
            api_key=anthropic_key,
            model=anthropic_model,
            source="env",
            secret_name="ANTHROPIC_API_KEY",
            site_url=openrouter_site_url,
            app_name=openrouter_app_name,
            second_model=second_model,
            live_voice_model=live_voice_model,
        )

    if anthropic_key:
        return LLMConfig(
            provider="anthropic",
            api_key=anthropic_key,
            model=anthropic_model,
            source="env",
            secret_name="ANTHROPIC_API_KEY",
            site_url=openrouter_site_url,
            app_name=openrouter_app_name,
            second_model=second_model,
            live_voice_model=live_voice_model,
        )

    if openrouter_key:
        return LLMConfig(
            provider="openrouter",
            api_key=openrouter_key,
            model=openrouter_model,
            source="env",
            secret_name="OPENROUTER_API_KEY",
            site_url=openrouter_site_url,
            app_name=openrouter_app_name,
            second_model=second_model,
            live_voice_model=live_voice_model,
        )

    return LLMConfig(
        provider=configured_provider if configured_provider in {"anthropic", "openrouter"} else "anthropic",
        api_key="",
        model=openrouter_model if configured_provider == "openrouter" else anthropic_model,
        source="none",
        secret_name="",
        site_url=openrouter_site_url,
        app_name=openrouter_app_name,
        second_model=second_model,
        live_voice_model=live_voice_model,
    )


def _openrouter_messages_create(payload: dict[str, Any], llm_config: LLMConfig) -> dict[str, Any]:
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {llm_config.api_key}",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    if llm_config.site_url:
        headers["HTTP-Referer"] = llm_config.site_url
    if llm_config.app_name:
        headers["X-Title"] = llm_config.app_name

    request = urllib.request.Request(
        settings.openrouter_messages_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore").strip()
        raise RuntimeError(f"OpenRouter request failed ({exc.code}): {detail[:400]}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenRouter request failed: {exc.reason}")


def create_claude_message(
    llm_config: LLMConfig,
    *,
    max_tokens: int,
    messages: list[dict[str, Any]],
    system: str | None = None,
) -> Any:
    payload: dict[str, Any] = {
        "model": llm_config.model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        payload["system"] = system

    if llm_config.provider == "openrouter":
        return _openrouter_messages_create(payload, llm_config)

    client = anthropic.Anthropic(api_key=llm_config.api_key)
    return client.messages.create(**payload)


def extract_response_text(response: Any) -> str:
    """Normalize Anthropic SDK and OpenRouter JSON responses into plain text."""
    content = response.get("content", []) if isinstance(response, dict) else getattr(response, "content", [])
    chunks: list[str] = []
    for item in content:
        if isinstance(item, dict):
            text = item.get("text")
        else:
            text = getattr(item, "text", None)
        if text:
            chunks.append(text)
    return "\n".join(chunks).strip()


def parse_model_json(raw: str) -> dict[str, Any]:
    """Parse model JSON defensively, handling fenced or prefixed responses."""
    cleaned = raw.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    if start != -1:
        decoder = json.JSONDecoder()
        try:
            parsed, _ = decoder.raw_decode(cleaned[start:])
            return parsed
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Unable to parse model JSON response", cleaned, 0)


def _coerce_string_list(value: Any, *, limit: int = 4) -> list[str]:
    if not isinstance(value, list):
        return []

    items: list[str] = []
    for item in value:
        text = str(item).strip()
        if text and text not in items:
            items.append(text)
        if len(items) >= limit:
            break
    return items


def _normalize_screenshot_signal(item: Any) -> dict[str, str] | None:
    if not isinstance(item, dict):
        return None

    signal_type = str(item.get("type") or "").strip()
    detail = str(item.get("detail") or "").strip()
    severity = str(item.get("severity") or "medium").strip().lower()

    if signal_type not in SCREENSHOT_VISUAL_SIGNAL_TYPES or not detail:
        return None
    if severity not in {"low", "medium", "high"}:
        severity = "medium"

    return {
        "type": signal_type,
        "detail": detail,
        "severity": severity,
    }


def _build_llm_prompt(text: str, heuristics: dict[str, Any], language: str = "English") -> tuple[str, str]:
    """Build the system prompt and user message for LLM analysis."""
    lang_instruction = ""
    if language != "English":
        lang_instruction = (
            f"\n- IMPORTANT: Write ALL reasons, actions, and explanation text in {language}. "
            f"The JSON keys and risk_level values must remain in English, but all human-readable "
            f"strings must be in {language}."
        )

    system_prompt = f"""You are CyberCoach's scam-review assistant. Review the provided message, link text, transcript, or document text for phishing, scam, or social-engineering warning signs.

You will also receive heuristic findings from a pre-scan. Use these as additional evidence.

Respond ONLY with valid JSON (no markdown, no backticks, no extra text). Schema:
{{
  "risk_level": "safe" | "suspicious" | "high_risk",
  "confidence": 0.0-1.0,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "actions": ["action 1", "action 2", "action 3"],
  "explanation": "A 1-2 sentence summary a non-technical person would understand"
}}

Rules:
- Use simple, jargon-free language a grandparent could understand
- Be specific about what triggered the risk assessment
- Actions should be concrete and immediately doable
- If uncertain, say so and suggest how to verify safely
- Sound calm, supportive, and practical instead of dramatic or technical
- Never help craft phishing or explain how to make scams more convincing{lang_instruction}"""

    heuristic_text = (
        "\n".join(f"- [{item['severity'].upper()}] {item['type']}: {item['detail']}" for item in heuristics["findings"])
        if heuristics["findings"]
        else "- No suspicious patterns detected by rule-based scan"
    )

    user_message = f"""Analyze this message for phishing/scam risk:

---MESSAGE START---
{text}
---MESSAGE END---

Heuristic pre-scan findings:
{heuristic_text}
Heuristic risk score: {heuristics['score']}"""

    return system_prompt, user_message


def call_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> dict[str, Any] | None:
    """Call the primary model for analysis."""
    result, _ = call_llm_with_error(text, heuristics, llm_config, language)
    return result


def call_llm_with_error(
    text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English"
) -> tuple[dict[str, Any] | None, str | None]:
    """Call the primary model for analysis and preserve the failure reason when it breaks."""
    system_prompt, user_message = _build_llm_prompt(text, heuristics, language)
    try:
        response = create_claude_message(
            llm_config,
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = extract_response_text(response)
        return parse_model_json(raw), None
    except Exception as exc:
        logger.warning("Primary LLM analysis unavailable: %s", exc)
        return None, str(exc)


def _openrouter_chat_create(payload: dict[str, Any], llm_config: LLMConfig) -> dict[str, Any]:
    """Call OpenRouter's /chat/completions endpoint for non-Anthropic models."""
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {llm_config.api_key}",
        "Content-Type": "application/json",
    }
    if llm_config.site_url:
        headers["HTTP-Referer"] = llm_config.site_url
    if llm_config.app_name:
        headers["X-Title"] = llm_config.app_name

    request = urllib.request.Request(
        settings.openrouter_chat_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore").strip()
        raise RuntimeError(f"OpenRouter chat request failed ({exc.code}): {detail[:400]}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenRouter chat request failed: {exc.reason}")


def extract_openrouter_chat_text(response: dict[str, Any]) -> str:
    """Normalize OpenRouter chat/completions responses into plain text."""
    choices = response.get("choices", [])
    if not choices:
        return ""

    message = choices[0].get("message", {})
    content = message.get("content", "")

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
        return "\n".join(chunks).strip()

    return ""


def call_second_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> dict[str, Any] | None:
    """Call the second model via OpenRouter chat/completions."""
    result, _ = call_second_llm_with_error(text, heuristics, llm_config, language)
    return result


def call_second_llm_with_error(
    text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English"
) -> tuple[dict[str, Any] | None, str | None]:
    """Call the second model and preserve the failure reason when it breaks."""
    return call_openrouter_chat_model_with_error(
        text,
        heuristics,
        llm_config,
        model_name=llm_config.second_model,
        language=language,
    )


def call_live_voice_llm_with_error(
    text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English"
) -> tuple[dict[str, Any] | None, str | None]:
    """Call the dedicated fast live-voice model and preserve the failure reason when it breaks."""
    return call_openrouter_chat_model_with_error(
        text,
        heuristics,
        llm_config,
        model_name=llm_config.live_voice_model,
        language=language,
    )


def call_openrouter_chat_model_with_error(
    text: str,
    heuristics: dict[str, Any],
    llm_config: LLMConfig,
    *,
    model_name: str,
    language: str = "English",
) -> tuple[dict[str, Any] | None, str | None]:
    """Call a specific OpenRouter chat/completions model and preserve the failure reason when it breaks."""
    system_prompt, user_message = _build_llm_prompt(text, heuristics, language)
    model_config = LLMConfig(
        provider="openrouter",
        api_key=llm_config.api_key,
        model=model_name,
        source=llm_config.source,
        secret_name=llm_config.secret_name,
        site_url=llm_config.site_url,
        app_name=llm_config.app_name,
        second_model=llm_config.second_model,
        live_voice_model=llm_config.live_voice_model,
    )
    payload = {
        "model": model_name,
        "max_tokens": 1000,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": SCAN_RESPONSE_JSON_SCHEMA,
        },
        "plugins": [{"id": "response-healing"}],
    }
    try:
        response = _openrouter_chat_create(payload, model_config)
        choices = response.get("choices", [])
        if not choices:
            return None, f"OpenRouter returned no choices for model {model_name}."
        raw = choices[0].get("message", {}).get("content", "")
        return parse_model_json(raw), None
    except Exception as exc:
        logger.warning("OpenRouter chat model unavailable (%s): %s", model_name, exc)
        return None, str(exc)


def call_dual_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Run both Claude and GPT-style analysis in parallel when using OpenRouter."""
    primary, secondary, _ = call_dual_llm_with_errors(text, heuristics, llm_config, language)
    return primary, secondary


def call_dual_llm_with_errors(
    text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English"
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, list[dict[str, str]]]:
    """Run both model calls in parallel and preserve per-model failures for diagnostics."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        claude_future = pool.submit(call_llm_with_error, text, heuristics, llm_config, language)
        gpt_future = pool.submit(call_second_llm_with_error, text, heuristics, llm_config, language)
        claude_result, claude_error = claude_future.result()
        gpt_result, gpt_error = gpt_future.result()
        errors = [
            error
            for error in (
                {"slot": "primary", "model": llm_config.model, "error": claude_error} if claude_error else None,
                {"slot": "secondary", "model": llm_config.second_model, "error": gpt_error} if gpt_error else None,
            )
            if error
        ]
        return claude_result, gpt_result, errors


RISK_ORDER = {"safe": 0, "suspicious": 1, "high_risk": 2}


def _dedupe_items(items: list[str], *, limit: int = 3) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for item in items:
        normalized = item.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
        if len(deduped) >= limit:
            break
    return deduped


def _normalized_model_result(result: dict[str, Any] | None, *, model_name: str, slot: str) -> dict[str, Any] | None:
    if not result:
        return None

    risk_level = str(result.get("risk_level", "safe")).strip().lower()
    if risk_level not in RISK_ORDER:
        risk_level = "suspicious"

    confidence = result.get("confidence")
    try:
        confidence_value = float(confidence) if confidence is not None else None
    except (TypeError, ValueError):
        confidence_value = None

    return {
        "slot": slot,
        "model": model_name,
        "risk_level": risk_level,
        "confidence": confidence_value,
        "reasons": _dedupe_items(list(result.get("reasons") or []), limit=3),
        "actions": _dedupe_items(list(result.get("actions") or []), limit=3),
        "explanation": str(result.get("explanation") or "").strip(),
    }


def _single_model_result(model_run: dict[str, Any], *, status: str, summary: str) -> dict[str, Any]:
    return {
        "risk_level": model_run["risk_level"],
        "confidence": model_run["confidence"],
        "reasons": model_run["reasons"],
        "actions": model_run["actions"],
        "explanation": model_run["explanation"] or summary,
        "ai_available": True,
        "decision_source": "single_model",
        "consensus": {
            "status": status,
            "summary": summary,
            "models_compared": 1,
            "agree": True,
            "strategy": "single_model",
        },
        "model_runs": [model_run],
    }


def build_consensus_result(
    primary_result: dict[str, Any] | None,
    secondary_result: dict[str, Any] | None,
    heuristics: dict[str, Any],
    llm_config: LLMConfig,
    language: str = "English",
    scan_type: str = "message",
) -> dict[str, Any]:
    copy = _consensus_copy(language)
    primary = _normalized_model_result(primary_result, model_name=llm_config.model, slot="primary")
    secondary = _normalized_model_result(secondary_result, model_name=llm_config.second_model, slot="secondary")
    model_runs = [item for item in (primary, secondary) if item]

    if not model_runs:
        return build_fallback_result(heuristics, [], language, scan_type)

    if len(model_runs) == 1:
        only = model_runs[0]
        summary = copy["single_model"]
        return _single_model_result(only, status="single_model", summary=summary)

    highest_level = max(RISK_ORDER[item["risk_level"]] for item in model_runs)
    agreement = len({item["risk_level"] for item in model_runs}) == 1
    heuristic_score = int(heuristics.get("score", 0))
    heuristic_findings = heuristics.get("findings", [])
    strong_heuristic_types = {
        "phishtank_match",
        "official_entity_impersonation",
        "subdomain_impersonation",
        "homoglyph",
        "credential_ask",
        "legal_threat",
        "voice_family_emergency",
        "voice_bank_impersonation",
        "voice_government_impersonation",
        "voice_payment_request",
        "voice_otp_request",
    }
    strong_heuristic_signal = any(
        item.get("type") in strong_heuristic_types and item.get("severity") == "high" for item in heuristic_findings
    )
    heuristic_override = False

    if agreement:
        final_level = model_runs[0]["risk_level"]
        summary = copy["agree"]
        confidence_values = [item["confidence"] for item in model_runs if item["confidence"] is not None]
        confidence = round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else None
        if final_level == "safe" and (heuristic_score >= 6 or strong_heuristic_signal):
            heuristic_override = True
            final_level = "high_risk" if heuristic_score >= 9 else "suspicious"
            summary = copy["override"]
            if confidence is not None:
                confidence = min(confidence, 0.55)
    else:
        if highest_level == RISK_ORDER["high_risk"] and heuristic_score >= 3:
            final_level = "high_risk"
        else:
            final_level = "suspicious"
        summary = copy["disagree"]
        confidence = min((item["confidence"] for item in model_runs if item["confidence"] is not None), default=None)
        if confidence is not None:
            confidence = min(confidence, 0.64)

    combined_reasons = _dedupe_items([reason for item in model_runs for reason in item["reasons"]], limit=4)
    combined_actions = _dedupe_items([action for item in model_runs for action in item["actions"]], limit=4)
    explanations = [item["explanation"] for item in model_runs if item["explanation"]]

    if agreement:
        explanation = explanations[0] if explanations else copy["agree_explanation"]
    else:
        disagreement_reason = copy["disagreement_reason"]
        combined_reasons = _dedupe_items([disagreement_reason, *combined_reasons], limit=4)
        explanation = f"{summary} {explanations[0] if explanations else ''}".strip()
    if heuristic_override:
        combined_reasons = _dedupe_items(
            [copy["override_reason"], *combined_reasons],
            limit=4,
        )
        explanation = f"{summary} {explanation}".strip()

    return {
        "risk_level": final_level,
        "confidence": confidence,
        "reasons": combined_reasons,
        "actions": combined_actions,
        "explanation": explanation or summary,
        "ai_available": True,
        "decision_source": "consensus_heuristic_override" if heuristic_override else "consensus" if agreement else "consensus_disagreement",
        "consensus": {
            "status": "agree" if agreement else "disagree",
            "summary": summary,
            "models_compared": len(model_runs),
            "agree": agreement,
            "strategy": "conservative_merge",
        },
        "model_runs": model_runs,
    }


def extract_text_with_vision(image_bytes: bytes, llm_config: LLMConfig, media_type: str = "image/png") -> str | None:
    """Use Claude-compatible vision extraction for screenshot OCR."""
    try:
        encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
        response = create_claude_message(
            llm_config,
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": encoded},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract ALL text visible in this image exactly as written. "
                                "Include sender info, subject lines, URLs, button text, and "
                                "message body. Return only the extracted text, nothing else."
                            ),
                        },
                    ],
                }
            ],
        )
        return extract_response_text(response)
    except Exception as exc:
        logger.warning("Image text extraction failed: %s", exc)
        return None


def inspect_screenshot_with_vision(
    image_bytes: bytes,
    llm_config: LLMConfig,
    media_type: str = "image/png",
    language: str = "English",
) -> dict[str, Any] | None:
    """Extract OCR text plus high-level screenshot cues using the primary vision-capable model."""
    try:
        encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
        response = create_claude_message(
            llm_config,
            max_tokens=2200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": encoded},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Analyze this screenshot for OCR and high-level scam-related visual context. "
                                "Return ONLY valid JSON with this exact shape:\n"
                                "{\n"
                                '  "extracted_text": "all readable text exactly as written",\n'
                                '  "ocr_confidence": 0.0,\n'
                                '  "ocr_warnings": ["warning 1"],\n'
                                '  "layout_summary": "brief visual description",\n'
                                '  "visual_signals": [\n'
                                '    {"type": "mobile_message_ui", "detail": "localized detail", "severity": "low"}\n'
                                "  ]\n"
                                "}\n\n"
                                "Rules:\n"
                                "- extracted_text must contain the readable text from the screenshot only.\n"
                                "- ocr_confidence measures legibility and extraction quality only, not scam risk.\n"
                                "- ocr_warnings should mention blur, glare, cropping, partial visibility, or unreadable text when relevant.\n"
                                "- layout_summary and visual_signals detail text must be written in "
                                f"{language}.\n"
                                "- visual_signals detail must be plain-language and explain what is visible and why it matters.\n"
                                "- visual_signals types must be chosen only from: "
                                f"{', '.join(SCREENSHOT_VISUAL_SIGNAL_TYPES)}.\n"
                                "- Use 0 to 6 visual_signals.\n"
                                "- If no notable visual cues exist, return an empty visual_signals array.\n"
                                "- Do not include markdown, explanations, or extra keys."
                            ),
                        },
                    ],
                }
            ],
        )
        parsed = parse_model_json(extract_response_text(response))
    except Exception as exc:
        logger.warning("Structured screenshot inspection failed: %s", exc)
        return None

    extracted_text = str(parsed.get("extracted_text") or "").strip()
    try:
        ocr_confidence = float(parsed.get("ocr_confidence"))
    except (TypeError, ValueError):
        ocr_confidence = None
    if ocr_confidence is not None:
        ocr_confidence = max(0.0, min(1.0, ocr_confidence))

    visual_signals = [
        normalized
        for item in parsed.get("visual_signals", [])
        if (normalized := _normalize_screenshot_signal(item)) is not None
    ]

    return {
        "extracted_text": extracted_text,
        "ocr_confidence": ocr_confidence,
        "ocr_warnings": _coerce_string_list(parsed.get("ocr_warnings"), limit=4),
        "layout_summary": str(parsed.get("layout_summary") or "").strip(),
        "visual_signals": visual_signals,
    }


FALLBACK_TRANSLATIONS = fallback_translations()

CONSENSUS_TRANSLATIONS: dict[str, dict[str, str]] = {
    "English": {
        "single_model": "Only one AI review was available, so CyberCoach used that result.",
        "agree": "Both AI reviews agreed on the final risk level.",
        "override": "Both AI reviews leaned safer, but CyberCoach raised the result because the local warning signs were too strong to ignore.",
        "disagree": "The AI reviews disagreed, so CyberCoach kept the more cautious result.",
        "agree_explanation": "Both AI reviews pointed to the same overall conclusion.",
        "disagreement_reason": "The AI reviews pointed in different directions, so CyberCoach stayed on the safer side.",
        "override_reason": "CyberCoach raised the result because the local warning signs were stronger than a safe verdict allowed.",
        "heuristic_fallback": "AI review was unavailable, so CyberCoach used local warning signs only.",
    },
    "Spanish": {
        "single_model": "Solo hubo una revision con IA disponible, asi que CyberCoach uso ese resultado.",
        "agree": "Las dos revisiones con IA coincidieron en el nivel final de riesgo.",
        "override": "Las dos revisiones con IA parecian mas tranquilas, pero CyberCoach elevo el resultado porque las senales locales eran demasiado fuertes para ignorarlas.",
        "disagree": "Las revisiones con IA no coincidieron, asi que CyberCoach mantuvo la evaluacion mas cautelosa.",
        "agree_explanation": "Las dos revisiones con IA apuntaron a la misma conclusion general.",
        "disagreement_reason": "Las revisiones con IA apuntaron en direcciones distintas, asi que CyberCoach se quedo con la opcion mas prudente.",
        "override_reason": "CyberCoach elevo el resultado porque las senales locales eran demasiado fuertes para mantener un veredicto seguro.",
        "heuristic_fallback": "La revision con IA no estuvo disponible, asi que CyberCoach uso solo las senales locales.",
    },
    "Chinese": {
        "single_model": "只有一个 AI 审查结果可用，因此 CyberCoach 采用了这份结果。",
        "agree": "两次 AI 审查对最终风险等级达成了一致。",
        "override": "两次 AI 审查原本更偏向安全，但本地警示信号太强，CyberCoach 因此提高了结果等级。",
        "disagree": "两次 AI 审查意见不一致，因此 CyberCoach 采用了更谨慎的结果。",
        "agree_explanation": "两次 AI 审查都指向了相同的整体结论。",
        "disagreement_reason": "两次 AI 审查给出的方向不同，因此 CyberCoach 选择了更稳妥的一侧。",
        "override_reason": "本地警示信号过强，无法维持安全结论，因此 CyberCoach 提高了结果等级。",
        "heuristic_fallback": "AI 审查不可用，因此 CyberCoach 只使用了本地警示信号。",
    },
    "Vietnamese": {
        "single_model": "Chi co mot danh gia AI kha dung, nen CyberCoach da dung ket qua do.",
        "agree": "Ca hai danh gia AI deu dong y ve muc rui ro cuoi cung.",
        "override": "Ca hai danh gia AI co xu huong an toan hon, nhung CyberCoach van nang muc vi cac dau hieu cuc bo qua manh de bo qua.",
        "disagree": "Hai danh gia AI khong dong y, nen CyberCoach giu muc canh bao than trong hon.",
        "agree_explanation": "Ca hai danh gia AI deu dua den cung mot ket luan tong quat.",
        "disagreement_reason": "Hai danh gia AI khac nhau, nen CyberCoach chon huong than trong hon.",
        "override_reason": "CyberCoach nang muc vi cac dau hieu cuc bo qua manh de giu ket luan an toan.",
        "heuristic_fallback": "Khong co danh gia AI, nen CyberCoach chi dung cac dau hieu cuc bo.",
    },
    "Korean": {
        "single_model": "사용 가능한 AI 검토가 하나뿐이어서 CyberCoach는 그 결과를 사용했습니다.",
        "agree": "두 AI 검토가 최종 위험 수준에 동의했습니다.",
        "override": "두 AI 검토는 더 안전한 쪽이었지만, 로컬 경고 신호가 너무 강해 CyberCoach가 결과를 높였습니다.",
        "disagree": "두 AI 검토가 의견이 달라서 CyberCoach는 더 조심스러운 결과를 유지했습니다.",
        "agree_explanation": "두 AI 검토 모두 같은 전체 결론을 가리켰습니다.",
        "disagreement_reason": "두 AI 검토의 방향이 달라서 CyberCoach는 더 안전한 쪽을 선택했습니다.",
        "override_reason": "로컬 경고 신호가 너무 강해 안전 판정을 유지할 수 없어 CyberCoach가 결과를 높였습니다.",
        "heuristic_fallback": "AI 검토를 사용할 수 없어 CyberCoach가 로컬 경고 신호만 사용했습니다.",
    },
    "Tagalog": {
        "single_model": "Iisang AI review lang ang magagamit, kaya iyon ang ginamit ng CyberCoach.",
        "agree": "Nagkasundo ang dalawang AI review sa huling antas ng panganib.",
        "override": "Mas panatag ang dalawang AI review, pero tinaasan ng CyberCoach ang resulta dahil masyadong malakas ang mga lokal na babala para balewalain.",
        "disagree": "Hindi nagkasundo ang mga AI review, kaya pinili ng CyberCoach ang mas maingat na resulta.",
        "agree_explanation": "Parehong tumuro ang dalawang AI review sa iisang pangkalahatang konklusyon.",
        "disagreement_reason": "Magkaiba ang direksiyong itinuro ng mga AI review, kaya pinili ng CyberCoach ang mas ligtas na panig.",
        "override_reason": "Tinaasan ng CyberCoach ang resulta dahil masyadong malakas ang mga lokal na babala para manatiling ligtas ang hatol.",
        "heuristic_fallback": "Hindi available ang AI review, kaya lokal na mga babala lang ang ginamit ng CyberCoach.",
    },
    "French": {
        "single_model": "Une seule revue IA etait disponible, donc CyberCoach a utilise ce resultat.",
        "agree": "Les deux revues IA se sont accordees sur le niveau final de risque.",
        "override": "Les deux revues IA etaient plus rassurantes, mais CyberCoach a releve le resultat parce que les signaux locaux etaient trop forts pour etre ignores.",
        "disagree": "Les revues IA n'etaient pas d'accord, donc CyberCoach a retenu l'evaluation la plus prudente.",
        "agree_explanation": "Les deux revues IA pointaient vers la meme conclusion generale.",
        "disagreement_reason": "Les revues IA allaient dans des directions differentes, donc CyberCoach a choisi l'option la plus prudente.",
        "override_reason": "CyberCoach a releve le resultat parce que les signaux locaux etaient trop forts pour conserver un verdict rassurant.",
        "heuristic_fallback": "La revue IA n'etait pas disponible, donc CyberCoach a utilise uniquement les signaux locaux.",
    },
}

FALLBACK_LANGUAGE_OVERRIDES: dict[str, dict[str, Any]] = {
    "Spanish": {
        "safe_action_document": "No se detectaron senales fuertes de phishing en el documento, pero aun conviene verificar archivos inesperados antes de abrir enlaces o escanear codigos QR",
        "safe_explanation_document": "La revision del documento no encontro senales fuertes de phishing en el texto extraido, los enlaces ni los metadatos. Aun asi, conviene avanzar con cuidado si el archivo no era esperado.",
        "safe_action_voice": "La revision de la llamada no encontro una presion clara de estafa en el transcript capturado, pero aun conviene devolver la llamada usando un numero de confianza si el contacto fue inesperado",
        "safe_explanation_voice": "El transcript de la llamada no mostro una presion fuerte de estafa o suplantacion. Sigue atento y verifica al llamante por un canal de confianza si algo cambia.",
        "risky_actions_document": [
            "No hagas clic en enlaces, no escanees codigos QR y no inicies sesion desde este documento hasta confirmar quien lo envio",
            "Si el archivo dice venir de un servicio confiable, abre ese servicio directamente en tu navegador en lugar de usar el documento",
            "Envialo a tu equipo de TI, seguridad o fraude si fue inesperado o pide inicio de sesion, pago o firma",
        ],
        "risky_actions_voice": [
            "No envies dinero, no compartas codigos y no sigas en la llamada solo porque la voz suena urgente o familiar",
            "Cuelga y devuelve la llamada usando un numero que ya conozcas y en el que confies",
            "Pide ayuda a un familiar, cuidador, banco o equipo de fraude antes de actuar",
        ],
        "risky_explanation_document": "La revision del documento encontro varias senales de alerta relacionadas con phishing en el contenido, los enlaces o las acciones integradas. Trata este archivo como riesgoso hasta verificarlo por otra via.",
        "risky_explanation_voice": "La revision de la llamada encontro presion propia de una estafa, senales de suplantacion o solicitudes riesgosas. Trata al llamante como no verificado hasta colgar y confirmar la historia por un canal confiable.",
    },
    "Chinese": {
        "safe_action_document": "这份文件没有触发明显的文档钓鱼信号，但面对意外文件时，打开链接或扫描二维码前仍应先核实来源",
        "safe_explanation_document": "文档检查没有在提取文本、链接或元数据中发现强烈的钓鱼信号。如果这份文件来得突然，仍建议谨慎处理。",
        "safe_action_voice": "这次通话检查没有在已捕获的 transcript 中发现明显的诈骗压力，但如果来电不在预期内，仍建议通过你信任的号码回拨核实",
        "safe_explanation_voice": "通话 transcript 没有显示出强烈的诈骗或冒充压力。请继续留意，如果情况有变化，仍应通过可信渠道核实来电者身份。",
        "risky_actions_document": [
            "在确认发件人之前，不要点击文档里的链接、不要扫描二维码，也不要在文档引导下登录",
            "如果文件声称来自可信服务，请直接在浏览器里打开该服务，而不要使用文档中的入口",
            "如果文件来得突然，或要求登录、付款或签署，请转交给 IT、安全或反诈团队",
        ],
        "risky_actions_voice": [
            "不要因为对方语气急迫或声音熟悉就转账、提供验证码，或一直留在线上",
            "先挂断，再用你原本就信任的号码回拨核实",
            "在采取任何行动前，请先请家人、照护者、银行或反诈团队一起确认",
        ],
        "risky_explanation_document": "文档检查在文件内容、链接或内嵌操作中发现了多项可疑信号。在通过其他可信渠道核实前，请把这份文件视为有风险。",
        "risky_explanation_voice": "通话检查发现了诈骗式施压、冒充迹象或高风险请求。在挂断并通过可信渠道核实之前，请把这位来电者视为未验证状态。",
    },
    "Vietnamese": {
        "safe_action_document": "Khong thay dau hieu phishing manh trong tai lieu nay, nhung van nen xac minh tep bat ngo truoc khi mo lien ket hoac quet ma QR",
        "safe_explanation_document": "Danh gia tai lieu khong tim thay dau hieu phishing manh trong van ban, lien ket hay metadata da trich xuat. Neu tep den bat ngo, ban van nen can than.",
        "safe_action_voice": "Danh gia cuoc goi khong thay ap luc lua dao ro rang trong transcript da bat duoc, nhung neu cuoc goi bat ngo thi van nen goi lai qua so ban da tin tuong",
        "safe_explanation_voice": "Transcript cuoc goi khong cho thay ap luc lua dao hoac mao danh manh. Hay tiep tuc can than va xac minh nguoi goi qua kenh ban tin tuong neu co gi thay doi.",
        "risky_actions_document": [
            "Dung bam lien ket, quet QR, hoac dang nhap tu tai lieu nay cho den khi ban xac minh duoc nguoi gui",
            "Neu tep tuyen bo den tu mot dich vu dang tin, hay mo dich vu do truc tiep trong trinh duyet thay vi dung tai lieu nay",
            "Chuyen tep cho IT, bao mat, hoac doi chong gian lan neu no bat ngo hoac yeu cau dang nhap, thanh toan, hay ky xac nhan",
        ],
        "risky_actions_voice": [
            "Dung gui tien, chia se ma xac thuc, hoac tiep tuc giu may chi vi nguoi goi nghe gap gap hay quen thuoc",
            "Hay cat may va goi lai bang so ban da tin tuong san",
            "Nho nguoi than, nguoi cham soc, ngan hang, hoac doi chong lua dao cung xac minh truoc khi hanh dong",
        ],
        "risky_explanation_document": "Danh gia tai lieu da phat hien nhieu dau hieu dang lo trong noi dung, lien ket, hoac hanh dong nhung trong tep. Hay xem tep nay la rui ro cho den khi duoc xac minh doc lap.",
        "risky_explanation_voice": "Danh gia cuoc goi da phat hien ap luc theo kieu lua dao, dau hieu mao danh, hoac yeu cau nguy hiem. Hay xem nguoi goi nay la chua duoc xac minh cho den khi ban cat may va kiem tra lai qua kenh dang tin.",
    },
    "Korean": {
        "safe_action_document": "강한 문서 피싱 신호는 보이지 않았지만, 예상하지 못한 파일이라면 링크를 열거나 QR 코드를 스캔하기 전에 먼저 확인하는 편이 좋습니다",
        "safe_explanation_document": "문서 검토에서는 추출된 텍스트, 링크, 메타데이터에서 강한 피싱 신호가 보이지 않았습니다. 그래도 예상치 못한 파일이라면 조심스럽게 다루는 것이 좋습니다.",
        "safe_action_voice": "이번 통화 검토에서는 캡처된 transcript 안에서 강한 사기 압박이 보이지 않았지만, 예상치 못한 전화라면 믿을 수 있는 번호로 다시 전화해 확인하는 편이 좋습니다",
        "safe_explanation_voice": "통화 transcript 에서는 강한 사기성 압박이나 사칭 신호가 보이지 않았습니다. 그래도 상황이 달라지면 믿을 수 있는 경로로 다시 확인하세요.",
        "risky_actions_document": [
            "보낸 사람을 확인하기 전에는 이 문서의 링크를 누르거나 QR 코드를 스캔하거나 로그인하지 마세요",
            "신뢰할 수 있는 서비스에서 온 파일처럼 보여도, 문서 안의 경로 대신 브라우저에서 직접 그 서비스를 여세요",
            "예상치 못한 파일이거나 로그인, 결제, 서명을 요구한다면 IT, 보안 또는 금융사기 대응팀에 전달하세요",
        ],
        "risky_actions_voice": [
            "상대가 급하거나 익숙하게 들린다고 해서 송금하거나 코드나 비밀번호를 알려주거나 통화를 계속하지 마세요",
            "일단 끊고, 원래 알고 있던 신뢰할 수 있는 번호로 다시 전화해 확인하세요",
            "무엇이든 하기 전에 가족, 보호자, 은행 또는 사기 대응팀과 함께 확인하세요",
        ],
        "risky_explanation_document": "문서 검토에서 내용, 링크 또는 문서 안의 동작에서 여러 경고 신호가 발견됐습니다. 다른 신뢰할 수 있는 방법으로 확인되기 전까지는 이 파일을 위험하게 보세요.",
        "risky_explanation_voice": "통화 검토에서 사기성 압박, 사칭 신호 또는 위험한 요청이 발견됐습니다. 전화를 끊고 신뢰할 수 있는 경로로 확인하기 전까지는 이 발신자를 검증되지 않은 상태로 보세요.",
    },
    "Tagalog": {
        "safe_action_document": "Walang malalakas na senyales ng document phishing na nakita, pero mabuting i-verify pa rin ang hindi inaasahang file bago buksan ang mga link o mag-scan ng QR code",
        "safe_explanation_document": "Walang malalakas na phishing signal na nakita sa na-extract na teksto, mga link, o metadata ng dokumento. Kung hindi mo inaasahan ang file, mas mabuti pa ring maging maingat.",
        "safe_action_voice": "Walang malakas na scam pressure na nakita sa transcript ng tawag, pero kung hindi inaasahan ang tawag, mas mabuting tumawag pabalik gamit ang numerong pinagkakatiwalaan mo",
        "safe_explanation_voice": "Walang malakas na scam o pagpapanggap na nakita sa transcript ng tawag. Manatiling maingat at i-verify ang caller sa isang mapagkakatiwalaang channel kung may magbago.",
        "risky_actions_document": [
            "Huwag pindutin ang mga link, huwag mag-scan ng QR code, at huwag mag-sign in mula sa dokumentong ito hangga't hindi mo natitiyak kung sino ang nagpadala",
            "Kung mukhang galing ito sa isang pinagkakatiwalaang serbisyo, buksan ang serbisyong iyon nang direkta sa browser mo sa halip na sa dokumento",
            "I-forward ang file sa IT, security, o fraud team kung hindi ito inaasahan o humihingi ng login, bayad, o pirma",
        ],
        "risky_actions_voice": [
            "Huwag magpadala ng pera, huwag magbahagi ng code, at huwag manatili sa linya dahil lang pamilyar o nagmamadali ang boses",
            "Ibaba ang tawag at tumawag muli gamit ang numerong dati mo nang pinagkakatiwalaan",
            "Humingi muna ng tulong sa pamilya, tagapag-alaga, bangko, o fraud team bago kumilos",
        ],
        "risky_explanation_document": "Nakakita ang dokumento ng ilang malinaw na babala sa nilalaman, mga link, o mga naka-embed na action sa file. Ituring itong mapanganib hanggang ma-verify sa ibang mapagkakatiwalaang paraan.",
        "risky_explanation_voice": "Nakakita ang review ng tawag ng scam pressure, pagpapanggap, o mapanganib na kahilingan. Ituring na hindi pa beripikado ang caller hanggang sa ibaba mo ang tawag at ma-verify ang kwento sa mapagkakatiwalaang channel.",
    },
    "French": {
        "safe_action_document": "Aucun signal fort de phishing documentaire n'a ete detecte, mais il reste prudent de verifier un fichier inattendu avant d'ouvrir ses liens ou de scanner ses codes QR",
        "safe_explanation_document": "La revue du document n'a pas trouve de signal fort de phishing dans le texte extrait, les liens ou les metadonnees. Si ce fichier etait inattendu, il vaut mieux rester prudent.",
        "safe_action_voice": "La revue de l'appel n'a pas montre de forte pression d'arnaque dans le transcript capture, mais si l'appel etait inattendu il reste preferable de rappeler via un numero de confiance",
        "safe_explanation_voice": "Le transcript de l'appel n'a pas montre de forte pression d'arnaque ni de signe clair d'usurpation. Restez attentif et verifiez l'appelant par un canal de confiance si quelque chose change.",
        "risky_actions_document": [
            "Ne cliquez pas sur les liens, ne scannez pas les codes QR et ne vous connectez pas depuis ce document tant que l'expediteur n'est pas verifie",
            "Si le fichier pretend venir d'un service de confiance, ouvrez ce service directement dans votre navigateur plutot que via le document",
            "Transferez le fichier a votre equipe IT, securite ou fraude s'il etait inattendu ou s'il demande une connexion, un paiement ou une signature",
        ],
        "risky_actions_voice": [
            "N'envoyez pas d'argent, ne partagez pas de code et ne restez pas en ligne juste parce que la voix semble urgente ou familiere",
            "Raccrochez puis rappelez en utilisant un numero que vous connaissez deja et en qui vous avez confiance",
            "Demandez l'aide d'un proche, d'un aidant, de votre banque ou d'une equipe fraude avant d'agir",
        ],
        "risky_explanation_document": "La revue du document a releve plusieurs signes d'alerte dans le contenu, les liens ou les actions integrees. Traitez ce fichier comme risque tant qu'il n'a pas ete verifie par un autre canal de confiance.",
        "risky_explanation_voice": "La revue de l'appel a releve une pression typique d'arnaque, des signes d'usurpation ou des demandes risquees. Considerez cet appelant comme non verifie tant que vous n'avez pas raccroche et confirme l'histoire par un canal de confiance.",
    },
}


def _consensus_copy(language: str) -> dict[str, str]:
    return CONSENSUS_TRANSLATIONS.get(language, CONSENSUS_TRANSLATIONS["English"])


def _fallback_defaults_for_language(language: str) -> dict[str, Any]:
    return FALLBACK_LANGUAGE_OVERRIDES.get(language, {})
DEFAULT_FALLBACK_TRANSLATION = {
    "no_patterns": "No suspicious patterns detected",
    "safe_action": "This looks lower risk, but it is still smart to be careful with unexpected messages or unfamiliar senders",
    "safe_explanation": "CyberCoach did not find strong warning signs in this scan. It is still safest to verify anything unexpected before you act.",
    "safe_action_url": "No strong link warnings were triggered, but it is still worth checking why you received this link before opening it",
    "safe_action_document": (
        "No strong document-phishing signals were detected, but you should still verify unexpected files before opening embedded links or scanning QR codes"
    ),
    "safe_explanation_url": (
        "The link review did not find strong structural or destination warning signs. "
        "If the link was unexpected, it is still safer to open the official site directly."
    ),
    "safe_explanation_document": (
        "The document scan did not find strong phishing signals in the extracted text, links, or document metadata. "
        "Continue carefully if the file was unexpected."
    ),
    "safe_action_voice": (
        "The call review did not find strong scam pressure in the captured transcript, but you should still verify unexpected callers through a trusted callback"
    ),
    "safe_explanation_voice": (
        "The live call transcript did not show strong scam or impersonation pressure. Keep listening carefully and verify the caller through a number you already trust if anything changes."
    ),
    "risky_actions": [
        "Do not click any links in this message",
        "If it claims to be from a company, go to the official website yourself instead of using the message",
        "Report or delete the message if it arrived unexpectedly or pushed you to act quickly",
    ],
    "risky_actions_url": [
        "Do not open this link until you verify who sent it and why",
        "If it claims to be from a company or service, go to the official site yourself instead of using this URL",
        "Report or delete the link if it arrived unexpectedly or with pressure to act quickly",
    ],
    "risky_actions_document": [
        "Do not click links, scan QR codes, or sign in from this document until you verify who sent it",
        "If the file claims to come from a trusted service, open that service directly in your browser instead of using the document",
        "Forward the file to your IT, security, or fraud team if it was unexpected or asks for login, payment, or signature action",
    ],
    "risky_actions_voice": [
        "Do not send money, share codes, or stay on the line just because the caller sounds urgent or familiar",
        "Hang up and call the person or organization back using a phone number you already trust",
        "Bring in a caregiver, family member, bank, or local fraud team before taking any action from this call",
    ],
    "risky_explanation": "CyberCoach found several warning signs in this scan. Treat it carefully until you can verify it another way.",
    "risky_explanation_document": (
        "The document scan found multiple phishing-style warning signs in the file content, embedded actions, or destinations. Treat this attachment as risky until it is independently verified."
    ),
    "risky_explanation_voice": (
        "The live call review found scam-style pressure, impersonation cues, or risky requests. Treat this caller as unverified until you hang up and confirm the story through a trusted channel."
    ),
}


def build_fallback_result(
    heuristics: dict[str, Any],
    redactions: list[dict[str, str]],
    language: str = "English",
    scan_type: str = "message",
) -> dict[str, Any]:
    """Mirror the Streamlit fallback result when AI is unavailable."""
    translations = {
        **DEFAULT_FALLBACK_TRANSLATION,
        **_fallback_defaults_for_language(language),
        **(FALLBACK_TRANSLATIONS.get("English") or {}),
        **(FALLBACK_TRANSLATIONS.get(language) or {}),
    }
    score = heuristics["score"]
    if score >= 6:
        level = "high_risk"
    elif score >= 3:
        level = "suspicious"
    else:
        level = "safe"

    if heuristics["findings"]:
        reasons = [item["detail"] for item in heuristics["findings"][:3]]
    else:
        reasons = [translations["no_patterns"]]

    if level == "safe":
        if scan_type == "url":
            actions = [translations.get("safe_action_url", translations["safe_action"])]
            explanation = translations.get("safe_explanation_url", translations["safe_explanation"])
        elif scan_type == "document":
            actions = [translations.get("safe_action_document", translations["safe_action"])]
            explanation = translations.get("safe_explanation_document", translations["safe_explanation"])
        elif scan_type == "voice":
            actions = [translations.get("safe_action_voice", translations["safe_action"])]
            explanation = translations.get("safe_explanation_voice", translations["safe_explanation"])
        else:
            actions = [translations["safe_action"]]
            explanation = translations["safe_explanation"]
    else:
        if scan_type == "url":
            actions = translations.get("risky_actions_url", translations["risky_actions"])
            explanation = translations["risky_explanation"]
        elif scan_type == "document":
            actions = translations.get("risky_actions_document", translations["risky_actions"])
            explanation = translations.get("risky_explanation_document", translations["risky_explanation"])
        elif scan_type == "voice":
            actions = translations.get("risky_actions_voice", translations["risky_actions"])
            explanation = translations.get("risky_explanation_voice", translations["risky_explanation"])
        else:
            actions = translations["risky_actions"]
            explanation = translations["risky_explanation"]

    return {
        "risk_level": level,
        "confidence": None,
        "reasons": reasons,
        "actions": actions,
        "explanation": explanation,
        "redactions": redactions,
        "heuristic_findings": heuristics["findings"],
        "heuristic_score": heuristics["score"],
        "ai_available": False,
        "decision_source": "heuristic_fallback",
        "consensus": {
            "status": "heuristic_fallback",
            "summary": _consensus_copy(language)["heuristic_fallback"],
            "models_compared": 0,
            "agree": False,
            "strategy": "heuristic_only",
        },
        "model_runs": [],
    }
