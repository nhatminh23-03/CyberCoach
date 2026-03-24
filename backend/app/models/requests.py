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


class ReportRequest(BaseModel):
    """Request body for report generation."""

    result: ScanResponse
    format: Literal["txt", "md"] = Field(default="txt")
