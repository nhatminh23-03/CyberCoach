from __future__ import annotations

from fastapi import APIRouter

from ...models.responses import IntelFeedResponse, IntelItemResponse
from ...services.intel import get_intel_feed


router = APIRouter(prefix="/intel", tags=["intel"])


@router.get("/feed", response_model=IntelFeedResponse)
def intel_feed() -> IntelFeedResponse:
    """Return curated intel items plus live session telemetry."""
    items = [IntelItemResponse(**item) for item in get_intel_feed()]
    return IntelFeedResponse(items=items)
