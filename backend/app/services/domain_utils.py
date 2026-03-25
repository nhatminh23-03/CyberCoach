from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse

from .service_data import detection_rule_set


def normalize_url_input(url: str) -> str:
    stripped = url.strip()
    if stripped and not stripped.startswith(("http://", "https://")):
        stripped = "https://" + stripped
    return stripped


def get_domain(url: str) -> Optional[str]:
    try:
        hostname = urlparse(url).hostname
    except Exception:
        return None
    if not hostname:
        return None
    return hostname.lower().removeprefix("www.")


def get_registrable_domain(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None

    parts = domain.split(".")
    if len(parts) <= 2:
        return domain

    common_multi_part_suffixes = detection_rule_set("common_multi_part_suffixes")
    tail_two = ".".join(parts[-2:])
    tail_three = ".".join(parts[-3:])
    if tail_two in common_multi_part_suffixes and len(parts) >= 3:
        return tail_three
    return tail_two


def subdomain_part(domain: Optional[str]) -> str:
    registrable = get_registrable_domain(domain)
    if not domain or not registrable or domain == registrable:
        return ""
    return domain[: -(len(registrable) + 1)]


def domain_tokens(value: str) -> set[str]:
    return {token for token in re.split(r"[^a-z0-9]+", value.lower()) if token}


def domain_matches_official(domain: str, official_domains: list[str]) -> bool:
    return any(domain == official or domain.endswith("." + official) for official in official_domains)
