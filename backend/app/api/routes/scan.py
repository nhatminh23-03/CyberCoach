from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect

from ..error_handling import build_safe_http_error, build_safe_websocket_error
from ...core.config import get_settings
from ...models.requests import MessageScanRequest, UrlScanRequest, VoiceSessionStartRequest, VoiceSessionUpdateRequest
from ...models.responses import ScanResponse, UrlPrecheckResponse
from ...services.heuristics import build_url_precheck, get_message_samples, get_random_real_phish_sample
from ...services.history import history_store, serialize_history_entries
from ...services.rate_limit import RateLimitExceeded, build_rate_limit_ws_error, rate_limit_http, rate_limiter
from ...services.analyzer import (
    analyze_document,
    analyze_message,
    analyze_voice_recording,
    analyze_screenshot,
    analyze_url,
    analyze_voice_session_update,
    finalize_voice_session,
    start_voice_session,
)
from ...services.llm import resolve_llm_config
from ...services.voice_media import voice_media_transcription_available


router = APIRouter(prefix="/scan", tags=["scan"])
settings = get_settings()
UPLOAD_READ_CHUNK_SIZE = 1024 * 1024


def _payload_too_large(detail: str) -> HTTPException:
    return HTTPException(status_code=413, detail=detail)


def _limit_label(limit_bytes: int) -> str:
    if limit_bytes >= 1024 * 1024:
        return f"{limit_bytes / (1024 * 1024):.0f} MB"
    if limit_bytes >= 1024:
        return f"{limit_bytes / 1024:.0f} KB"
    return f"{limit_bytes} bytes"


def _validate_text_limit(value: str, *, limit: int, field_name: str) -> None:
    if len(value) > limit:
        raise _payload_too_large(f"{field_name} exceeds the maximum allowed length of {limit} characters.")


async def _read_upload_limited(file: UploadFile, *, max_bytes: int, field_name: str) -> bytes:
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(UPLOAD_READ_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise _payload_too_large(f"{field_name} exceeds the maximum allowed size of {_limit_label(max_bytes)}.")
        chunks.append(chunk)

    return b"".join(chunks)


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
    if not history_store.is_enabled():
        raise HTTPException(status_code=404, detail="Scan history is disabled in this environment.")
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
        "scan_history_available": history_store.is_enabled(),
        "voice_live_browser_mode": True,
        "voice_live_streaming_available": True,
        "voice_recording_upload_available": True,
        "voice_recording_auto_transcription_available": voice_media_transcription_available(),
    }


@router.get("/url-precheck", response_model=UrlPrecheckResponse)
def url_precheck(request: Request, url: str = Query(..., min_length=1, max_length=settings.max_url_length)) -> UrlPrecheckResponse:
    """Return the URL metadata preview shown before full analysis."""
    rate_limit_http(request, "url_precheck")
    try:
        return UrlPrecheckResponse(**build_url_precheck(url))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise build_safe_http_error(
            operation="url_precheck",
            client_message="URL precheck is temporarily unavailable.",
            exc=exc,
        )


@router.post("/message", response_model=ScanResponse)
def scan_message(request: Request, payload: MessageScanRequest) -> ScanResponse:
    """Analyze pasted message text."""
    rate_limit_http(request, "text_scan")
    try:
        return analyze_message(payload.text, language=payload.language, privacy_mode=payload.privacy_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise build_safe_http_error(
            operation="scan_message",
            client_message="Message scan failed. Please try again.",
            exc=exc,
        )


@router.post("/url", response_model=ScanResponse)
def scan_url(request: Request, payload: UrlScanRequest) -> ScanResponse:
    """Analyze a suspicious URL."""
    rate_limit_http(request, "text_scan")
    try:
        return analyze_url(payload.url, language=payload.language, privacy_mode=payload.privacy_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise build_safe_http_error(
            operation="scan_url",
            client_message="URL scan failed. Please try again.",
            exc=exc,
        )


@router.post("/screenshot", response_model=ScanResponse)
async def scan_screenshot(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form("en"),
    privacy_mode: bool = Form(True),
    qr_payloads: str = Form("[]"),
    ocr_override_text: str = Form(""),
) -> ScanResponse:
    """Analyze an uploaded screenshot by extracting visible text first."""
    rate_limit_http(request, "upload_scan")
    try:
        _validate_text_limit(ocr_override_text, limit=settings.max_transcript_length, field_name="OCR override text")
        image_bytes = await _read_upload_limited(
            image,
            max_bytes=settings.max_screenshot_upload_bytes,
            field_name="Screenshot upload",
        )
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
    except HTTPException:
        raise
    except Exception as exc:
        raise build_safe_http_error(
            operation="scan_screenshot",
            client_message="Screenshot scan failed. Please try again.",
            exc=exc,
        )


@router.post("/document", response_model=ScanResponse)
async def scan_document(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("en"),
    privacy_mode: bool = Form(True),
) -> ScanResponse:
    """Analyze a suspicious document by extracting text, links, and document metadata first."""
    rate_limit_http(request, "upload_scan")
    try:
        file_bytes = await _read_upload_limited(
            file,
            max_bytes=settings.max_document_upload_bytes,
            field_name="Document upload",
        )
        if not file_bytes:
            raise ValueError("Uploaded document is empty.")
        return analyze_document(
            file_bytes,
            filename=file.filename or "uploaded-document",
            media_type=file.content_type or "application/octet-stream",
            language=language,
            privacy_mode=privacy_mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise build_safe_http_error(
            operation="scan_document",
            client_message="Document scan failed. Please try again.",
            exc=exc,
        )


@router.post("/voice/start")
def start_voice(request: Request, payload: VoiceSessionStartRequest) -> dict[str, object]:
    """Create an ephemeral live-call vishing session."""
    rate_limit_http(request, "voice_start")
    try:
        return start_voice_session(language=payload.language, privacy_mode=payload.privacy_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise build_safe_http_error(
            operation="voice_start",
            client_message="Live Call Guard could not start right now.",
            exc=exc,
        )


@router.post("/voice/update", response_model=ScanResponse)
def update_voice(request: Request, payload: VoiceSessionUpdateRequest) -> ScanResponse:
    """Analyze the current transcript snapshot for an in-progress call."""
    rate_limit_http(request, "voice_update")
    try:
        return analyze_voice_session_update(
            session_id=payload.session_id,
            transcript_text=payload.transcript_text,
            transcript_segments=[item.model_dump() for item in payload.transcript_segments],
            voice_signals=[item.model_dump() for item in payload.voice_signals],
            elapsed_seconds=payload.elapsed_seconds,
            allow_ai=payload.include_ai,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise build_safe_http_error(
            operation="voice_update",
            client_message="Live call analysis failed. Please try again.",
            exc=exc,
        )


@router.post("/voice/finalize", response_model=ScanResponse)
def finalize_voice(request: Request, payload: VoiceSessionUpdateRequest) -> ScanResponse:
    """Finalize a live-call review into a normal CyberCoach report payload."""
    rate_limit_http(request, "voice_finalize")
    try:
        return finalize_voice_session(
            session_id=payload.session_id,
            transcript_text=payload.transcript_text,
            transcript_segments=[item.model_dump() for item in payload.transcript_segments],
            voice_signals=[item.model_dump() for item in payload.voice_signals],
            elapsed_seconds=payload.elapsed_seconds,
            allow_ai=payload.include_ai,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise build_safe_http_error(
            operation="voice_finalize",
            client_message="Final call analysis failed. Please try again.",
            exc=exc,
        )


@router.post("/voice/upload", response_model=ScanResponse)
async def scan_voice_upload(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("en"),
    privacy_mode: bool = Form(True),
    transcript_override_text: str = Form(""),
) -> ScanResponse:
    """Analyze an uploaded voicemail or suspicious call recording."""
    rate_limit_http(request, "upload_scan")
    try:
        _validate_text_limit(
            transcript_override_text,
            limit=settings.max_transcript_length,
            field_name="Transcript override",
        )
        file_bytes = await _read_upload_limited(
            file,
            max_bytes=settings.max_voice_upload_bytes,
            field_name="Voice recording upload",
        )
        if not file_bytes:
            raise ValueError("Uploaded recording is empty.")
        return analyze_voice_recording(
            file_bytes,
            filename=file.filename or "uploaded-voicemail",
            media_type=file.content_type or "application/octet-stream",
            language=language,
            privacy_mode=privacy_mode,
            transcript_override=transcript_override_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise build_safe_http_error(
            operation="voice_upload",
            client_message="Voice recording scan failed. Please try again.",
            exc=exc,
        )


@router.websocket("/voice/ws")
async def voice_stream(websocket: WebSocket) -> None:
    """Stream rolling voice-session analysis over a websocket for lower-latency updates."""
    try:
        rate_limiter.enforce_websocket(websocket, "voice_ws_connect")
    except RateLimitExceeded as exc:
        await websocket.accept()
        await websocket.send_json(build_rate_limit_ws_error(detail=exc.detail, retry_after_seconds=exc.retry_after_seconds))
        await websocket.close(code=4408)
        return

    await websocket.accept()
    await websocket.send_json({"type": "ready"})

    try:
        while True:
            raw_message = await websocket.receive_json()
            if not isinstance(raw_message, dict):
                await websocket.send_json({"type": "error", "detail": "Voice stream messages must be JSON objects."})
                continue

            message_type = str(raw_message.get("type") or "update").strip().lower()
            request_id = raw_message.get("request_id")

            if message_type == "ping":
                await websocket.send_json({"type": "pong", "request_id": request_id})
                continue

            if message_type not in {"update", "finalize"}:
                await websocket.send_json(
                    {
                        "type": "error",
                        "detail": f'Unsupported voice stream message type "{message_type}".',
                        "request_id": request_id,
                    }
                )
                continue

            try:
                rate_limiter.enforce_websocket(websocket, "voice_ws_message")
            except RateLimitExceeded as exc:
                await websocket.send_json(
                    build_rate_limit_ws_error(
                        detail=exc.detail,
                        retry_after_seconds=exc.retry_after_seconds,
                        request_id=request_id,
                    )
                )
                continue

            try:
                payload = VoiceSessionUpdateRequest(
                    session_id=str(raw_message.get("session_id") or ""),
                    transcript_text=str(raw_message.get("transcript_text") or ""),
                    transcript_segments=list(raw_message.get("transcript_segments") or []),
                    voice_signals=list(raw_message.get("voice_signals") or []),
                    elapsed_seconds=int(raw_message.get("elapsed_seconds") or 0),
                    include_ai=bool(raw_message.get("include_ai", False)),
                )
            except Exception as exc:
                await websocket.send_json(
                    build_safe_websocket_error(
                        operation="voice_stream_payload_validation",
                        client_message="Invalid voice stream payload.",
                        exc=exc,
                        request_id=request_id,
                    )
                )
                continue

            try:
                result = (
                    finalize_voice_session(
                        session_id=payload.session_id,
                        transcript_text=payload.transcript_text,
                        transcript_segments=[item.model_dump() for item in payload.transcript_segments],
                        voice_signals=[item.model_dump() for item in payload.voice_signals],
                        elapsed_seconds=payload.elapsed_seconds,
                        allow_ai=bool(raw_message.get("include_ai", False)),
                    )
                    if message_type == "finalize"
                    else analyze_voice_session_update(
                        session_id=payload.session_id,
                        transcript_text=payload.transcript_text,
                        transcript_segments=[item.model_dump() for item in payload.transcript_segments],
                        voice_signals=[item.model_dump() for item in payload.voice_signals],
                        elapsed_seconds=payload.elapsed_seconds,
                        allow_ai=payload.include_ai,
                    )
                )
            except ValueError as exc:
                await websocket.send_json({"type": "error", "detail": str(exc), "request_id": request_id})
                continue
            except Exception as exc:
                await websocket.send_json(
                    build_safe_websocket_error(
                        operation="voice_stream_analysis",
                        client_message="Voice stream analysis failed. Please try again.",
                        exc=exc,
                        request_id=request_id,
                    )
                )
                continue

            await websocket.send_json(
                {
                    "type": "analysis",
                    "state": "final" if message_type == "finalize" else "live",
                    "request_id": request_id,
                    "result": result.model_dump(),
                }
            )

            if message_type == "finalize":
                await websocket.close()
                return
    except WebSocketDisconnect:
        return
