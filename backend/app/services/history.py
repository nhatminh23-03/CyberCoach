from __future__ import annotations

from collections import deque
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from typing import Any

from ..core.config import get_settings


@dataclass(frozen=True)
class HistoryEntry:
    """In-memory record for a completed scan.

    This is intentionally opt-in only. Unscoped public history is not safe for production.
    """

    entry_id: int
    created_at: str
    scan_type: str
    risk_label: str
    snippet: str
    result: dict[str, Any]


class InMemoryHistoryStore:
    """Small in-memory history store to preserve session-like behavior server side."""

    def __init__(self, max_entries: int, *, enabled: bool) -> None:
        self._entries: deque[HistoryEntry] = deque(maxlen=max_entries)
        self._lock = Lock()
        self._next_id = 1
        self._enabled = enabled

    def is_enabled(self) -> bool:
        return self._enabled

    def set_enabled(self, enabled: bool) -> None:
        with self._lock:
            self._enabled = enabled
            if not enabled:
                self._entries.clear()
                self._next_id = 1

    def reset(self) -> None:
        with self._lock:
            self._entries.clear()
            self._next_id = 1

    def add(self, result: dict[str, Any]) -> HistoryEntry | None:
        if not self.is_enabled():
            return None

        snippet = result.get("original_input", "")[:80]
        if len(result.get("original_input", "")) > 80:
            snippet += "..."

        with self._lock:
            entry = HistoryEntry(
                entry_id=self._next_id,
                created_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
                scan_type=result.get("scan_type", "unknown"),
                risk_label=result.get("risk_label", "Unknown"),
                snippet=snippet,
                result=deepcopy(result),
            )
            self._entries.append(entry)
            self._next_id += 1
            return entry

    def count(self) -> int:
        if not self.is_enabled():
            return 0
        with self._lock:
            return len(self._entries)

    def list(self) -> list[HistoryEntry]:
        if not self.is_enabled():
            return []
        with self._lock:
            return list(self._entries)


history_store = InMemoryHistoryStore(
    max_entries=get_settings().history_limit,
    enabled=get_settings().public_scan_history_enabled,
)


def serialize_history_entries() -> list[dict[str, Any]]:
    """Return history entries as API-safe dictionaries ordered newest first."""
    entries = history_store.list()
    return [
        {
            "entry_id": entry.entry_id,
            "created_at": entry.created_at,
            "scan_type": entry.scan_type,
            "risk_label": entry.risk_label,
            "snippet": entry.snippet,
            "result": entry.result,
        }
        for entry in reversed(entries)
    ]
