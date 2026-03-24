from __future__ import annotations

from fastapi import APIRouter

from ...core.config import get_settings
from ...models.responses import HealthResponse
from ...services.heuristics import get_dataset_status


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return basic service health and dataset availability."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        datasets=get_dataset_status(),
    )
