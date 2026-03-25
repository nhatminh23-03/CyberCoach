from __future__ import annotations

import ipaddress
import re
import socket
import urllib.error
import urllib.request
from html import unescape
from typing import Any
from urllib.parse import urljoin, urlparse

from .domain_utils import (
    get_domain as _get_domain,
    get_registrable_domain as _get_registrable_domain,
    normalize_url_input as _normalize_url,
)
from .service_data import detection_rule_list


FETCH_TIMEOUT_SECONDS = 6
MAX_REDIRECTS = 5
MAX_READ_BYTES = 160_000
LOGIN_KEYWORDS = tuple(detection_rule_list("login_keywords"))
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
FORM_RE = re.compile(r"<form\b", re.IGNORECASE)
PASSWORD_RE = re.compile(r"<input[^>]+type=[\"']?password", re.IGNORECASE)
FORM_ACTION_RE = re.compile(r"<form[^>]+action=[\"']([^\"']+)[\"']", re.IGNORECASE)
META_REFRESH_RE = re.compile(
    r"<meta[^>]+http-equiv=[\"']?refresh[\"']?[^>]+content=[\"'][^\"'>]*url=([^\"'>]+)",
    re.IGNORECASE,
)
TAG_RE = re.compile(r"<[^>]+>")


def _is_public_http_target(url: str) -> tuple[bool, str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False, "Only http and https targets can be inspected."

    host = parsed.hostname
    if not host:
        return False, "The URL does not contain a valid hostname."

    normalized_host = host.lower()
    if normalized_host in {"localhost", "127.0.0.1", "::1"} or normalized_host.endswith(".local"):
        return False, "Local destinations are not inspected."

    try:
        ip = ipaddress.ip_address(normalized_host)
        if not ip.is_global:
            return False, "Private or reserved IP destinations are blocked."
        return True, ""
    except ValueError:
        pass

    try:
        records = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return True, ""

    resolved: list[ipaddress._BaseAddress] = []
    for record in records:
        try:
            resolved.append(ipaddress.ip_address(record[4][0]))
        except ValueError:
            continue

    if resolved and not any(address.is_global for address in resolved):
        return False, "The hostname resolves only to private or reserved addresses."

    return True, ""


def _strip_html(value: str) -> str:
    text = TAG_RE.sub(" ", value)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _keyword_hits(text: str) -> list[str]:
    lower = text.lower()
    return [keyword for keyword in LOGIN_KEYWORDS if keyword in lower][:4]


class TrackingRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self) -> None:
        super().__init__()
        self.redirect_chain: list[dict[str, Any]] = []

    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Any:
        if len(self.redirect_chain) >= MAX_REDIRECTS:
            raise RuntimeError("Redirect chain exceeded the safe inspection limit.")

        allowed, reason = _is_public_http_target(newurl)
        if not allowed:
            raise RuntimeError(reason)

        self.redirect_chain.append(
            {
                "from_url": req.full_url,
                "to_url": newurl,
                "status_code": code,
            }
        )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def inspect_url_destination(url: str) -> dict[str, Any]:
    normalized_url = _normalize_url(url)
    domain = _get_domain(normalized_url) or ""
    registrable_domain = _get_registrable_domain(domain) or domain
    base = {
        "normalized_url": normalized_url,
        "domain": domain,
        "registrable_domain": registrable_domain,
        "inspection_attempted": False,
        "inspection_succeeded": False,
        "blocked_reason": None,
        "error": None,
        "final_url": None,
        "final_domain": None,
        "final_registrable_domain": None,
        "status_code": None,
        "content_type": None,
        "redirect_chain": [],
        "page_title": None,
        "page_excerpt": None,
        "form_count": 0,
        "password_field_count": 0,
        "external_form_action": False,
        "meta_refresh_target": None,
        "login_keywords": [],
        "truncated": False,
    }

    allowed, reason = _is_public_http_target(normalized_url)
    if not allowed:
        base["blocked_reason"] = reason
        return base

    redirect_handler = TrackingRedirectHandler()
    opener = urllib.request.build_opener(redirect_handler)
    request = urllib.request.Request(
        normalized_url,
        headers={
            "User-Agent": "CyberCoach URL Inspector/0.1",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
    )

    base["inspection_attempted"] = True
    try:
        with opener.open(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            raw = response.read(MAX_READ_BYTES + 1)
            content_type = response.headers.get("Content-Type", "")
            final_url = response.geturl()
            final_domain = _get_domain(final_url)
            final_registrable_domain = _get_registrable_domain(final_domain) or final_domain
            charset = response.headers.get_content_charset() or "utf-8"
            body = raw[:MAX_READ_BYTES].decode(charset, errors="replace")
            title_match = TITLE_RE.search(body)
            page_title = _strip_html(title_match.group(1))[:160] if title_match else None
            page_excerpt = _strip_html(body)[:320] or None
            meta_refresh_match = META_REFRESH_RE.search(body)
            meta_refresh_target = None
            if meta_refresh_match:
                meta_refresh_target = urljoin(final_url, meta_refresh_match.group(1).strip())

            form_actions = [urljoin(final_url, action.strip()) for action in FORM_ACTION_RE.findall(body)[:6]]
            external_form_action = any(
                (_get_registrable_domain(_get_domain(action)) or _get_domain(action))
                and (_get_registrable_domain(_get_domain(action)) or _get_domain(action)) != final_registrable_domain
                for action in form_actions
            )

            signal_text = f"{page_title or ''} {page_excerpt or ''}".strip()
            base.update(
                {
                    "inspection_succeeded": True,
                    "final_url": final_url,
                    "final_domain": final_domain,
                    "final_registrable_domain": final_registrable_domain,
                    "status_code": response.getcode(),
                    "content_type": content_type,
                    "redirect_chain": redirect_handler.redirect_chain,
                    "page_title": page_title,
                    "page_excerpt": page_excerpt,
                    "form_count": len(FORM_RE.findall(body)),
                    "password_field_count": len(PASSWORD_RE.findall(body)),
                    "external_form_action": external_form_action,
                    "meta_refresh_target": meta_refresh_target,
                    "login_keywords": _keyword_hits(signal_text),
                    "truncated": len(raw) > MAX_READ_BYTES,
                }
            )
            return base
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as exc:
        base["error"] = str(exc)
        base["redirect_chain"] = redirect_handler.redirect_chain
        return base
    except Exception as exc:
        base["error"] = str(exc)
        base["redirect_chain"] = redirect_handler.redirect_chain
        return base


def inspect_url_destinations(urls: list[str]) -> list[dict[str, Any]]:
    inspections: list[dict[str, Any]] = []
    seen: set[str] = set()
    for url in urls:
        normalized = _normalize_url(url)
        if normalized in seen:
            continue
        seen.add(normalized)
        inspections.append(inspect_url_destination(normalized))
        if len(inspections) >= 3:
            break
    return inspections
