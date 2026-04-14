from __future__ import annotations

import socket

from backend.app.services import url_intel


def test_url_inspection_blocks_localhost_targets():
    payload = url_intel.inspect_url_destination("http://localhost/login")

    assert payload["inspection_attempted"] is False
    assert payload["blocked_reason"] == "Local destinations are not inspected."


def test_url_inspection_blocks_private_ip_targets():
    payload = url_intel.inspect_url_destination("http://192.168.1.7/admin")

    assert payload["inspection_attempted"] is False
    assert "private" in payload["blocked_reason"].lower()


def test_url_inspection_blocks_link_local_and_reserved_ips():
    link_local = url_intel.inspect_url_destination("http://169.254.169.254/latest/meta-data")
    reserved = url_intel.inspect_url_destination("http://0.0.0.0/internal")

    assert "link-local" in link_local["blocked_reason"].lower()
    assert "reserved" in reserved["blocked_reason"].lower()


def test_url_inspection_rejects_unresolved_hosts(monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        raise socket.gaierror("no such host")

    monkeypatch.setattr(url_intel.socket, "getaddrinfo", fake_getaddrinfo)

    payload = url_intel.inspect_url_destination("https://definitely-not-a-real-host.invalid/path")

    assert payload["inspection_attempted"] is False
    assert payload["blocked_reason"] == "The hostname could not be resolved safely."


def test_url_inspection_rejects_mixed_public_private_dns_answers(monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        return [
            (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", 443)),
            (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("10.0.0.7", 443)),
        ]

    monkeypatch.setattr(url_intel.socket, "getaddrinfo", fake_getaddrinfo)

    payload = url_intel.inspect_url_destination("https://mixed-dns.example/login")

    assert payload["inspection_attempted"] is False
    assert "private" in payload["blocked_reason"].lower()


def test_url_inspection_rejects_urls_with_embedded_credentials():
    payload = url_intel.inspect_url_destination("https://user:pass@example.com/login")

    assert payload["inspection_attempted"] is False
    assert payload["blocked_reason"] == "URLs with embedded credentials are not inspected."


def test_url_inspection_rejects_invalid_ports():
    payload = url_intel.inspect_url_destination("https://example.com:99999/login")

    assert payload["inspection_attempted"] is False
    assert payload["blocked_reason"] == "The URL contains an invalid port."
