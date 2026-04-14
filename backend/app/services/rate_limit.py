from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock

from fastapi import HTTPException, Request, WebSocket

from ..core.config import get_settings


@dataclass(frozen=True)
class RateLimitRule:
    limit: int
    window_seconds: int
    detail: str


class RateLimitExceeded(Exception):
    def __init__(self, *, detail: str, retry_after_seconds: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.retry_after_seconds = retry_after_seconds


def _client_ip_from_headers(headers: dict[str, str], fallback: str, *, trust_proxy_headers: bool) -> str:
    if trust_proxy_headers:
        forwarded = headers.get("x-forwarded-for", "")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first

        real_ip = headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    return fallback or "unknown"


class InMemoryRateLimiter:
    def __init__(self, rules: dict[str, RateLimitRule], *, trust_proxy_headers: bool) -> None:
        self._default_rules = dict(rules)
        self._rules = dict(rules)
        self._trust_proxy_headers = trust_proxy_headers
        self._events: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()

    def reset(self) -> None:
        with self._lock:
            self._events.clear()
            self._rules = dict(self._default_rules)

    def override_rule(self, bucket: str, *, limit: int, window_seconds: int, detail: str | None = None) -> None:
        base = self._default_rules[bucket]
        self._rules[bucket] = RateLimitRule(
            limit=limit,
            window_seconds=window_seconds,
            detail=detail or base.detail,
        )

    def _consume(self, client_key: str, bucket: str) -> None:
        rule = self._rules[bucket]
        now = time.monotonic()
        key = (bucket, client_key)

        with self._lock:
            events = self._events.setdefault(key, deque())
            cutoff = now - rule.window_seconds
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= rule.limit:
                retry_after = max(1, math.ceil(rule.window_seconds - (now - events[0])))
                raise RateLimitExceeded(detail=rule.detail, retry_after_seconds=retry_after)

            events.append(now)

    def _request_client_key(self, request: Request) -> str:
        fallback = request.client.host if request.client else "unknown"
        return _client_ip_from_headers(dict(request.headers), fallback, trust_proxy_headers=self._trust_proxy_headers)

    def _websocket_client_key(self, websocket: WebSocket) -> str:
        fallback = websocket.client.host if websocket.client else "unknown"
        return _client_ip_from_headers(dict(websocket.headers), fallback, trust_proxy_headers=self._trust_proxy_headers)

    def enforce_http(self, request: Request, bucket: str) -> None:
        self._consume(self._request_client_key(request), bucket)

    def enforce_websocket(self, websocket: WebSocket, bucket: str) -> None:
        self._consume(self._websocket_client_key(websocket), bucket)


settings = get_settings()
rate_limiter = InMemoryRateLimiter(
    {
        "url_precheck": RateLimitRule(
            limit=settings.rate_limit_url_precheck_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many link checks. Please wait and try again.",
        ),
        "text_scan": RateLimitRule(
            limit=settings.rate_limit_text_scan_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many scan requests. Please wait and try again.",
        ),
        "upload_scan": RateLimitRule(
            limit=settings.rate_limit_upload_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many upload requests. Please wait and try again.",
        ),
        "report": RateLimitRule(
            limit=settings.rate_limit_report_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many report requests. Please wait and try again.",
        ),
        "voice_start": RateLimitRule(
            limit=settings.rate_limit_voice_start_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many live session requests. Please wait and try again.",
        ),
        "voice_update": RateLimitRule(
            limit=settings.rate_limit_voice_update_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many live analysis updates. Please wait and try again.",
        ),
        "voice_finalize": RateLimitRule(
            limit=settings.rate_limit_voice_finalize_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many finalize requests. Please wait and try again.",
        ),
        "voice_ws_connect": RateLimitRule(
            limit=settings.rate_limit_voice_stream_connect_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many live stream connections. Please wait and try again.",
        ),
        "voice_ws_message": RateLimitRule(
            limit=settings.rate_limit_voice_stream_message_requests,
            window_seconds=settings.rate_limit_window_seconds,
            detail="Too many live stream updates. Please wait and try again.",
        ),
    },
    trust_proxy_headers=settings.trust_proxy_headers,
)


def rate_limit_http(request: Request, bucket: str) -> None:
    try:
        rate_limiter.enforce_http(request, bucket)
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=exc.detail,
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from None


def build_rate_limit_ws_error(*, detail: str, retry_after_seconds: int, request_id: str | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "type": "error",
        "detail": detail,
        "retry_after_seconds": retry_after_seconds,
    }
    if request_id is not None:
        payload["request_id"] = request_id
    return payload

