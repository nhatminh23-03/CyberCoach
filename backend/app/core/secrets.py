from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_FILES = (
    ROOT_DIR / ".env",
    ROOT_DIR / ".env.local",
    ROOT_DIR / ".env.development.local",
)


def _strip_inline_comment(raw_value: str) -> str:
    in_single = False
    in_double = False
    for index, char in enumerate(raw_value):
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double
        elif char == "#" and not in_single and not in_double:
            return raw_value[:index].rstrip()
    return raw_value.strip()


def _normalize_value(raw_value: str) -> str:
    cleaned = _strip_inline_comment(raw_value).strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {"'", '"'}:
        return cleaned[1:-1]
    return cleaned


def _load_env_files() -> None:
    """Load root-level .env files into os.environ without overwriting existing vars."""
    for path in ENV_FILES:
        if not path.exists():
            continue

        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue

            key, raw_value = stripped.split("=", 1)
            normalized_key = key.strip().removeprefix("export ").strip()
            if not normalized_key or normalized_key in os.environ:
                continue

            os.environ[normalized_key] = _normalize_value(raw_value)


_load_env_files()


def get_secret(name: str, default: str = "") -> str:
    """Read a trimmed secret value from environment variables."""
    value = os.getenv(name, default)
    return str(value).strip() if value is not None else default
