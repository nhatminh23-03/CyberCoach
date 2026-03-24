from __future__ import annotations

from typing import Any

from .llm import extract_text_with_vision, resolve_llm_config


def extract_text_from_image(image_bytes: bytes, media_type: str = "image/png") -> tuple[str | None, dict[str, Any]]:
    """Extract visible text from a screenshot using the configured LLM provider."""
    llm_config = resolve_llm_config()
    if not llm_config.api_key:
        return None, {
            "media_type": media_type,
            "provider_used": None,
            "model": None,
            "ocr_available": False,
            "reason": "Screenshot analysis requires an Anthropic or OpenRouter API key.",
        }

    extracted_text = extract_text_with_vision(image_bytes, llm_config, media_type)
    return extracted_text, {
        "media_type": media_type,
        "provider_used": llm_config.provider,
        "model": llm_config.model,
        "ocr_available": extracted_text is not None,
    }
