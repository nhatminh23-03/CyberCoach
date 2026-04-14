from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .responses import ScanResponse
from ..core.config import get_settings


settings = get_settings()


class MessageScanRequest(BaseModel):
    """Request body for text or message analysis."""

    text: str = Field(..., min_length=1, max_length=settings.max_message_length)
    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class UrlScanRequest(BaseModel):
    """Request body for URL analysis."""

    url: str = Field(..., min_length=1, max_length=settings.max_url_length)
    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class VoiceSignalInput(BaseModel):
    """A normalized live-call signal supplied by the browser session."""

    type: str = Field(..., min_length=1, max_length=120)
    detail: str = Field(..., min_length=1, max_length=400)
    severity: Literal["high", "medium", "low"] = Field(default="low")


class VoiceTranscriptSegmentInput(BaseModel):
    """A single finalized transcript segment from the live browser listener."""

    text: str = Field(..., min_length=1, max_length=500)
    timestamp: str = Field(default="", max_length=80)


class VoiceSessionStartRequest(BaseModel):
    """Request body for creating an ephemeral live vishing session."""

    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class VoiceSessionUpdateRequest(BaseModel):
    """Request body for incremental or final live-call analysis."""

    session_id: str = Field(..., min_length=1, max_length=120)
    transcript_text: str = Field(default="", max_length=settings.max_transcript_length)
    transcript_segments: list[VoiceTranscriptSegmentInput] = Field(default_factory=list, max_length=200)
    voice_signals: list[VoiceSignalInput] = Field(default_factory=list, max_length=32)
    elapsed_seconds: int = Field(default=0, ge=0)
    include_ai: bool = Field(default=False)


class ReportRequest(BaseModel):
    """Request body for report generation."""

    result: ScanResponse
    format: Literal["txt", "md"] = Field(default="txt")

    @field_validator("result")
    @classmethod
    def validate_result_payload_size(cls, value: ScanResponse) -> ScanResponse:
        if len(value.model_dump_json().encode("utf-8")) > settings.max_report_payload_bytes:
            raise ValueError("Report source payload is too large.")
        return value
