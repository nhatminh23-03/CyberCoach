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
    """In-memory record for a completed scan."""

    entry_id: int
    created_at: str
    scan_type: str
    risk_label: str
    snippet: str
    result: dict[str, Any]


class InMemoryHistoryStore:
    """Small in-memory history store to preserve session-like behavior server side."""

    def __init__(self, max_entries: int) -> None:
        self._entries: deque[HistoryEntry] = deque(maxlen=max_entries)
        self._lock = Lock()
        self._next_id = 1

    def add(self, result: dict[str, Any]) -> HistoryEntry:
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
        with self._lock:
            return len(self._entries)

    def list(self) -> list[HistoryEntry]:
        with self._lock:
            return list(self._entries)


history_store = InMemoryHistoryStore(max_entries=get_settings().history_limit)


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
