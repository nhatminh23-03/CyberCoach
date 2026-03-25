from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from ...models.requests import MessageScanRequest, UrlScanRequest
from ...models.responses import ScanResponse, UrlPrecheckResponse
from ...services.heuristics import build_url_precheck, get_message_samples, get_random_real_phish_sample
from ...services.history import serialize_history_entries
from ...services.analyzer import analyze_message, analyze_screenshot, analyze_url
from ...services.llm import resolve_llm_config


router = APIRouter(prefix="/scan", tags=["scan"])


@router.get("/message-samples")
def message_samples() -> dict[str, object]:
    """Return message demo presets plus one random real phishing example when available."""
    return {
        "presets": get_message_samples(),
        "random_real_phish": get_random_real_phish_sample(),
    }


@router.get("/history")
def scan_history() -> dict[str, object]:
    """Return in-memory scan history entries, newest first."""
    return {"items": serialize_history_entries()}


@router.get("/capabilities")
def scan_capabilities() -> dict[str, object]:
    """Expose frontend-relevant scan capability flags."""
    llm_config = resolve_llm_config()
    return {
        "screenshot_analysis_available": bool(llm_config.api_key),
        "screenshot_requires_api_key": True,
        "llm_provider": llm_config.provider if llm_config.api_key else None,
        "llm_model": llm_config.model if llm_config.api_key else None,
    }


@router.get("/url-precheck", response_model=UrlPrecheckResponse)
def url_precheck(url: str = Query(..., min_length=1)) -> UrlPrecheckResponse:
    """Return the URL metadata preview shown before full analysis."""
    try:
        return UrlPrecheckResponse(**build_url_precheck(url))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"URL precheck failed: {exc}")


@router.post("/message", response_model=ScanResponse)
def scan_message(payload: MessageScanRequest) -> ScanResponse:
    """Analyze pasted message text."""
    try:
        return analyze_message(payload.text, language=payload.language, privacy_mode=payload.privacy_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Message scan failed: {exc}")


@router.post("/url", response_model=ScanResponse)
def scan_url(payload: UrlScanRequest) -> ScanResponse:
    """Analyze a suspicious URL."""
    try:
        return analyze_url(payload.url, language=payload.language, privacy_mode=payload.privacy_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"URL scan failed: {exc}")


@router.post("/screenshot", response_model=ScanResponse)
async def scan_screenshot(
    image: UploadFile = File(...),
    language: str = Form("en"),
    privacy_mode: bool = Form(True),
    qr_payloads: str = Form("[]"),
    ocr_override_text: str = Form(""),
) -> ScanResponse:
    """Analyze an uploaded screenshot by extracting visible text first."""
    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise ValueError("Uploaded image is empty.")
        media_type = image.content_type or "image/png"
        parsed_qr_payloads = json.loads(qr_payloads) if qr_payloads else []
        if not isinstance(parsed_qr_payloads, list):
            raise ValueError("QR payloads must be a JSON array.")
        cleaned_qr_payloads = [str(item).strip() for item in parsed_qr_payloads if str(item).strip()]
        return analyze_screenshot(
            image_bytes,
            media_type=media_type,
            language=language,
            privacy_mode=privacy_mode,
            qr_payloads=cleaned_qr_payloads,
            ocr_override_text=ocr_override_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Screenshot scan failed: {exc}")
