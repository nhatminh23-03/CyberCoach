from __future__ import annotations

import csv
import random
import re
import sys
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..core.config import get_settings
from .domain_utils import (
    domain_matches_official as _domain_matches_official,
    domain_tokens as _domain_tokens,
    get_domain,
    get_registrable_domain,
    normalize_url_input,
    subdomain_part as _subdomain_part,
)
from .service_data import (
    detection_rule_list,
    detection_rule_map,
    message_samples,
    official_entities,
)
from .url_intel import inspect_url_destinations


URGENCY_PHRASES = detection_rule_list("urgency_phrases")
CREDENTIAL_PHRASES = detection_rule_list("credential_phrases")
SUSPICIOUS_TLDS = detection_rule_list("suspicious_tlds")
TRUSTED_DOMAINS = detection_rule_list("trusted_domains")
SHORTENED_URL_DOMAINS = detection_rule_list("shortened_url_domains")
OFFICIAL_ENTITIES = official_entities()
LEGAL_THREAT_PHRASES = detection_rule_list("legal_threat_phrases")
QR_ACCOUNT_LURE_PHRASES = detection_rule_list("qr_account_lure_phrases")
SCREENSHOT_VISUAL_FINDING_TYPES = detection_rule_map("screenshot_visual_finding_types")
MESSAGE_SAMPLES = message_samples()


def _data_path(filename: str) -> Path:
    return get_settings().data_dir / filename


@lru_cache(maxsize=1)
def load_phishtank_urls() -> set[str]:
    """Load verified phishing URLs into a fast-lookup set."""
    phishtank_path = _data_path("verified_online.csv")
    if not phishtank_path.exists():
        return set()

    urls: set[str] = set()
    try:
        with phishtank_path.open("r", encoding="utf-8", errors="ignore") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                url = row.get("url", "").strip().lower().rstrip("/")
                if url:
                    urls.add(url)
    except Exception:
        return set()
    return urls


@lru_cache(maxsize=1)
def load_kaggle_examples() -> list[dict[str, str]]:
    """Load phishing email examples from the checked-in dataset."""
    for filename in ("phishing_email.csv", "Phishing_Email.csv"):
        kaggle_path = _data_path(filename)
        if kaggle_path.exists():
            break
    else:
        return []

    examples: list[dict[str, str]] = []
    try:
        csv.field_size_limit(sys.maxsize)
        with kaggle_path.open("r", encoding="utf-8", errors="ignore") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                try:
                    text = (
                        row.get("text_combined")
                        or row.get("Email Text")
                        or row.get("email_text")
                        or row.get("text")
                        or row.get("body")
                        or ""
                    )
                    label = row.get("label") or row.get("Email Type") or row.get("Label") or ""
                    stripped = text.strip()
                    if stripped and 100 < len(stripped) < 3000 and str(label) == "1":
                        examples.append({"text": stripped, "label": "phishing"})
                except Exception:
                    continue
    except Exception:
        return []
    return examples


def get_dataset_status() -> dict[str, int]:
    """Return dataset counts for health checks and diagnostics."""
    return {
        "phishtank_urls": len(load_phishtank_urls()),
        "kaggle_examples": len(load_kaggle_examples()),
    }


def get_message_samples() -> list[dict[str, str]]:
    """Return the static message demo presets from the original Streamlit app."""
    return list(MESSAGE_SAMPLES.values())


def get_random_real_phish_sample() -> dict[str, str] | None:
    """Return one random phishing email example from the Kaggle dataset when available."""
    examples = load_kaggle_examples()
    if not examples:
        return None
    sample = random.choice(examples)
    return {
        "id": "random_real_phish",
        "label": "Random real phish",
        "text": sample["text"],
    }


def build_url_precheck(url: str) -> dict[str, str | int | bool]:
    """Return parsed URL metadata and instant phishing-database status."""
    normalized_url = normalize_url_input(url)
    if not normalized_url:
        raise ValueError("URL input is required.")

    domain = get_domain(normalized_url)
    if not domain:
        raise ValueError("Unable to parse this URL.")

    parts = domain.split(".")
    tld = "." + parts[-1] if parts else ""
    subdomain_count = len(parts) - 2 if len(parts) > 2 else 0
    is_raw_ip = bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", domain))
    is_shortened = domain in SHORTENED_URL_DOMAINS
    registrable_domain = get_registrable_domain(domain) or domain
    phishtank_urls = load_phishtank_urls()
    normalized_lookup = normalized_url.lower().rstrip("/")

    return {
        "normalized_url": normalized_url,
        "domain": domain,
        "registrable_domain": registrable_domain,
        "tld": tld,
        "subdomain_count": subdomain_count,
        "is_raw_ip": is_raw_ip,
        "is_shortened": is_shortened,
        "phishtank_loaded": bool(phishtank_urls),
        "phishtank_hit": normalized_lookup in phishtank_urls if phishtank_urls else False,
        "phishtank_count": len(phishtank_urls),
    }


def extract_urls(text: str) -> list[str]:
    pattern = r'https?://[^\s<>"\')\]]+|www\.[^\s<>"\')\]]+'
    urls = re.findall(pattern, text, re.IGNORECASE)
    return [("http://" + url if url.lower().startswith("www.") else url) for url in urls]


def _parse_written_date(raw: str) -> datetime | None:
    cleaned = raw.strip()
    for pattern in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(cleaned, pattern)
        except ValueError:
            continue
    return None


def check_domain_mismatch(text: str, urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for trusted in TRUSTED_DOMAINS:
        brand = trusted.split(".")[0]
        if len(brand) < 3:
            continue
        if re.search(brand, text, re.IGNORECASE):
            for url in urls:
                domain = get_domain(url)
                if domain and brand not in domain:
                    findings.append(
                        {
                            "type": "domain_mismatch",
                            "detail": f'Mentions "{brand}" but links to "{domain}"',
                            "severity": "high",
                        }
                    )
    return findings


def check_suspicious_tlds(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for url in urls:
        domain = get_domain(url)
        if domain:
            for tld in SUSPICIOUS_TLDS:
                if domain.endswith(tld):
                    findings.append(
                        {
                            "type": "suspicious_tld",
                            "detail": f'URL uses suspicious domain extension "{tld}": {domain}',
                            "severity": "high",
                        }
                    )
    return findings


def check_deadline_conflicts(text: str) -> list[dict[str, str]]:
    begins_matches = re.findall(
        r"\b(?:enforcement begins|enforcement starts|begins|starts|effective(?:\s+on)?)\s+([A-Z][a-z]+ \d{1,2}, \d{4})",
        text,
        re.IGNORECASE,
    )
    deadline_matches = re.findall(
        r"\b(?:by|before|no later than|resolve by|pay by)\s+([A-Z][a-z]+ \d{1,2}, \d{4})",
        text,
        re.IGNORECASE,
    )

    begins_dates = [date for item in begins_matches if (date := _parse_written_date(item))]
    deadline_dates = [date for item in deadline_matches if (date := _parse_written_date(item))]

    if not begins_dates or not deadline_dates:
        return []

    earliest_deadline = min(deadline_dates)
    latest_begin = max(begins_dates)
    if earliest_deadline < latest_begin:
        return [
            {
                "type": "deadline_conflict",
                "detail": "The message gives a deadline that is earlier than its own enforcement/start date.",
                "severity": "medium",
            }
        ]
    return []


def check_urgency(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    found = [phrase for phrase in URGENCY_PHRASES if phrase in lower]
    if len(found) >= 2:
        return [
            {
                "type": "urgency",
                "detail": f'Multiple urgency triggers: "{found[0]}", "{found[1]}"',
                "severity": "high",
            }
        ]
    if len(found) == 1:
        return [
            {
                "type": "urgency",
                "detail": f'Urgency language detected: "{found[0]}"',
                "severity": "medium",
            }
        ]
    return []


def check_legal_threats(text: str, urls: list[str]) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in LEGAL_THREAT_PHRASES if phrase in lower]
    if len(matched) >= 2 and urls:
        return [
            {
                "type": "legal_threat",
                "detail": f'Uses legal or government pressure language: "{matched[0]}", "{matched[1]}"',
                "severity": "high",
            }
        ]
    if len(matched) >= 2:
        return [
            {
                "type": "legal_threat",
                "detail": f'Uses legal or government pressure language: "{matched[0]}", "{matched[1]}"',
                "severity": "medium",
            }
        ]
    return []


def check_credential_asks(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    found = [phrase for phrase in CREDENTIAL_PHRASES if phrase in lower]
    if not found:
        return []

    labels = ", ".join(f'"{item}"' for item in found[:3])
    return [
        {
            "type": "credential_ask",
            "detail": f"Asks for sensitive info: {labels}",
            "severity": "high",
        }
    ]


def check_sender_spoofing(text: str) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    from_match = re.search(r'from:?\s*(.+?)[\n<]', text, re.IGNORECASE)
    email_match = re.search(r"[\w.-]+@[\w.-]+\.\w+", text)
    if from_match and email_match:
        display_name = from_match.group(1).lower()
        email_domain = email_match.group(0).split("@")[1].lower()
        for trusted in TRUSTED_DOMAINS:
            brand = trusted.split(".")[0]
            if len(brand) < 3:
                continue
            if brand in display_name and brand not in email_domain:
                findings.append(
                    {
                        "type": "sender_spoof",
                        "detail": f'Sender claims to be "{brand}" but email domain is "{email_domain}"',
                        "severity": "high",
                    }
                )
    return findings


def check_official_entity_impersonation(text: str, urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    lower = text.lower()
    for url in urls:
        domain = get_domain(url)
        if not domain:
            continue

        registrable = get_registrable_domain(domain) or domain
        subdomain = _subdomain_part(domain)
        normalized_domain = domain.replace("-", "").replace(".", "")
        sub_tokens = _domain_tokens(subdomain)
        root_tokens = _domain_tokens(registrable)

        for entity in OFFICIAL_ENTITIES:
            keyword_match = any(keyword in lower for keyword in entity["keywords"])
            domain_keyword_match = any(keyword.replace(" ", "") in normalized_domain for keyword in entity["keywords"])
            official_match = _domain_matches_official(domain, entity["official_domains"])

            if (keyword_match or domain_keyword_match) and not official_match:
                findings.append(
                    {
                        "type": "official_entity_impersonation",
                        "detail": (
                            f'The message references "{entity["name"]}" but links to the non-official domain '
                            f'"{domain}" (registered domain: "{registrable}").'
                        ),
                        "severity": "high",
                    }
                )

            for keyword in entity["keywords"]:
                if " " in keyword:
                    continue
                if keyword in sub_tokens and keyword not in root_tokens and not official_match:
                    findings.append(
                        {
                            "type": "subdomain_impersonation",
                            "detail": (
                                f'The domain "{domain}" places the trusted term "{keyword}" in a subdomain while the '
                                f'actual registered domain is "{registrable}".'
                            ),
                            "severity": "high",
                        }
                    )
                    break
    return findings


def check_homoglyphs(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    homoglyph_map = {"0": "o", "1": "l", "rn": "m", "vv": "w"}
    for url in urls:
        domain = get_domain(url)
        if domain:
            for trusted in TRUSTED_DOMAINS:
                brand = trusted.split(".")[0]
                if len(brand) < 3:
                    continue
                if brand not in domain:
                    for fake, real in homoglyph_map.items():
                        variation = brand.replace(real, fake)
                        if variation in domain:
                            findings.append(
                                {
                                    "type": "homoglyph",
                                    "detail": f'URL "{domain}" looks like "{trusted}" but uses character substitution',
                                    "severity": "high",
                                }
                            )
    return findings


def check_shortened_urls(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for url in urls:
        domain = get_domain(url)
        if domain and domain in SHORTENED_URL_DOMAINS:
            findings.append(
                {
                    "type": "shortened_url",
                    "detail": f'Uses URL shortener "{domain}" to hide the real destination',
                    "severity": "medium",
                }
            )
    return findings


def check_ip_urls(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for url in urls:
        domain = get_domain(url)
        if domain and re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", domain):
            findings.append(
                {
                    "type": "ip_address_url",
                    "detail": f"URL uses raw IP address ({domain}) instead of a domain name",
                    "severity": "high",
                }
            )
    return findings


def check_excessive_subdomains(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for url in urls:
        domain = get_domain(url)
        if domain:
            parts = domain.split(".")
            if len(parts) >= 4:
                findings.append(
                    {
                        "type": "excessive_subdomains",
                        "detail": f"URL has suspicious number of subdomains: {domain}",
                        "severity": "medium",
                    }
                )
    return findings


def check_phishtank(urls: list[str]) -> list[dict[str, str]]:
    """Check URLs against the local PhishTank export."""
    phishtank_urls = load_phishtank_urls()
    if not phishtank_urls:
        return []

    findings: list[dict[str, str]] = []
    for url in urls:
        normalized = url.lower().rstrip("/")
        if normalized in phishtank_urls:
            domain = get_domain(url) or url
            findings.append(
                {
                    "type": "phishtank_match",
                    "detail": f'URL "{domain}" is a CONFIRMED phishing site (PhishTank database)',
                    "severity": "high",
                }
            )
    return findings


def build_url_evidence(urls: list[str]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for url in urls:
        normalized = normalize_url_input(url)
        domain = get_domain(normalized)
        if not domain:
            continue

        parts = domain.split(".")
        registrable = get_registrable_domain(domain) or domain
        evidence.append(
            {
                "normalized_url": normalized,
                "domain": domain,
                "registrable_domain": registrable,
                "subdomain": _subdomain_part(domain),
                "tld": "." + parts[-1] if parts else "",
                "subdomain_count": len(parts) - 2 if len(parts) > 2 else 0,
                "is_raw_ip": bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", domain)),
                "is_shortened": domain in SHORTENED_URL_DOMAINS,
            }
        )
    return evidence


def check_live_destination_signals(inspections: list[dict[str, Any]]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []

    for inspection in inspections:
        if not inspection.get("inspection_succeeded"):
            continue

        original_domain = inspection.get("domain") or ""
        original_registrable = inspection.get("registrable_domain") or original_domain
        final_domain = inspection.get("final_domain") or original_domain
        final_registrable = inspection.get("final_registrable_domain") or final_domain
        redirect_chain = inspection.get("redirect_chain") or []
        redirect_count = len(redirect_chain)
        page_title = str(inspection.get("page_title") or "")
        page_excerpt = str(inspection.get("page_excerpt") or "")
        page_text = f"{page_title} {page_excerpt}".lower()
        login_keywords = inspection.get("login_keywords") or []
        password_fields = int(inspection.get("password_field_count") or 0)
        final_url = str(inspection.get("final_url") or inspection.get("normalized_url") or "")

        if redirect_count >= 2:
            findings.append(
                {
                    "type": "multi_hop_redirect",
                    "detail": f'The URL redirected {redirect_count} times before loading the final destination "{final_domain}".',
                    "severity": "medium",
                }
            )

        if final_registrable and original_registrable and final_registrable != original_registrable:
            findings.append(
                {
                    "type": "cross_domain_redirect",
                    "detail": (
                        f'The URL started on "{original_domain}" but ultimately redirected to the different '
                        f'registered domain "{final_registrable}".'
                    ),
                    "severity": "high" if password_fields > 0 else "medium",
                }
            )

        if inspection.get("meta_refresh_target"):
            findings.append(
                {
                    "type": "meta_refresh_redirect",
                    "detail": "The landing page uses a meta refresh redirect, which is commonly used to conceal the real destination.",
                    "severity": "medium",
                }
            )

        if inspection.get("external_form_action"):
            findings.append(
                {
                    "type": "external_form_action",
                    "detail": "The landing page contains a form that submits data to a different domain than the page you opened.",
                    "severity": "high",
                }
            )

        if final_url.startswith("http://"):
            findings.append(
                {
                    "type": "insecure_destination",
                    "detail": f'The final destination uses insecure HTTP instead of HTTPS: "{final_url}".',
                    "severity": "high" if password_fields > 0 else "medium",
                }
            )

        if password_fields > 0:
            final_is_trusted = _domain_matches_official(final_domain, TRUSTED_DOMAINS)
            suspicious_tld = any(final_domain.endswith(tld) for tld in SUSPICIOUS_TLDS)
            if not final_is_trusted or suspicious_tld or inspection.get("external_form_action"):
                findings.append(
                    {
                        "type": "login_form",
                        "detail": (
                            f'The destination page asks for credentials or login details on the domain "{final_domain}".'
                        ),
                        "severity": "high" if suspicious_tld or inspection.get("external_form_action") else "medium",
                    }
                )

        for entity in OFFICIAL_ENTITIES:
            if any(keyword in page_text for keyword in entity["keywords"]) and not _domain_matches_official(final_domain, entity["official_domains"]):
                findings.append(
                    {
                        "type": "page_brand_impersonation",
                        "detail": f'The landing page references "{entity["name"]}" while the final domain is "{final_domain}".',
                        "severity": "high",
                    }
                )
                break

        if login_keywords and password_fields == 0 and any(keyword in page_text for keyword in ("verify", "billing", "payment")):
            findings.append(
                {
                    "type": "credential_lure_page",
                    "detail": f'The landing page uses account-verification or payment language on "{final_domain}".',
                    "severity": "medium",
                }
            )

    return findings


def build_evidence_buckets(findings: list[dict[str, str]], inspections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    bucket_map = {
        "reputation": {"phishtank_match"},
        "destination": {
            "multi_hop_redirect",
            "cross_domain_redirect",
            "meta_refresh_redirect",
            "external_form_action",
            "insecure_destination",
            "login_form",
            "page_brand_impersonation",
            "credential_lure_page",
        },
    }

    buckets: list[dict[str, Any]] = []
    for key in ("structural", "reputation", "destination"):
        bucket_findings = [
            item
            for item in findings
            if (
                key == "structural"
                and item["type"] not in bucket_map["reputation"]
                and item["type"] not in bucket_map["destination"]
            )
            or (key != "structural" and item["type"] in bucket_map[key])
        ]
        score = sum(3 if item["severity"] == "high" else 2 if item["severity"] == "medium" else 1 for item in bucket_findings)
        summary = (
            "No findings recorded."
            if not bucket_findings
            else bucket_findings[0]["detail"]
        )
        if key == "destination" and inspections and not bucket_findings:
            summary = "Live destination inspection completed without additional page-behavior warnings."
        if key == "destination" and not inspections:
            summary = "Live destination inspection was not available for this scan."

        buckets.append(
            {
                "key": key,
                "score": score,
                "finding_count": len(bucket_findings),
                "summary": summary,
                "inspected": key != "destination" or bool(inspections),
            }
        )
    return buckets


def check_screenshot_visual_signals(screenshot_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if not screenshot_metadata:
        return findings

    visual_signals = screenshot_metadata.get("visual_signals")
    if not isinstance(visual_signals, list):
        return findings

    for item in visual_signals:
        if not isinstance(item, dict):
            continue

        signal_type = str(item.get("type") or "").strip()
        detail = str(item.get("detail") or "").strip()
        severity = str(item.get("severity") or "medium").strip().lower()
        mapped_type = SCREENSHOT_VISUAL_FINDING_TYPES.get(signal_type)

        if not mapped_type or not detail:
            continue
        if severity not in {"low", "medium", "high"}:
            severity = "medium"

        findings.append(
            {
                "type": mapped_type,
                "detail": detail,
                "severity": severity,
            }
        )

    return findings


def check_qr_account_lure(text: str, screenshot_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not screenshot_metadata or not screenshot_metadata.get("qr_detected"):
        return []

    lower = text.lower()
    matched = [phrase for phrase in QR_ACCOUNT_LURE_PHRASES if phrase in lower]
    if not matched:
        return []

    if len(matched) >= 2:
        return [
            {
                "type": "qr_account_lure",
                "detail": f'The screenshot asks the user to scan a QR code for account verification or re-authentication: "{matched[0]}", "{matched[1]}".',
                "severity": "high",
            }
        ]

    return [
        {
            "type": "qr_account_lure",
            "detail": f'The screenshot uses a QR-based account or security prompt: "{matched[0]}".',
            "severity": "medium",
        }
    ]


def run_heuristics(
    text: str,
    enable_live_url_checks: bool = False,
    screenshot_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run the existing local phishing heuristics with the original scoring model."""
    urls = extract_urls(text)
    live_url_inspection = inspect_url_destinations(urls) if enable_live_url_checks and urls else []
    findings = (
        check_phishtank(urls)
        + check_domain_mismatch(text, urls)
        + check_suspicious_tlds(urls)
        + check_deadline_conflicts(text)
        + check_urgency(text)
        + check_legal_threats(text, urls)
        + check_credential_asks(text)
        + check_sender_spoofing(text)
        + check_official_entity_impersonation(text, urls)
        + check_homoglyphs(urls)
        + check_shortened_urls(urls)
        + check_ip_urls(urls)
        + check_excessive_subdomains(urls)
        + check_live_destination_signals(live_url_inspection)
        + check_screenshot_visual_signals(screenshot_metadata)
        + check_qr_account_lure(text, screenshot_metadata)
    )

    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for finding in findings:
        key = f"{finding['type']}:{finding['detail']}"
        if key not in seen:
            seen.add(key)
            unique.append(finding)

    score = sum(3 if item["severity"] == "high" else 2 if item["severity"] == "medium" else 1 for item in unique)
    return {
        "findings": unique,
        "score": score,
        "urls": urls,
        "url_evidence": build_url_evidence(urls),
        "live_url_inspection": live_url_inspection,
        "evidence_buckets": build_evidence_buckets(unique, live_url_inspection),
    }
