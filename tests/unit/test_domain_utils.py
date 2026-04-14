from __future__ import annotations

from backend.app.services.domain_utils import (
    domain_matches_official,
    domain_tokens,
    get_domain,
    get_registrable_domain,
    normalize_url_input,
    subdomain_part,
)


def test_normalize_url_input_adds_https_for_bare_domains():
    assert normalize_url_input("paypal.com/security") == "https://paypal.com/security"


def test_get_domain_and_registrable_domain_handle_multi_part_suffixes():
    domain = get_domain("https://alerts.hmrc.gov.uk.security-check.co.uk/login")

    assert domain == "alerts.hmrc.gov.uk.security-check.co.uk"
    assert get_registrable_domain(domain) == "security-check.co.uk"
    assert subdomain_part(domain) == "alerts.hmrc.gov.uk"


def test_domain_tokens_and_official_matching_cover_user_visible_cases():
    assert domain_tokens("PayPal-security_check-login") >= {"paypal", "security", "check", "login"}
    assert domain_matches_official("login.microsoft.com", ["microsoft.com"])
    assert not domain_matches_official("microsoft-login.co", ["microsoft.com"])
