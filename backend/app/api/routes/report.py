from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Request, Response

from ..error_handling import build_safe_http_error
from ...models.requests import ReportRequest
from ...services.rate_limit import rate_limit_http
from ...services.reports import generate_markdown_report, generate_text_report


router = APIRouter(tags=["report"])


@router.post("/report")
def generate_report(request: Request, payload: ReportRequest) -> Response:
    """Return a downloadable report generated from a unified scan result."""
    rate_limit_http(request, "report")
    try:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        if payload.format == "md":
            content = generate_markdown_report(payload.result)
            filename = f"cybercoach-report-{timestamp}.md"
            media_type = "text/markdown"
        else:
            content = generate_text_report(payload.result)
            filename = f"cybercoach-report-{timestamp}.txt"
            media_type = "text/plain"

        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise build_safe_http_error(
            operation="generate_report",
            client_message="Report generation failed. Please try again.",
            exc=exc,
        )
