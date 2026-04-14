from __future__ import annotations

import json
from pathlib import Path
from typing import Any


TESTS_ROOT = Path(__file__).resolve().parents[1]
FIXTURES_ROOT = TESTS_ROOT / "fixtures"
SNAPSHOTS_ROOT = TESTS_ROOT / "snapshots"


def load_fixture_json(*parts: str) -> dict[str, Any]:
    path = FIXTURES_ROOT.joinpath(*parts)
    return json.loads(path.read_text(encoding="utf-8"))


def load_snapshot_json(filename: str) -> dict[str, Any]:
    path = SNAPSHOTS_ROOT / filename
    return json.loads(path.read_text(encoding="utf-8"))
