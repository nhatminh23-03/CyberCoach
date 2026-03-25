from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ScanResponse(BaseModel):
    """Unified response schema shared across all scan types."""

    scan_type: Literal["message", "url", "screenshot"]
    risk_label: Literal["Safe", "Suspicious", "High Risk"]
    risk_score: int = Field(default=0, ge=0)
    confidence: Literal["Low", "Medium", "High"]
    likely_scam_pattern: str
    summary: str
    top_reasons: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    signals: List[str] = Field(default_factory=list)
    original_input: str
    redacted_input: Optional[str] = None
    provider_used: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    """Health response for the backend service."""

    status: str
    service: str
    version: str
    datasets: Dict[str, int] = Field(default_factory=dict)


class IntelItemResponse(BaseModel):
    """Single intelligence feed entry for the scan sidebar."""

    id: str
    title: str
    copy: str
    accent: Literal["secondary", "outline"] = "outline"
    category: str = "Intel"
    source: str = "curated"
    publisher: str = "CyberCoach"
    reference_url: Optional[str] = None
    published_at: str = ""
    last_verified_at: str = ""


class IntelFeedResponse(BaseModel):
    """Collection of intelligence feed entries."""

    items: List[IntelItemResponse] = Field(default_factory=list)


class UrlPrecheckResponse(BaseModel):
    """Parsed URL metadata plus instant PhishTank lookup status."""

    normalized_url: str
    domain: str
    registrable_domain: str
    tld: str
    subdomain_count: int = Field(default=0, ge=0)
    is_raw_ip: bool = False
    is_shortened: bool = False
    phishtank_loaded: bool = False
    phishtank_hit: bool = False
    phishtank_count: int = Field(default=0, ge=0)
