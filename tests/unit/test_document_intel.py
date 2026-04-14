from __future__ import annotations

from pathlib import Path

from backend.app.services.document_intel import extract_document_artifacts
from tests.helpers.asset_factory import docx_bytes, encrypted_pdf, image_only_pdf, pdf_with_text_and_links, xlsm_bytes


def test_extract_document_artifacts_reads_docx_links_and_mismatches():
    payload = docx_bytes(
        paragraphs=[
            "Secure Document Review Request",
            "Review the attached invoice today to avoid service interruption.",
        ],
        links=[
            ("Open Secure File in SharePoint", "https://microsoft-sharepoint-secure-docs-login.co/verify"),
            ("Mobile Review Portal", "http://paypa1-security-check-login.com/review?id=88421"),
        ],
    )

    metadata = extract_document_artifacts(
        payload,
        filename="secure-review.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        language="English",
    )

    assert metadata["inspectable"] is True
    assert len(metadata["link_pairs"]) >= 2
    assert any(pair["display_target_mismatch"] for pair in metadata["link_pairs"])
    assert "sharepoint" in metadata["text_preview"].lower()


def test_extract_document_artifacts_flags_macro_enabled_archives():
    metadata = extract_document_artifacts(
        xlsm_bytes(),
        filename="invoice-review.xlsm",
        media_type="application/vnd.ms-excel.sheet.macroEnabled.12",
        language="English",
    )

    assert metadata["macro_enabled"] is True
    assert metadata["partial_analysis"] is True
    assert any("macro-enabled" in item.lower() for item in metadata["limitations"])


def test_extract_document_artifacts_marks_encrypted_pdfs_as_protected():
    payload = encrypted_pdf(["Protected billing notice", "Use the company portal to verify this document."])

    metadata = extract_document_artifacts(payload, filename="protected.pdf", media_type="application/pdf", language="English")

    assert metadata["protected"] is True
    assert metadata["inspectable"] is False
    assert any("password-protected" in item.lower() or "encrypted" in item.lower() for item in metadata["limitations"])


def test_extract_document_artifacts_marks_image_only_pdfs_for_partial_review():
    payload = image_only_pdf(
        [
            "Review document securely in SharePoint",
            "Scan the QR code or use the secure portal today",
        ]
    )

    metadata = extract_document_artifacts(payload, filename="scan-only.pdf", media_type="application/pdf", language="English")

    assert metadata["image_based"] is True
    assert metadata["partial_analysis"] is True
    assert any("image-based" in item.lower() or "scanned" in item.lower() for item in metadata["limitations"])


def test_existing_sample_docx_still_parses_when_present():
    sample_path = Path("test/document_scan_test_suspicious.docx")
    if not sample_path.exists():
        return

    metadata = extract_document_artifacts(
        sample_path.read_bytes(),
        filename=sample_path.name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        language="English",
    )

    assert metadata["file_name"] == sample_path.name
    assert metadata["link_pairs"]
