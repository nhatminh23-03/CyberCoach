from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import HTTPException


logger = logging.getLogger("cybercoach.api")


def _next_error_id() -> str:
    return uuid4().hex[:12]


def build_safe_http_error(*, operation: str, client_message: str, exc: Exception, status_code: int = 500) -> HTTPException:
    error_id = _next_error_id()
    logger.exception("%s failed [%s]", operation, error_id, exc_info=exc)
    return HTTPException(
        status_code=status_code,
        detail=client_message,
        headers={"X-Error-ID": error_id},
    )


def build_safe_websocket_error(*, operation: str, client_message: str, exc: Exception, request_id: str | None = None) -> dict[str, object]:
    error_id = _next_error_id()
    logger.exception("%s failed [%s]", operation, error_id, exc_info=exc)
    payload: dict[str, object] = {
        "type": "error",
        "detail": client_message,
        "error_id": error_id,
    }
    if request_id is not None:
        payload["request_id"] = request_id
    return payload

