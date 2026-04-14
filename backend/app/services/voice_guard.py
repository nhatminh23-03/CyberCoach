from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Any
from uuid import uuid4

from .pii import redact_pii

DEFAULT_CHALLENGE_QUESTIONS = [
    "Ask them to pause while you call the person or organization back using the number you already trust.",
    "Ask for one detail only the real person or institution should know, then verify it independently before acting.",
]

FAMILY_EMERGENCY_TERMS = (
    "grandma",
    "grandpa",
    "mom",
    "mum",
    "dad",
    "daughter",
    "son",
    "grandchild",
    "accident",
    "hospital",
    "jail",
    "bail",
    "lawyer",
)

FINANCIAL_IMPERSONATION_TERMS = (
    "bank",
    "fraud department",
    "fraud team",
    "account alert",
    "security team",
    "credit union",
    "paypal",
    "amazon",
    "card services",
)

OFFICIAL_PRESSURE_TERMS = (
    "police",
    "officer",
    "irs",
    "social security",
    "court",
    "customs",
    "government",
    "detective",
)

PAYMENT_TERMS = (
    "gift card",
    "wire transfer",
    "zelle",
    "cash app",
    "venmo",
    "bitcoin",
    "crypto",
    "payment",
    "transfer",
)

OTP_TERMS = (
    "one-time code",
    "verification code",
    "security code",
    "six digit code",
    "otp",
    "read me the code",
)


def _timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _normalize_signal(item: dict[str, Any]) -> dict[str, str] | None:
    signal_type = str(item.get("type") or "").strip()
    detail = str(item.get("detail") or "").strip()
    severity = str(item.get("severity") or "low").strip().lower()
    if not signal_type or not detail:
        return None
    if severity not in {"high", "medium", "low"}:
        severity = "low"
    return {
        "type": signal_type,
        "detail": detail,
        "severity": severity,
    }


def dedupe_voice_signals(signals: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in signals:
        if not isinstance(item, dict):
            continue
        normalized_item = _normalize_signal(item)
        if not normalized_item:
            continue
        key = f"{normalized_item['type']}:{normalized_item['detail']}"
        if key in seen:
            continue
        seen.add(key)
        normalized.append(normalized_item)
    return normalized[:6]


def dedupe_transcript_segments(segments: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in segments:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        timestamp = str(item.get("timestamp") or "").strip()
        key = f"{timestamp}:{text}"
        if key in seen:
            continue
        seen.add(key)
        normalized.append({"text": text, "timestamp": timestamp})
    return normalized[-20:]


def protect_transcript_text(text: str, *, privacy_mode: bool) -> str:
    if not privacy_mode:
        return text.strip()
    protected, _ = redact_pii(text.strip())
    return protected


def protect_transcript_segments(segments: list[dict[str, Any]], *, privacy_mode: bool) -> list[dict[str, str]]:
    normalized = dedupe_transcript_segments(segments)
    if not privacy_mode:
        return normalized
    protected: list[dict[str, str]] = []
    for item in normalized:
        redacted_text, _ = redact_pii(item["text"])
        protected.append({"text": redacted_text, "timestamp": item["timestamp"]})
    return protected


@dataclass
class VoiceSession:
    session_id: str
    language: str
    privacy_mode: bool
    started_at: str
    updated_at: str
    transcript_text: str = ""
    transcript_segments: list[dict[str, str]] = field(default_factory=list)
    voice_signals: list[dict[str, str]] = field(default_factory=list)
    elapsed_seconds: int = 0
    live_ai_state: str = "heuristics_live_only"
    live_ai_summary: str = ""
    live_ai_reasons: list[str] = field(default_factory=list)
    live_ai_confidence: str | None = None
    live_ai_action: str | None = None
    live_ai_last_updated_at: str | None = None
    live_ai_attempted: bool = False
    live_ai_last_word_count: int = 0
    live_ai_last_heuristic_score: int = 0
    live_ai_last_elapsed_seconds: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "language": self.language,
            "privacy_mode": self.privacy_mode,
            "started_at": self.started_at,
            "updated_at": self.updated_at,
            "transcript_text": self.transcript_text,
            "transcript_segments": deepcopy(self.transcript_segments),
            "voice_signals": deepcopy(self.voice_signals),
            "elapsed_seconds": self.elapsed_seconds,
            "live_ai_state": self.live_ai_state,
            "live_ai_summary": self.live_ai_summary,
            "live_ai_reasons": deepcopy(self.live_ai_reasons),
            "live_ai_confidence": self.live_ai_confidence,
            "live_ai_action": self.live_ai_action,
            "live_ai_last_updated_at": self.live_ai_last_updated_at,
            "live_ai_attempted": self.live_ai_attempted,
            "live_ai_last_word_count": self.live_ai_last_word_count,
            "live_ai_last_heuristic_score": self.live_ai_last_heuristic_score,
            "live_ai_last_elapsed_seconds": self.live_ai_last_elapsed_seconds,
        }


class InMemoryVoiceSessionStore:
    """Ephemeral live-call state used by the browser-based speakerphone listener."""

    def __init__(self, max_sessions: int = 48) -> None:
        self._sessions: OrderedDict[str, VoiceSession] = OrderedDict()
        self._max_sessions = max_sessions
        self._lock = Lock()

    def start(self, *, language: str, privacy_mode: bool) -> VoiceSession:
        session = VoiceSession(
            session_id=f"voice-{uuid4().hex[:12]}",
            language=language,
            privacy_mode=privacy_mode,
            started_at=_timestamp(),
            updated_at=_timestamp(),
        )
        with self._lock:
            self._sessions[session.session_id] = session
            while len(self._sessions) > self._max_sessions:
                self._sessions.popitem(last=False)
        return deepcopy(session)

    def get(self, session_id: str) -> VoiceSession | None:
        with self._lock:
            session = self._sessions.get(session_id)
            return deepcopy(session) if session else None

    def update(
        self,
        session_id: str,
        *,
        transcript_text: str,
        transcript_segments: list[dict[str, Any]],
        voice_signals: list[dict[str, Any]],
        elapsed_seconds: int,
    ) -> VoiceSession:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise ValueError("Live call session not found. Start a new session and try again.")

            session.transcript_text = protect_transcript_text(transcript_text, privacy_mode=session.privacy_mode)
            session.transcript_segments = protect_transcript_segments(transcript_segments, privacy_mode=session.privacy_mode)
            session.voice_signals = dedupe_voice_signals(voice_signals)
            session.elapsed_seconds = max(0, int(elapsed_seconds))
            session.updated_at = _timestamp()
            self._sessions.move_to_end(session_id)
            return deepcopy(session)

    def close(self, session_id: str) -> VoiceSession | None:
        with self._lock:
            session = self._sessions.pop(session_id, None)
            return deepcopy(session) if session else None

    def apply_live_ai_review(
        self,
        session_id: str,
        *,
        state: str,
        summary: str,
        reasons: list[str],
        confidence: str | None,
        action: str | None,
        attempted: bool,
        transcript_word_count: int | None = None,
        heuristic_score: int | None = None,
        elapsed_seconds: int | None = None,
    ) -> VoiceSession:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise ValueError("Live call session not found. Start a new session and try again.")

            session.live_ai_state = state
            session.live_ai_summary = summary.strip()
            session.live_ai_reasons = [item.strip() for item in reasons if item and item.strip()][:3]
            session.live_ai_confidence = confidence.strip() if isinstance(confidence, str) and confidence.strip() else None
            session.live_ai_action = action.strip() if isinstance(action, str) and action.strip() else None
            session.live_ai_attempted = attempted
            session.live_ai_last_updated_at = _timestamp()
            if transcript_word_count is not None:
                session.live_ai_last_word_count = max(0, int(transcript_word_count))
            if heuristic_score is not None:
                session.live_ai_last_heuristic_score = max(0, int(heuristic_score))
            if elapsed_seconds is not None:
                session.live_ai_last_elapsed_seconds = max(0, int(elapsed_seconds))
            session.updated_at = _timestamp()
            self._sessions.move_to_end(session_id)
            return deepcopy(session)


voice_session_store = InMemoryVoiceSessionStore()


def build_voice_challenge_questions(text: str, findings: list[dict[str, Any]]) -> list[str]:
    lower = text.lower()
    finding_types = {str(item.get("type") or "").strip() for item in findings if isinstance(item, dict)}
    questions: list[str] = []

    if any(term in lower for term in FAMILY_EMERGENCY_TERMS) or "voice_family_emergency" in finding_types:
        questions.append("Ask for a family detail only the real person would know, like a nickname, last visit, or shared memory.")
        questions.append("Tell them you will hang up and call the family member or caregiver back on the number you already have.")

    if (
        any(term in lower for term in FINANCIAL_IMPERSONATION_TERMS)
        or any(term in lower for term in OFFICIAL_PRESSURE_TERMS)
        or {"voice_bank_impersonation", "voice_government_impersonation"} & finding_types
    ):
        questions.append("Ask for their department name and say you will call the official number from your card, statement, or the public website.")

    if any(term in lower for term in PAYMENT_TERMS) or "voice_payment_request" in finding_types:
        questions.append("Ask for a written invoice, case number, or secure message you can verify independently before sending money.")

    if any(term in lower for term in OTP_TERMS) or "voice_otp_request" in finding_types:
        questions.append("Ask why they need your one-time code. Legitimate support or bank staff should not ask you to read it aloud.")

    if "voice_secrecy_pressure" in finding_types or "voice_call_control" in finding_types:
        questions.append("Tell them you do not make urgent decisions on a live call and will verify the story with someone you trust first.")

    deduped: list[str] = []
    for question in questions + DEFAULT_CHALLENGE_QUESTIONS:
        if question not in deduped:
            deduped.append(question)
    return deduped[:4]


def build_voice_warnings(findings: list[dict[str, Any]], voice_signals: list[dict[str, Any]]) -> list[str]:
    warnings: list[str] = []
    prioritized = sorted(
        [item for item in findings if isinstance(item, dict)],
        key=lambda item: 3 if item.get("severity") == "high" else 2 if item.get("severity") == "medium" else 1,
        reverse=True,
    )
    for item in prioritized[:3]:
        detail = str(item.get("detail") or "").strip()
        if detail and detail not in warnings:
            warnings.append(detail)
    for item in voice_signals[:2]:
        detail = str(item.get("detail") or "").strip()
        if detail and detail not in warnings:
            warnings.append(detail)
    return warnings[:4]
