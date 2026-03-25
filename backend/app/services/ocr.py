from __future__ import annotations

from typing import Any

from .llm import extract_text_with_vision, inspect_screenshot_with_vision, resolve_llm_config


def _quality_band(confidence: float | None) -> str | None:
    if confidence is None:
        return None
    if confidence >= 0.8:
        return "high"
    if confidence >= 0.5:
        return "medium"
    return "low"


def extract_text_from_image(
    image_bytes: bytes,
    media_type: str = "image/png",
    language: str = "English",
) -> tuple[str | None, dict[str, Any]]:
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

    inspection = inspect_screenshot_with_vision(image_bytes, llm_config, media_type, language)
    extracted_text = None
    ocr_confidence = None
    ocr_warnings: list[str] = []
    layout_summary = ""
    visual_signals: list[dict[str, Any]] = []

    if inspection:
        extracted_text = str(inspection.get("extracted_text") or "").strip() or None
        confidence = inspection.get("ocr_confidence")
        ocr_confidence = confidence if isinstance(confidence, (int, float)) else None
        ocr_warnings = [str(item).strip() for item in inspection.get("ocr_warnings", []) if str(item).strip()]
        layout_summary = str(inspection.get("layout_summary") or "").strip()
        visual_signals = [item for item in inspection.get("visual_signals", []) if isinstance(item, dict)]

    if not extracted_text:
        extracted_text = extract_text_with_vision(image_bytes, llm_config, media_type)

    return extracted_text, {
        "media_type": media_type,
        "provider_used": llm_config.provider,
        "model": llm_config.model,
        "ocr_available": extracted_text is not None,
        "extracted_text": extracted_text or "",
        "ocr_confidence": ocr_confidence,
        "ocr_quality": _quality_band(ocr_confidence),
        "ocr_warnings": ocr_warnings,
        "layout_summary": layout_summary,
        "visual_signals": visual_signals,
    }
