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

    system_prompt = f"""You are a cybersecurity analysis engine. Analyze the provided message/email/text for phishing, scam, or social engineering indicators.

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


def call_second_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> dict[str, Any] | None:
    """Call the second model via OpenRouter chat/completions."""
    result, _ = call_second_llm_with_error(text, heuristics, llm_config, language)
    return result


def call_second_llm_with_error(
    text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English"
) -> tuple[dict[str, Any] | None, str | None]:
    """Call the second model and preserve the failure reason when it breaks."""
    system_prompt, user_message = _build_llm_prompt(text, heuristics, language)
    second_config = LLMConfig(
        provider="openrouter",
        api_key=llm_config.api_key,
        model=llm_config.second_model,
        source=llm_config.source,
        secret_name=llm_config.secret_name,
        site_url=llm_config.site_url,
        app_name=llm_config.app_name,
        second_model=llm_config.second_model,
    )
    payload = {
        "model": llm_config.second_model,
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
        response = _openrouter_chat_create(payload, second_config)
        choices = response.get("choices", [])
        if not choices:
            return None, "OpenRouter returned no choices for the second model."
        raw = choices[0].get("message", {}).get("content", "")
        return parse_model_json(raw), None
    except Exception as exc:
        logger.warning("Second-model analysis unavailable: %s", exc)
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
) -> dict[str, Any]:
    primary = _normalized_model_result(primary_result, model_name=llm_config.model, slot="primary")
    secondary = _normalized_model_result(secondary_result, model_name=llm_config.second_model, slot="secondary")
    model_runs = [item for item in (primary, secondary) if item]

    if not model_runs:
        return build_fallback_result(heuristics, [], language)

    if len(model_runs) == 1:
        only = model_runs[0]
        summary = f'Only one model response was available, so CyberCoach used the {only["model"]} assessment.'
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
    }
    strong_heuristic_signal = any(
        item.get("type") in strong_heuristic_types and item.get("severity") == "high" for item in heuristic_findings
    )
    heuristic_override = False

    if agreement:
        final_level = model_runs[0]["risk_level"]
        summary = "Both models agreed on the final risk level."
        confidence_values = [item["confidence"] for item in model_runs if item["confidence"] is not None]
        confidence = round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else None
        if final_level == "safe" and (heuristic_score >= 6 or strong_heuristic_signal):
            heuristic_override = True
            final_level = "high_risk" if heuristic_score >= 9 else "suspicious"
            summary = (
                "Both models leaned safer, but CyberCoach escalated the result because the local scam rules found "
                "strong evidence that should not be ignored."
            )
            if confidence is not None:
                confidence = min(confidence, 0.55)
    else:
        if highest_level == RISK_ORDER["high_risk"] and heuristic_score >= 3:
            final_level = "high_risk"
        else:
            final_level = "suspicious"
        summary = "The models disagreed, so CyberCoach used a conservative consensus and avoided a safe verdict."
        confidence = min((item["confidence"] for item in model_runs if item["confidence"] is not None), default=None)
        if confidence is not None:
            confidence = min(confidence, 0.64)

    combined_reasons = _dedupe_items([reason for item in model_runs for reason in item["reasons"]], limit=4)
    combined_actions = _dedupe_items([action for item in model_runs for action in item["actions"]], limit=4)
    explanations = [item["explanation"] for item in model_runs if item["explanation"]]

    if agreement:
        explanation = explanations[0] if explanations else "Both models agreed on the assessment."
    else:
        disagreement_reason = "The model opinions diverged, so the result was escalated for caution."
        combined_reasons = _dedupe_items([disagreement_reason, *combined_reasons], limit=4)
        explanation = f"{summary} {explanations[0] if explanations else ''}".strip()
    if heuristic_override:
        combined_reasons = _dedupe_items(
            ["Local scam rules detected strong warning signs, so the safe verdict was overridden.", *combined_reasons],
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
                                "- visual_signals types must be chosen only from: "
                                f"{', '.join(SCREENSHOT_VISUAL_SIGNAL_TYPES)}.\n"
                                "- Use 0 to 4 visual_signals.\n"
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
DEFAULT_FALLBACK_TRANSLATION = {
    "no_patterns": "No suspicious patterns detected",
    "safe_action": "This appears safe, but stay cautious with unfamiliar senders",
    "safe_explanation": "Our pattern scan didn't find obvious red flags. Use your judgment.",
    "safe_action_url": "No strong URL warnings were triggered, but verify why you received this link before opening it",
    "safe_explanation_url": (
        "The URL scan did not find obvious structural or destination red flags. "
        "It is still safer to open the official site directly if the link was unexpected."
    ),
    "risky_actions": [
        "Do not click any links in this message",
        "If it claims to be from a company, go directly to their official website",
        "Report this message as spam/phishing",
    ],
    "risky_actions_url": [
        "Do not open this link until you verify who sent it and why",
        "If it claims to be from a company or service, go to the official site yourself instead of using this URL",
        "Report or delete the link if it arrived unexpectedly or with pressure to act quickly",
    ],
    "risky_explanation": "Our pattern scan flagged multiple warning signs. Exercise caution.",
}


def build_fallback_result(
    heuristics: dict[str, Any],
    redactions: list[dict[str, str]],
    language: str = "English",
    scan_type: str = "message",
) -> dict[str, Any]:
    """Mirror the Streamlit fallback result when AI is unavailable."""
    translations = (
        FALLBACK_TRANSLATIONS.get(language)
        or FALLBACK_TRANSLATIONS.get("English")
        or DEFAULT_FALLBACK_TRANSLATION
    )
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
        else:
            actions = [translations["safe_action"]]
            explanation = translations["safe_explanation"]
    else:
        actions = translations.get("risky_actions_url", translations["risky_actions"]) if scan_type == "url" else translations["risky_actions"]
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
            "summary": "AI analysis was unavailable, so CyberCoach used heuristics-only scoring.",
            "models_compared": 0,
            "agree": False,
            "strategy": "heuristic_only",
        },
        "model_runs": [],
    }
