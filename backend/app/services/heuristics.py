from __future__ import annotations

import csv
import random
import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from ..core.config import get_settings


URGENCY_PHRASES = [
    "act now", "immediate action", "urgent", "expires today", "limited time",
    "account will be closed", "suspended", "verify your account", "confirm your identity",
    "unauthorized access", "unusual activity", "click here immediately", "within 24 hours",
    "within 48 hours", "your account has been", "failure to respond", "final warning",
    "last chance", "don't miss out", "act immediately", "time sensitive", "expire soon",
]

CREDENTIAL_PHRASES = [
    "password", "login", "sign in", "verify your", "confirm your",
    "update your payment", "billing information", "social security",
    "credit card", "bank account", "ssn", "routing number", "pin number",
    "security question", "one-time code", "otp", "verification code",
]

SUSPICIOUS_TLDS = [
    ".xyz", ".top", ".buzz", ".click", ".link", ".info", ".tk", ".ml",
    ".ga", ".cf", ".gq", ".work", ".support", ".review", ".zip", ".mov",
]

TRUSTED_DOMAINS = [
    "google.com", "microsoft.com", "apple.com", "amazon.com", "paypal.com",
    "chase.com", "bankofamerica.com", "wellsfargo.com", "netflix.com",
    "facebook.com", "instagram.com", "twitter.com", "linkedin.com",
    "github.com", "dropbox.com", "adobe.com", "spotify.com",
    "usps.com", "ups.com", "fedex.com", "dhl.com", "irs.gov",
]

SHORTENED_URL_DOMAINS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bl.ink", "lnkd.in", "rb.gy", "shorturl.at",
    "tiny.cc", "v.gd", "qr.ae", "cutt.ly",
]

MESSAGE_SAMPLES = {
    "phishing_email": {
        "id": "phishing_email",
        "label": "Phishing email",
        "text": """From: Apple Support <security-alert@app1e-verify.xyz>
Subject: Your Apple ID has been suspended

Dear Customer,

We detected unusual activity on your Apple ID. Your account has been temporarily suspended.

To restore access, please verify your identity within 24 hours or your account will be permanently deleted.

Click here to verify: https://app1e-secure-login.xyz/verify?id=8372

If you do not take immediate action, you will lose access to all purchases and iCloud data.

Apple Support Team""",
    },
    "legit_newsletter": {
        "id": "legit_newsletter",
        "label": "Legit newsletter",
        "text": """From: GitHub <noreply@github.com>
Subject: [GitHub] Your monthly developer digest

Hey there!

Here's what happened in your repositories this month:
- 23 commits pushed to main branches
- 5 pull requests merged
- 2 new stars on your projects

Check out what's trending in open source this week on our Explore page.

Happy coding!
The GitHub Team

Unsubscribe: https://github.com/settings/notifications""",
    },
    "sms_scam": {
        "id": "sms_scam",
        "label": "SMS scam",
        "text": """USPS: Your package #US9514901185421 has a delivery problem. Update your address now to avoid return to sender: https://usps-redelivery.top/track?ref=9514901185421

Reply STOP to unsubscribe""",
    },
}


def _data_path(filename: str) -> Path:
    return get_settings().data_dir / filename


def normalize_url_input(url: str) -> str:
    """Normalize a URL the same way the original Streamlit URL tab does."""
    stripped = url.strip()
    if stripped and not stripped.startswith(("http://", "https://")):
        stripped = "https://" + stripped
    return stripped


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
    phishtank_urls = load_phishtank_urls()
    normalized_lookup = normalized_url.lower().rstrip("/")

    return {
        "normalized_url": normalized_url,
        "domain": domain,
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


def get_domain(url: str) -> str | None:
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return None
        return hostname.lower().removeprefix("www.")
    except Exception:
        return None


def check_domain_mismatch(text: str, urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for trusted in TRUSTED_DOMAINS:
        brand = trusted.split(".")[0]
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
            if brand in display_name and brand not in email_domain:
                findings.append(
                    {
                        "type": "sender_spoof",
                        "detail": f'Sender claims to be "{brand}" but email domain is "{email_domain}"',
                        "severity": "high",
                    }
                )
    return findings


def check_homoglyphs(urls: list[str]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    homoglyph_map = {"0": "o", "1": "l", "rn": "m", "vv": "w"}
    for url in urls:
        domain = get_domain(url)
        if domain:
            for trusted in TRUSTED_DOMAINS:
                brand = trusted.split(".")[0]
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


def run_heuristics(text: str) -> dict[str, Any]:
    """Run the existing local phishing heuristics with the original scoring model."""
    urls = extract_urls(text)
    findings = (
        check_phishtank(urls)
        + check_domain_mismatch(text, urls)
        + check_suspicious_tlds(urls)
        + check_urgency(text)
        + check_credential_asks(text)
        + check_sender_spoofing(text)
        + check_homoglyphs(urls)
        + check_shortened_urls(urls)
        + check_ip_urls(urls)
        + check_excessive_subdomains(urls)
    )

    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for finding in findings:
        key = f"{finding['type']}:{finding['detail']}"
        if key not in seen:
            seen.add(key)
            unique.append(finding)

    score = sum(3 if item["severity"] == "high" else 2 if item["severity"] == "medium" else 1 for item in unique)
    return {"findings": unique, "score": score, "urls": urls}
