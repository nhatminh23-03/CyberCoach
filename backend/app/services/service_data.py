from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from ..core.config import get_settings


def _load_json_file(filename: str, expected_type: type[Any], default: Any) -> Any:
    path = get_settings().data_dir / filename
    if not path.exists():
        return default

    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:
        return default

    return payload if isinstance(payload, expected_type) else default


@lru_cache(maxsize=1)
def load_detection_rules() -> dict[str, Any]:
    return _load_json_file("detection_rules.json", dict, {})


@lru_cache(maxsize=1)
def load_scan_localization() -> dict[str, Any]:
    return _load_json_file("scan_localization.json", dict, {})


@lru_cache(maxsize=1)
def load_remote_intel_sources() -> list[dict[str, str]]:
    payload = _load_json_file("intel_sources.json", list, [])
    normalized: list[dict[str, str]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        normalized.append({str(key): str(value) for key, value in item.items() if value is not None})
    return normalized


def detection_rule_list(key: str) -> list[str]:
    value = load_detection_rules().get(key, [])
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def detection_rule_set(key: str) -> set[str]:
    return set(detection_rule_list(key))


def detection_rule_map(key: str) -> dict[str, str]:
    value = load_detection_rules().get(key, {})
    if not isinstance(value, dict):
        return {}
    return {
        str(map_key).strip(): str(map_value).strip()
        for map_key, map_value in value.items()
        if str(map_key).strip() and str(map_value).strip()
    }


def official_entities() -> list[dict[str, Any]]:
    value = load_detection_rules().get("official_entities", [])
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        keywords = [str(keyword).strip().lower() for keyword in item.get("keywords", []) if str(keyword).strip()]
        official_domains = [
            str(domain).strip().lower()
            for domain in item.get("official_domains", [])
            if str(domain).strip()
        ]
        if not name or not keywords or not official_domains:
            continue
        normalized.append(
            {
                "name": name,
                "keywords": keywords,
                "official_domains": official_domains,
            }
        )
    return normalized


def message_samples() -> dict[str, dict[str, str]]:
    value = load_detection_rules().get("message_samples", {})
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, dict[str, str]] = {}
    for sample_id, sample in value.items():
        if not isinstance(sample, dict):
            continue
        resolved_id = str(sample.get("id") or sample_id).strip()
        label = str(sample.get("label") or "").strip()
        text = str(sample.get("text") or "").strip()
        if not resolved_id or not label or not text:
            continue
        normalized[resolved_id] = {
            "id": resolved_id,
            "label": label,
            "text": text,
        }
    return normalized


def language_map() -> dict[str, str]:
    value = load_scan_localization().get("language_map", {})
    if not isinstance(value, dict):
        return {}
    return {
        str(code).strip().lower(): str(name).strip()
        for code, name in value.items()
        if str(code).strip() and str(name).strip()
    }


def risk_labels() -> dict[str, str]:
    value = load_scan_localization().get("risk_labels", {})
    if not isinstance(value, dict):
        return {}
    return {
        str(level).strip().lower(): str(label).strip()
        for level, label in value.items()
        if str(level).strip() and str(label).strip()
    }


def report_translations() -> dict[str, dict[str, str]]:
    value = load_scan_localization().get("report_translations", {})
    if not isinstance(value, dict):
        return {}
    return value


def fallback_translations() -> dict[str, dict[str, Any]]:
    value = load_scan_localization().get("fallback_translations", {})
    if not isinstance(value, dict):
        return {}
    return value
