from __future__ import annotations

import re


NAME_EXCLUSION_WORDS = {
    "account", "admin", "administrator", "billing", "bank", "care", "center",
    "customer", "department", "desk", "help", "manager", "office", "payment",
    "security", "service", "services", "support", "system", "team", "verification",
}


def is_likely_person_name(candidate: str) -> bool:
    cleaned = candidate.strip().strip('"').strip("'")
    if not cleaned or "[" in cleaned:
        return False

    parts = re.findall(r"[A-Za-z][A-Za-z'-]*", cleaned)
    if not 1 <= len(parts) <= 3:
        return False

    lowered = {part.lower() for part in parts}
    if lowered & NAME_EXCLUSION_WORDS:
        return False

    return all(part[0].isupper() for part in parts)


def redact_contextual_names(text: str, redactions: list[dict[str, str]]) -> str:
    """Redact likely personal names only when they appear in name-like contexts."""

    def replace_group(pattern: re.Pattern[str], group_index: int, current_text: str) -> str:
        def replacer(match: re.Match[str]) -> str:
            candidate = match.group(group_index).strip()
            if not is_likely_person_name(candidate):
                return match.group(0)

            redactions.append({"type": "name", "original": candidate})
            start, end = match.span(group_index)
            prefix = match.group(0)[: start - match.start()]
            suffix = match.group(0)[end - match.start() :]
            return f"{prefix}[NAME REDACTED]{suffix}"

        return pattern.sub(replacer, current_text)

    patterns = [
        re.compile(r"(?mi)^((?:from|to|cc|bcc|reply-to|sender)\s*:\s*)([^<\n]+?)(?=(?:\s*<)|\s*$)"),
        re.compile(r"(?mi)\b((?:dear|hi|hello|hey)\s+)([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,2})(?=(?:\s*[,!]|$))"),
        re.compile(r"(?mi)\b((?:my name is|i am|this is)\s+)([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,2})\b"),
        re.compile(r"(?mi)^((?:thanks|thank you|regards|best|best regards|sincerely|cheers)[,!]?\s*\n\s*)([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,2})\b"),
    ]

    redacted = text
    for pattern in patterns:
        redacted = replace_group(pattern, 2, redacted)
    return redacted


def redact_pii(text: str) -> tuple[str, list[dict[str, str]]]:
    """Redact common PII patterns before LLM analysis."""
    redacted = text
    redactions: list[dict[str, str]] = []

    email_pattern = r"[\w.-]+@[\w.-]+\.\w+"
    for match in re.finditer(email_pattern, redacted):
        redactions.append({"type": "email", "original": match.group()})
    redacted = re.sub(email_pattern, "[EMAIL REDACTED]", redacted)

    phone_pattern = r"(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    for match in re.finditer(phone_pattern, redacted):
        redactions.append({"type": "phone", "original": match.group()})
    redacted = re.sub(phone_pattern, "[PHONE REDACTED]", redacted)

    ssn_pattern = r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b"
    for match in re.finditer(ssn_pattern, redacted):
        redactions.append({"type": "ssn", "original": match.group()})
    redacted = re.sub(ssn_pattern, "[SSN REDACTED]", redacted)

    card_pattern = r"\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b"
    for match in re.finditer(card_pattern, redacted):
        redactions.append({"type": "credit_card", "original": match.group()})
    redacted = re.sub(card_pattern, "[CARD REDACTED]", redacted)

    redacted = redact_contextual_names(redacted, redactions)
    return redacted, redactions
