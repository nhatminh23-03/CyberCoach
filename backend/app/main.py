from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.health import router as health_router
from .api.routes.intel import router as intel_router
from .api.routes.report import router as report_router
from .api.routes.scan import router as scan_router
from .core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI backend extracted from the original CyberCoach Streamlit app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix, tags=["health"])
app.include_router(intel_router, prefix=settings.api_prefix)
app.include_router(scan_router, prefix=settings.api_prefix)
app.include_router(report_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    """Simple root endpoint for quick local checks."""
    return {"service": settings.app_name, "docs": "/docs"}
