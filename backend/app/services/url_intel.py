from __future__ import annotations

import http.client
import ipaddress
import logging
import re
import socket
import ssl
import urllib.error
from html import unescape
from dataclasses import dataclass
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
logger = logging.getLogger("cybercoach.url_intel")


@dataclass(frozen=True)
class ResolvedPublicTarget:
    normalized_url: str
    scheme: str
    host: str
    port: int
    request_path: str
    connect_host: str
    resolved_addresses: tuple[str, ...]


class _PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(self, host: str, *, connect_host: str, port: int, timeout: float) -> None:
        super().__init__(host=host, port=port, timeout=timeout)
        self._connect_host = connect_host

    def connect(self) -> None:
        self.sock = socket.create_connection((self._connect_host, self.port), self.timeout, self.source_address)


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, *, connect_host: str, port: int, timeout: float) -> None:
        context = ssl.create_default_context()
        super().__init__(host=host, port=port, timeout=timeout, context=context)
        self._connect_host = connect_host

    def connect(self) -> None:
        raw_sock = socket.create_connection((self._connect_host, self.port), self.timeout, self.source_address)
        self.sock = self._context.wrap_socket(raw_sock, server_hostname=self.host)


def _request_path(parsed: Any) -> str:
    path = parsed.path or "/"
    if parsed.params:
        path += f";{parsed.params}"
    if parsed.query:
        path += f"?{parsed.query}"
    return path


def _resolve_public_target(url: str) -> tuple[ResolvedPublicTarget | None, str]:
    """Resolve and pin only globally routable HTTP(S) targets for inspection.

    Policy:
    - allow only http/https URLs without embedded credentials
    - require DNS resolution to succeed before inspection
    - reject any host that resolves to private, loopback, link-local, or reserved IPs
    - reject mixed public/private DNS answers
    - connect to the vetted IP directly to avoid resolver drift during fetch
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return None, "Only http and https targets can be inspected."

    if parsed.username or parsed.password:
        return None, "URLs with embedded credentials are not inspected."

    host = parsed.hostname
    if not host:
        return None, "The URL does not contain a valid hostname."

    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        return None, "The URL contains an invalid port."

    normalized_host = host.lower()
    if normalized_host in {"localhost", "127.0.0.1", "::1"} or normalized_host.endswith(".local"):
        return None, "Local destinations are not inspected."

    try:
        ip = ipaddress.ip_address(normalized_host)
        if not ip.is_global:
            return None, "Private, loopback, link-local, and reserved IP destinations are blocked."
        addresses = (str(ip),)
        return (
            ResolvedPublicTarget(
                normalized_url=url,
                scheme=parsed.scheme,
                host=host,
                port=port,
                request_path=_request_path(parsed),
                connect_host=addresses[0],
                resolved_addresses=addresses,
            ),
            "",
        )
    except ValueError:
        pass

    try:
        records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return None, "The hostname could not be resolved safely."

    resolved: list[ipaddress._BaseAddress] = []
    for record in records:
        try:
            candidate = ipaddress.ip_address(record[4][0])
        except ValueError:
            continue
        if candidate not in resolved:
            resolved.append(candidate)

    if not resolved:
        return None, "The hostname could not be resolved safely."

    if any(not address.is_global for address in resolved):
        return None, "The hostname resolves to private, loopback, link-local, or reserved addresses."

    resolved_addresses = tuple(str(address) for address in resolved)
    return (
        ResolvedPublicTarget(
            normalized_url=url,
            scheme=parsed.scheme,
            host=host,
            port=port,
            request_path=_request_path(parsed),
            connect_host=resolved_addresses[0],
            resolved_addresses=resolved_addresses,
        ),
        "",
    )


def _strip_html(value: str) -> str:
    text = TAG_RE.sub(" ", value)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _keyword_hits(text: str) -> list[str]:
    lower = text.lower()
    return [keyword for keyword in LOGIN_KEYWORDS if keyword in lower][:4]


def _open_pinned_connection(target: ResolvedPublicTarget) -> http.client.HTTPResponse:
    connection_cls = _PinnedHTTPSConnection if target.scheme == "https" else _PinnedHTTPConnection
    connection = connection_cls(
        target.host,
        connect_host=target.connect_host,
        port=target.port,
        timeout=FETCH_TIMEOUT_SECONDS,
    )
    connection.request(
        "GET",
        target.request_path,
        headers={
            "User-Agent": "CyberCoach URL Inspector/0.1",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "identity",
        },
    )
    response = connection.getresponse()
    response._cybercoach_connection = connection  # type: ignore[attr-defined]
    return response


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

    target, reason = _resolve_public_target(normalized_url)
    if not target:
        base["blocked_reason"] = reason
        return base

    base["inspection_attempted"] = True
    try:
        redirect_chain: list[dict[str, Any]] = []
        current_target = target
        current_url = normalized_url

        while True:
            response = _open_pinned_connection(current_target)
            connection = response._cybercoach_connection  # type: ignore[attr-defined]
            try:
                status_code = response.status
                if status_code in {301, 302, 303, 307, 308}:
                    location = response.getheader("Location")
                    if not location:
                        raise RuntimeError("Redirect response did not include a Location header.")
                    if len(redirect_chain) >= MAX_REDIRECTS:
                        raise RuntimeError("Redirect chain exceeded the safe inspection limit.")

                    next_url = urljoin(current_url, location)
                    next_target, redirect_reason = _resolve_public_target(next_url)
                    if not next_target:
                        raise RuntimeError(redirect_reason)

                    redirect_chain.append(
                        {
                            "from_url": current_url,
                            "to_url": next_target.normalized_url,
                            "status_code": status_code,
                        }
                    )
                    current_url = next_target.normalized_url
                    current_target = next_target
                    continue

                raw = response.read(MAX_READ_BYTES + 1)
                content_type = response.headers.get("Content-Type", "")
                final_url = current_url
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
                        "status_code": status_code,
                        "content_type": content_type,
                        "redirect_chain": redirect_chain,
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
            finally:
                response.close()
                connection.close()
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as exc:
        logger.warning("URL destination inspection failed for %s: %s", normalized_url, exc)
        base["error"] = "Destination check could not be completed."
        return base
    except Exception as exc:
        logger.exception("Unexpected URL destination inspection failure for %s", normalized_url, exc_info=exc)
        base["error"] = "Destination check could not be completed."
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
