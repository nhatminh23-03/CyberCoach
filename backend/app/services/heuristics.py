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
DOCUMENT_CTA_PHRASES = detection_rule_list("document_cta_phrases") or [
    "review document",
    "review now",
    "open secure file",
    "open document",
    "sign document",
    "sign now",
    "download",
    "download invoice",
    "view file",
    "view document",
]
INVOICE_PRESSURE_PHRASES = detection_rule_list("invoice_pressure_phrases") or [
    "invoice",
    "payment due",
    "past due",
    "wire transfer",
    "remittance",
    "balance due",
    "overdue payment",
    "payment required",
    "accounts payable",
    "bank transfer",
]
VOICE_FAMILY_EMERGENCY_PHRASES = [
    "this is your grandson",
    "this is your granddaughter",
    "i'm in jail",
    "i'm at the hospital",
    "i was in an accident",
    "don't tell anyone",
    "please don't call my parents",
    "i need bail",
]
VOICE_BANK_IMPERSONATION_PHRASES = [
    "fraud department",
    "security team",
    "bank account",
    "bank security",
    "card was used",
    "credit card account",
    "discover card",
    "card member services",
    "underwriting department",
    "interest rate reduction",
    "suspicious charge",
    "account alert",
]
VOICE_GOVERNMENT_IMPERSONATION_PHRASES = [
    "police department",
    "detective",
    "social security",
    "irs",
    "customs",
    "court order",
    "government agency",
]
VOICE_PAYMENT_REQUEST_PHRASES = [
    "gift card",
    "wire transfer",
    "zelle",
    "cash app",
    "venmo",
    "bitcoin",
    "crypto",
    "send the money",
]
VOICE_SECRECY_PHRASES = [
    "keep this between us",
    "don't tell anyone",
    "stay on the line",
    "do not hang up",
    "keep this secret",
]
VOICE_OTP_PHRASES = [
    "one-time code",
    "verification code",
    "security code",
    "six digit code",
    "otp",
    "read me the code",
]
VOICE_CALL_CONTROL_PHRASES = [
    "do not hang up",
    "stay on the line",
    "don't call the bank",
    "don't call anyone",
    "transfer it right now",
    "open your banking app",
]
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
    successful_inspections = [item for item in inspections if item.get("inspection_succeeded")]
    partial_inspections = [
        item
        for item in inspections
        if item.get("blocked_reason") or (item.get("error") and not item.get("inspection_succeeded"))
    ]
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
        summary = "No additional warning signs were recorded here." if not bucket_findings else bucket_findings[0]["detail"]
        if key == "destination" and partial_inspections and not successful_inspections:
            summary = "CyberCoach could not complete the destination check from this environment, so this part of the link remains only partially reviewed."
        if key == "destination" and successful_inspections and not bucket_findings:
            summary = "CyberCoach completed the destination check without finding additional page-behavior warnings."
        if key == "destination" and not inspections:
            summary = "A destination check was not available for this scan."

        buckets.append(
            {
                "key": key,
                "score": score,
                "finding_count": len(bucket_findings),
                "summary": summary,
                "inspected": key != "destination" or bool(successful_inspections),
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


def check_document_link_mismatch(document_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not document_metadata:
        return []

    findings: list[dict[str, str]] = []
    for pair in document_metadata.get("link_pairs", []):
        if not isinstance(pair, dict) or not pair.get("display_target_mismatch"):
            continue

        display_text = str(pair.get("display_text") or "document link").strip()
        target_domain = str(pair.get("target_domain") or pair.get("target_url") or "").strip()
        claimed_entity = str(pair.get("claimed_entity") or "").strip()
        severity = "high" if claimed_entity else "medium"
        detail = (
            f'The document presents "{display_text}" as a trusted action, but the real destination is "{target_domain}".'
            if claimed_entity or str(pair.get("display_domain") or "").strip()
            else f'The document link text "{display_text}" does not match its real destination "{target_domain}".'
        )
        findings.append(
            {
                "type": "document_link_mismatch",
                "detail": detail,
                "severity": severity,
            }
        )
    return findings


def check_document_deceptive_ctas(document_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not document_metadata:
        return []

    findings: list[dict[str, str]] = []
    for pair in document_metadata.get("link_pairs", []):
        if not isinstance(pair, dict) or not pair.get("is_call_to_action"):
            continue

        target_domain = str(pair.get("target_domain") or "").strip()
        if not target_domain:
            continue

        if not (
            pair.get("display_target_mismatch")
            or pair.get("is_shortened")
            or pair.get("is_raw_ip")
            or pair.get("suspicious_tld")
            or int(pair.get("subdomain_count") or 0) >= 2
        ):
            continue

        findings.append(
            {
                "type": "document_deceptive_cta",
                "detail": (
                    f'The document includes a clickable prompt like "{pair.get("display_text", "Open")}" '
                    f'that leads to the risky destination "{target_domain}".'
                ),
                "severity": "high",
            }
        )
    return findings


def check_invoice_payment_pressure(text: str, document_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not document_metadata:
        return []

    lower = text.lower()
    matched = [phrase for phrase in INVOICE_PRESSURE_PHRASES if phrase in lower]
    if len(matched) < 2:
        return []

    linked_destinations = document_metadata.get("extracted_urls") or []
    return [
        {
            "type": "invoice_payment_pressure",
            "detail": (
                f'The document uses invoice or payment-pressure language such as "{matched[0]}" and "{matched[1]}".'
                + (" It also includes outbound links or destinations for action." if linked_destinations else "")
            ),
            "severity": "high" if linked_destinations else "medium",
        }
    ]


def check_document_qr_payloads(document_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not document_metadata:
        return []

    payloads = [str(item).strip() for item in document_metadata.get("qr_payloads", []) if str(item).strip()]
    if not payloads:
        return []

    findings: list[dict[str, str]] = []
    for payload in payloads[:2]:
        findings.append(
            {
                "type": "document_qr_payload",
                "detail": f'The document contains a QR code that resolves to "{payload}".',
                "severity": "low",
            }
        )
    return findings


def check_document_limitations(document_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not document_metadata:
        return []

    findings: list[dict[str, str]] = []
    if document_metadata.get("protected"):
        findings.append(
            {
                "type": "document_protected",
                "detail": "The document appears to be encrypted or password-protected, so CyberCoach could not fully inspect it.",
                "severity": "high",
            }
        )
    if document_metadata.get("macro_enabled"):
        findings.append(
            {
                "type": "document_macro_enabled",
                "detail": "This document is macro-enabled. Unexpected macro-enabled Office files are commonly used to deliver malware or steal credentials.",
                "severity": "high",
            }
        )
    if document_metadata.get("image_based"):
        findings.append(
            {
                "type": "document_partial_analysis" if document_metadata.get("ocr_fallback_used") else "document_image_only",
                "detail": (
                    "This document appears to be image-based or scanned. CyberCoach used OCR fallback, but the result should still be treated as a partial review."
                    if document_metadata.get("ocr_fallback_used")
                    else "This document appears to be image-based or scanned, which limits deeper text and link review."
                ),
                "severity": "medium" if document_metadata.get("ocr_fallback_used") else "high",
            }
        )
    if document_metadata.get("partial_analysis") and not findings:
        findings.append(
            {
                "type": "document_partial_analysis",
                "detail": "CyberCoach could only partially inspect this document, so the result should be verified cautiously.",
                "severity": "medium",
            }
        )
    return findings


def check_voice_family_emergency(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_FAMILY_EMERGENCY_PHRASES if phrase in lower]
    if len(matched) < 1:
        return []
    detail = (
        f'The call transcript uses family-emergency pressure such as "{matched[0]}".'
        if len(matched) == 1
        else f'The call transcript uses family-emergency pressure such as "{matched[0]}" and "{matched[1]}".'
    )
    return [{"type": "voice_family_emergency", "detail": detail, "severity": "high"}]


def check_voice_bank_impersonation(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_BANK_IMPERSONATION_PHRASES if phrase in lower]
    if len(matched) < 2:
        return []
    return [
        {
            "type": "voice_bank_impersonation",
            "detail": f'The caller claims financial-account authority using phrases like "{matched[0]}" and "{matched[1]}".',
            "severity": "high",
        }
    ]


def check_voice_government_impersonation(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_GOVERNMENT_IMPERSONATION_PHRASES if phrase in lower]
    if len(matched) < 2:
        return []
    return [
        {
            "type": "voice_government_impersonation",
            "detail": f'The caller uses official-pressure language such as "{matched[0]}" and "{matched[1]}".',
            "severity": "high",
        }
    ]


def check_voice_payment_request(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_PAYMENT_REQUEST_PHRASES if phrase in lower]
    if len(matched) < 1:
        return []
    severity = "high" if len(matched) >= 2 else "medium"
    detail = (
        f'The caller is pushing an immediate payment method such as "{matched[0]}".'
        if len(matched) == 1
        else f'The caller is pushing immediate payment methods like "{matched[0]}" and "{matched[1]}".'
    )
    return [{"type": "voice_payment_request", "detail": detail, "severity": severity}]


def check_voice_secrecy_pressure(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_SECRECY_PHRASES if phrase in lower]
    if len(matched) < 1:
        return []
    return [
        {
            "type": "voice_secrecy_pressure",
            "detail": f'The caller tries to isolate the listener with pressure such as "{matched[0]}".',
            "severity": "high" if len(matched) >= 2 else "medium",
        }
    ]


def check_voice_otp_request(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_OTP_PHRASES if phrase in lower]
    if len(matched) < 1:
        return []
    return [
        {
            "type": "voice_otp_request",
            "detail": f'The caller appears to be requesting a verification code or login token: "{matched[0]}".',
            "severity": "high",
        }
    ]


def check_voice_call_control(text: str) -> list[dict[str, str]]:
    lower = text.lower()
    matched = [phrase for phrase in VOICE_CALL_CONTROL_PHRASES if phrase in lower]
    if len(matched) < 1:
        return []
    return [
        {
            "type": "voice_call_control",
            "detail": f'The caller is trying to control the call flow with language like "{matched[0]}".',
            "severity": "medium",
        }
    ]


def check_voice_signal_findings(voice_metadata: dict[str, Any] | None) -> list[dict[str, str]]:
    if not voice_metadata:
        return []

    findings: list[dict[str, str]] = []
    for item in voice_metadata.get("voice_signals", []):
        if not isinstance(item, dict):
            continue
        signal_type = str(item.get("type") or "").strip()
        detail = str(item.get("detail") or "").strip()
        severity = str(item.get("severity") or "low").strip().lower()
        if not signal_type or not detail:
            continue
        if severity not in {"low", "medium", "high"}:
            severity = "low"
        findings.append(
            {
                "type": signal_type,
                "detail": detail,
                "severity": severity,
            }
        )
    return findings


def run_heuristics(
    text: str,
    enable_live_url_checks: bool = False,
    screenshot_metadata: dict[str, Any] | None = None,
    document_metadata: dict[str, Any] | None = None,
    voice_metadata: dict[str, Any] | None = None,
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
        + check_document_link_mismatch(document_metadata)
        + check_document_deceptive_ctas(document_metadata)
        + check_invoice_payment_pressure(text, document_metadata)
        + check_document_qr_payloads(document_metadata)
        + check_document_limitations(document_metadata)
        + check_voice_family_emergency(text)
        + check_voice_bank_impersonation(text)
        + check_voice_government_impersonation(text)
        + check_voice_payment_request(text)
        + check_voice_secrecy_pressure(text)
        + check_voice_otp_request(text)
        + check_voice_call_control(text)
        + check_voice_signal_findings(voice_metadata)
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
