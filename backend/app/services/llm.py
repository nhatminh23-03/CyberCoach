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


logger = logging.getLogger(__name__)


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
Heuristic risk score: {heuristics['score']}/15"""

    return system_prompt, user_message


def call_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> dict[str, Any] | None:
    """Call the primary model for analysis."""
    system_prompt, user_message = _build_llm_prompt(text, heuristics, language)
    try:
        response = create_claude_message(
            llm_config,
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = extract_response_text(response)
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Primary LLM analysis unavailable: %s", exc)
        return None


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
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }
    try:
        response = _openrouter_chat_create(payload, second_config)
        choices = response.get("choices", [])
        if not choices:
            return None
        raw = choices[0].get("message", {}).get("content", "")
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Second-model analysis unavailable: %s", exc)
        return None


def call_dual_llm(text: str, heuristics: dict[str, Any], llm_config: LLMConfig, language: str = "English") -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Run both Claude and GPT-style analysis in parallel when using OpenRouter."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        claude_future = pool.submit(call_llm, text, heuristics, llm_config, language)
        gpt_future = pool.submit(call_second_llm, text, heuristics, llm_config, language)
        return claude_future.result(), gpt_future.result()


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


FALLBACK_TRANSLATIONS = {
    "English": {
        "no_patterns": "No suspicious patterns detected",
        "safe_action": "This appears safe, but stay cautious with unfamiliar senders",
        "safe_explanation": "Our pattern scan didn't find obvious red flags. Use your judgment.",
        "risky_actions": [
            "Do not click any links in this message",
            "If it claims to be from a company, go directly to their official website",
            "Report this message as spam/phishing",
        ],
        "risky_explanation": "Our pattern scan flagged multiple warning signs. Exercise caution.",
    },
    "Spanish": {
        "no_patterns": "No se detectaron patrones sospechosos",
        "safe_action": "Esto parece seguro, pero ten cuidado con remitentes desconocidos",
        "safe_explanation": "Nuestro escaneo no encontró señales de alerta obvias. Usa tu criterio.",
        "risky_actions": [
            "No hagas clic en ningún enlace de este mensaje",
            "Si dice ser de una empresa, ve directamente a su sitio web oficial",
            "Reporta este mensaje como spam/phishing",
        ],
        "risky_explanation": "Nuestro escaneo detectó múltiples señales de advertencia. Ten precaución.",
    },
    "Chinese": {
        "no_patterns": "未检测到可疑模式",
        "safe_action": "看起来是安全的，但对陌生发件人保持警惕",
        "safe_explanation": "我们的模式扫描未发现明显的危险信号。请自行判断。",
        "risky_actions": [
            "不要点击此消息中的任何链接",
            "如果它声称来自某公司，请直接访问该公司的官方网站",
            "将此消息举报为垃圾邮件/网络钓鱼",
        ],
        "risky_explanation": "我们的模式扫描标记了多个警告信号。请谨慎行事。",
    },
    "Vietnamese": {
        "no_patterns": "Không phát hiện mẫu đáng ngờ nào",
        "safe_action": "Có vẻ an toàn, nhưng hãy cẩn thận với người gửi không quen biết",
        "safe_explanation": "Quét mẫu không tìm thấy dấu hiệu nguy hiểm rõ ràng. Hãy tự đánh giá.",
        "risky_actions": [
            "Không nhấp vào bất kỳ liên kết nào trong tin nhắn này",
            "Nếu nó tuyên bố từ một công ty, hãy truy cập trực tiếp trang web chính thức",
            "Báo cáo tin nhắn này là spam/lừa đảo",
        ],
        "risky_explanation": "Quét mẫu đã phát hiện nhiều dấu hiệu cảnh báo. Hãy thận trọng.",
    },
    "Korean": {
        "no_patterns": "의심스러운 패턴이 감지되지 않았습니다",
        "safe_action": "안전해 보이지만 낯선 발신자에 주의하세요",
        "safe_explanation": "패턴 스캔에서 명백한 위험 신호를 발견하지 못했습니다. 판단에 따라 행동하세요.",
        "risky_actions": [
            "이 메시지의 링크를 클릭하지 마세요",
            "특정 회사에서 보낸 것이라고 주장하면 해당 회사의 공식 웹사이트로 직접 이동하세요",
            "이 메시지를 스팸/피싱으로 신고하세요",
        ],
        "risky_explanation": "패턴 스캔에서 여러 경고 신호가 감지되었습니다. 주의하세요.",
    },
    "Tagalog": {
        "no_patterns": "Walang nakitang kahina-hinalang pattern",
        "safe_action": "Mukhang ligtas ito, ngunit mag-ingat sa hindi kilalang nagpadala",
        "safe_explanation": "Walang nakitang halatang red flag ang aming scan. Gamitin ang iyong sariling pagpapasya.",
        "risky_actions": [
            "Huwag i-click ang anumang link sa mensaheng ito",
            "Kung sinasabi nitong galing sa isang kumpanya, pumunta direkta sa kanilang opisyal na website",
            "I-report ang mensaheng ito bilang spam/phishing",
        ],
        "risky_explanation": "Nakakita ang aming scan ng maraming babala. Mag-ingat.",
    },
    "French": {
        "no_patterns": "Aucun schéma suspect détecté",
        "safe_action": "Cela semble sûr, mais restez prudent avec les expéditeurs inconnus",
        "safe_explanation": "Notre analyse n'a pas trouvé de signaux d'alerte évidents. Fiez-vous à votre jugement.",
        "risky_actions": [
            "Ne cliquez sur aucun lien dans ce message",
            "S'il prétend provenir d'une entreprise, allez directement sur leur site officiel",
            "Signalez ce message comme spam/hameçonnage",
        ],
        "risky_explanation": "Notre analyse a détecté plusieurs signaux d'alerte. Soyez prudent.",
    },
}


def build_fallback_result(heuristics: dict[str, Any], redactions: list[dict[str, str]], language: str = "English") -> dict[str, Any]:
    """Mirror the Streamlit fallback result when AI is unavailable."""
    translations = FALLBACK_TRANSLATIONS.get(language, FALLBACK_TRANSLATIONS["English"])
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
        actions = [translations["safe_action"]]
        explanation = translations["safe_explanation"]
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
    }
