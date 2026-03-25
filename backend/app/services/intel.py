from __future__ import annotations

import json
import hashlib
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from functools import lru_cache
from html import unescape
from pathlib import Path
from typing import Any

from ..core.config import get_settings
from .history import history_store
from .service_data import load_remote_intel_sources


REMOTE_INTEL_SOURCES = load_remote_intel_sources()

REMOTE_FEED_CACHE_TTL_SECONDS = 1800
_remote_feed_cache: dict[str, Any] = {"expires_at": 0.0, "items": []}


def _intel_feed_path() -> Path:
    return get_settings().data_dir / "intel_feed.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _read_url(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "CyberCoach/0.1 (+https://localhost)"
        },
    )
    with urllib.request.urlopen(request, timeout=6) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def _rss_child_text(item: ET.Element, name: str) -> str:
    for child in item:
        if child.tag.split("}")[-1] == name:
            return (child.text or "").strip()
    return ""


def _parse_feed_date(value: str) -> str:
    if not value:
        return ""
    try:
        parsed = parsedate_to_datetime(value)
    except Exception:
        return value
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _build_remote_item(source: dict[str, str], item: ET.Element, fetched_at: str) -> dict[str, Any] | None:
    title = _rss_child_text(item, "title")
    link = _rss_child_text(item, "link")
    description = _strip_html(_rss_child_text(item, "description"))
    published_at = _parse_feed_date(_rss_child_text(item, "pubDate")) or fetched_at

    if not title or not link:
        return None

    copy = description or title
    normalized_title = title if title.startswith(source["title_prefix"]) else f'{source["title_prefix"]}: {title}'
    entry_id = f'{source["id"]}-{hashlib.sha1(link.encode("utf-8")).hexdigest()[:12]}'
    return {
        "id": entry_id,
        "title": normalized_title,
        "copy": copy[:280],
        "accent": source["accent"],
        "category": source["category"],
        "source": source["source"],
        "publisher": source["publisher"],
        "reference_url": link,
        "published_at": published_at,
        "last_verified_at": fetched_at,
    }


def fetch_remote_public_intel_feed(limit_per_source: int = 2) -> list[dict[str, Any]]:
    now = time.time()
    cached_items = _remote_feed_cache.get("items") or []
    if cached_items and now < float(_remote_feed_cache.get("expires_at") or 0.0):
        return list(cached_items)

    fetched_at = _utc_now_iso()
    items: list[dict[str, Any]] = []
    seen_links: set[str] = set()

    for source in REMOTE_INTEL_SOURCES:
        try:
            payload = _read_url(source["url"])
            root = ET.fromstring(payload)
        except (urllib.error.URLError, TimeoutError, ET.ParseError, ValueError):
            continue

        parsed_count = 0
        for rss_item in root.findall(".//item"):
            normalized = _build_remote_item(source, rss_item, fetched_at)
            if not normalized:
                continue
            reference_url = str(normalized.get("reference_url") or "")
            if reference_url in seen_links:
                continue
            seen_links.add(reference_url)
            items.append(normalized)
            parsed_count += 1
            if parsed_count >= limit_per_source:
                break

    if items:
        _remote_feed_cache["items"] = list(items)
        _remote_feed_cache["expires_at"] = now + REMOTE_FEED_CACHE_TTL_SECONDS
        return items

    return list(cached_items)


@lru_cache(maxsize=1)
def load_curated_intel_feed() -> list[dict[str, Any]]:
    """Load the curated intel feed from disk."""
    path = _intel_feed_path()
    if not path.exists():
        return []

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return []

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
                    "publisher": str(item.get("publisher") or "CyberCoach"),
                    "reference_url": str(item.get("reference_url")) if item.get("reference_url") else None,
                    "published_at": str(item.get("published_at") or ""),
                    "last_verified_at": str(item.get("last_verified_at") or item.get("published_at") or ""),
                }
            )
        if normalized:
            return normalized

    return []


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
        "publisher": "CyberCoach Session Monitor",
        "reference_url": None,
        "published_at": recent_entries[-1].created_at,
        "last_verified_at": recent_entries[-1].created_at,
    }


def get_intel_feed(limit: int = 6) -> list[dict[str, Any]]:
    """Return live session telemetry, official public feeds, and curated local intelligence."""
    items: list[dict[str, Any]] = []
    session_item = build_session_intel_item()
    if session_item:
        items.append(session_item)

    items.extend(fetch_remote_public_intel_feed())
    items.extend(load_curated_intel_feed())
    return items[:limit]
