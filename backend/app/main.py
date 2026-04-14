from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    raw_errors = exc.errors()
    errors = []
    for error in raw_errors:
        next_error = dict(error)
        ctx = next_error.get("ctx")
        if isinstance(ctx, dict):
            next_error["ctx"] = {key: str(value) for key, value in ctx.items()}
        errors.append(next_error)

    size_error = next(
        (
            error
            for error in errors
            if error.get("type") in {"string_too_long", "too_long", "bytes_too_long"}
            or (
                error.get("type") == "value_error"
                and "too large" in str(error.get("msg", "")).lower()
            )
        ),
        None,
    )

    if size_error:
        return JSONResponse(
            status_code=413,
            content={"detail": size_error.get("msg", "Request payload is too large.")},
        )

    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/")
def root() -> dict[str, str]:
    """Simple root endpoint for quick local checks."""
    return {"service": settings.app_name, "docs": "/docs"}
