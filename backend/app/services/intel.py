from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..core.config import get_settings
from .history import history_store


CURATED_INTEL_FALLBACK = [
    {
        "id": "irs-refund-kit",
        "title": "Active Campaign",
        "copy": 'New "IRS-Refund" phishing kit detected in North American nodes.',
        "accent": "secondary",
        "category": "Campaign",
        "source": "curated",
        "published_at": "2026-03-24T08:00:00Z",
    },
    {
        "id": "linguistic-engine-update",
        "title": "System Update",
        "copy": "Linguistic engine updated to version 4.12 for better emoji-spoofing detection.",
        "accent": "outline",
        "category": "Engine",
        "source": "curated",
        "published_at": "2026-03-24T07:30:00Z",
    },
    {
        "id": "whatsapp-impersonation-alert",
        "title": "High Alert",
        "copy": "Surge in WhatsApp business account impersonation reported globally.",
        "accent": "secondary",
        "category": "Alert",
        "source": "curated",
        "published_at": "2026-03-24T06:45:00Z",
    },
]


def _intel_feed_path() -> Path:
    return get_settings().data_dir / "intel_feed.json"


@lru_cache(maxsize=1)
def load_curated_intel_feed() -> list[dict[str, Any]]:
    """Load the curated intel feed from disk with a safe in-code fallback."""
    path = _intel_feed_path()
    if not path.exists():
        return CURATED_INTEL_FALLBACK

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return CURATED_INTEL_FALLBACK

    if isinstance(data, list):
        normalized: list[dict[str, Any]] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            normalized.append(
                {
                    "id": str(item.get("id") or f"intel-{len(normalized) + 1}"),
                    "title": str(item.get("title") or "Intel Update"),
                    "copy": str(item.get("copy") or ""),
                    "accent": str(item.get("accent") or "outline"),
                    "category": str(item.get("category") or "Intel"),
                    "source": str(item.get("source") or "curated"),
                    "published_at": str(item.get("published_at") or ""),
                }
            )
        if normalized:
            return normalized

    return CURATED_INTEL_FALLBACK


def build_session_intel_item() -> dict[str, Any] | None:
    """Synthesize one live intel item from recent in-memory scan activity."""
    entries = history_store.list()
    if not entries:
        return None

    recent_entries = list(entries)[-12:]
    high_risk_count = 0
    suspicious_count = 0
    latest_pattern = None

    for entry in recent_entries:
        if entry.risk_label == "High Risk":
            high_risk_count += 1
        elif entry.risk_label == "Suspicious":
            suspicious_count += 1

        result = entry.result or {}
        latest_pattern = latest_pattern or result.get("likely_scam_pattern")

    if high_risk_count > 0:
        copy = (
            f"{high_risk_count} high-risk scan"
            f"{'' if high_risk_count == 1 else 's'} flagged in the current session."
        )
        if latest_pattern:
            copy += f" Most recent pattern: {latest_pattern}."
        accent = "secondary"
        title = "Live Session Alert"
    elif suspicious_count > 0:
        copy = (
            f"{suspicious_count} suspicious scan"
            f"{'' if suspicious_count == 1 else 's'} detected in the current session."
        )
        if latest_pattern:
            copy += f" Current dominant pattern: {latest_pattern}."
        accent = "outline"
        title = "Session Watch"
    else:
        copy = "Recent scans are trending low risk in the current session."
        accent = "outline"
        title = "Session Status"

    return {
        "id": "session-telemetry",
        "title": title,
        "copy": copy,
        "accent": accent,
        "category": "Live telemetry",
        "source": "session",
        "published_at": recent_entries[-1].created_at,
    }


def get_intel_feed(limit: int = 4) -> list[dict[str, Any]]:
    """Return a blended feed of live session telemetry plus curated intelligence updates."""
    items: list[dict[str, Any]] = []
    session_item = build_session_intel_item()
    if session_item:
        items.append(session_item)

    items.extend(load_curated_intel_feed())
    return items[:limit]
