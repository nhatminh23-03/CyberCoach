from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .responses import ScanResponse


class MessageScanRequest(BaseModel):
    """Request body for text or message analysis."""

    text: str = Field(..., min_length=1)
    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class UrlScanRequest(BaseModel):
    """Request body for URL analysis."""

    url: str = Field(..., min_length=1)
    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class VoiceSignalInput(BaseModel):
    """A normalized live-call signal supplied by the browser session."""

    type: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)
    severity: Literal["high", "medium", "low"] = Field(default="low")


class VoiceTranscriptSegmentInput(BaseModel):
    """A single finalized transcript segment from the live browser listener."""

    text: str = Field(..., min_length=1)
    timestamp: str = Field(default="")


class VoiceSessionStartRequest(BaseModel):
    """Request body for creating an ephemeral live vishing session."""

    language: str = Field(default="en")
    privacy_mode: bool = Field(default=True)


class VoiceSessionUpdateRequest(BaseModel):
    """Request body for incremental or final live-call analysis."""

    session_id: str = Field(..., min_length=1)
    transcript_text: str = Field(default="")
    transcript_segments: list[VoiceTranscriptSegmentInput] = Field(default_factory=list)
    voice_signals: list[VoiceSignalInput] = Field(default_factory=list)
    elapsed_seconds: int = Field(default=0, ge=0)
    include_ai: bool = Field(default=False)


class ReportRequest(BaseModel):
    """Request body for report generation."""

    result: ScanResponse
    format: Literal["txt", "md"] = Field(default="txt")
