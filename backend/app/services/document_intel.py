from __future__ import annotations

import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from .domain_utils import domain_matches_official, get_domain, get_registrable_domain, normalize_url_input
from .ocr import extract_text_from_image
from .service_data import detection_rule_list, official_entities

try:
    import cv2  # type: ignore[import-not-found]
    import numpy as np  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional runtime dependency
    cv2 = None
    np = None

try:
    from pypdf import PdfReader  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional runtime dependency
    PdfReader = None

try:
    import fitz  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional runtime dependency
    fitz = None


DOCUMENT_CTA_PHRASES = tuple(detection_rule_list("document_cta_phrases")) or (
    "review document",
    "review now",
    "open secure file",
    "open",
    "sign document",
    "sign now",
    "download",
    "download attachment",
    "view file",
    "view document",
    "open invoice",
)
SUSPICIOUS_TLDS = tuple(detection_rule_list("suspicious_tlds"))
SHORTENED_URL_DOMAINS = set(detection_rule_list("shortened_url_domains"))
OFFICIAL_ENTITIES = official_entities()

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".docm", ".xlsm"}
MACRO_ENABLED_EXTENSIONS = {".docm", ".xlsm", ".pptm", ".xlsb"}
OCR_PAGE_LIMIT = 5

WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
DOCX_REL_ATTRIBUTE = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
PACKAGE_REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
SHEET_NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SHEET_REL_ATTRIBUTE = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def _extract_inline_urls(text: str) -> list[str]:
    pattern = r'https?://[^\s<>"\')\]]+|www\.[^\s<>"\')\]]+'
    urls = re.findall(pattern, text, re.IGNORECASE)
    return [("http://" + url if url.lower().startswith("www.") else url) for url in urls]


def _dedupe_strings(items: list[str], *, limit: int | None = None) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for item in items:
        normalized = item.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(normalized)
        if limit is not None and len(unique) >= limit:
            break
    return unique


def _excerpt(text: str, limit: int = 1200) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def _subdomain_count(domain: str) -> int:
    parts = domain.split(".")
    return len(parts) - 2 if len(parts) > 2 else 0


def _claimed_entity(display_text: str) -> tuple[str | None, bool]:
    lower = display_text.lower()
    for entity in OFFICIAL_ENTITIES:
        if any(keyword in lower for keyword in entity["keywords"]):
            return entity["name"], True
    return None, False


def _build_link_pair(display_text: str, target_url: str) -> dict[str, Any]:
    normalized_target = normalize_url_input(target_url)
    target_domain = get_domain(normalized_target) or ""
    registrable_domain = get_registrable_domain(target_domain) or target_domain
    display_domain = get_domain(normalize_url_input(display_text)) if re.search(r"(https?://|www\.)", display_text, re.IGNORECASE) else ""
    claimed_entity, matched_entity = _claimed_entity(display_text)
    official_match = False
    if claimed_entity and target_domain:
        for entity in OFFICIAL_ENTITIES:
            if entity["name"] == claimed_entity:
                official_match = domain_matches_official(target_domain, entity["official_domains"])
                break

    display_target_mismatch = False
    if display_domain and target_domain:
        display_target_mismatch = (
            (get_registrable_domain(display_domain) or display_domain) != registrable_domain
        )
    elif matched_entity and target_domain:
        display_target_mismatch = not official_match

    lower_display = display_text.lower()
    is_call_to_action = any(phrase in lower_display for phrase in DOCUMENT_CTA_PHRASES)

    return {
        "display_text": display_text.strip() or target_url.strip(),
        "target_url": normalized_target,
        "target_domain": target_domain,
        "registrable_domain": registrable_domain,
        "display_domain": display_domain or None,
        "claimed_entity": claimed_entity,
        "official_match": official_match,
        "display_target_mismatch": display_target_mismatch,
        "is_call_to_action": is_call_to_action,
        "is_shortened": target_domain in SHORTENED_URL_DOMAINS if target_domain else False,
        "is_raw_ip": bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", target_domain)),
        "suspicious_tld": any(target_domain.endswith(tld) for tld in SUSPICIOUS_TLDS) if target_domain else False,
        "subdomain_count": _subdomain_count(target_domain) if target_domain else 0,
    }


def _decode_qr_payloads(images: list[bytes]) -> tuple[list[str], list[str]]:
    if not images:
        return [], []
    if cv2 is None or np is None:
        return [], ["QR-code inspection support is unavailable in the current backend environment."]

    detector = cv2.QRCodeDetector()
    payloads: list[str] = []
    limitations: list[str] = []

    for blob in images[:10]:
        try:
            image = cv2.imdecode(np.frombuffer(blob, dtype=np.uint8), cv2.IMREAD_COLOR)
        except Exception:
            image = None
        if image is None:
            continue

        try:
            ok, decoded_multi, _, _ = detector.detectAndDecodeMulti(image)
            if ok and decoded_multi is not None:
                payloads.extend(_dedupe_strings([str(item) for item in decoded_multi if str(item).strip()]))
                continue
        except Exception:
            pass

        try:
            decoded_single, _, _ = detector.detectAndDecode(image)
            if decoded_single:
                payloads.append(str(decoded_single))
        except Exception:
            continue

    return _dedupe_strings(payloads, limit=6), limitations


def _render_pdf_pages_for_ocr(file_bytes: bytes, page_limit: int = OCR_PAGE_LIMIT) -> tuple[list[bytes], int, list[str]]:
    if fitz is None:
        return [], 0, [
            "Rendered-page OCR fallback for image-based PDFs is unavailable in the current backend environment."
        ]

    try:
        document = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        return [], 0, [f"CyberCoach could not render this PDF for OCR fallback: {exc}"]

    rendered_pages: list[bytes] = []
    limitations: list[str] = []
    total_pages = document.page_count

    try:
        for index in range(min(total_pages, page_limit)):
            page = document.load_page(index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8), alpha=False)
            rendered_pages.append(pixmap.tobytes("png"))
    finally:
        document.close()

    if total_pages > page_limit:
        limitations.append(
            f"Only the first {page_limit} pages were checked with OCR fallback to keep the scan responsive."
        )

    return rendered_pages, total_pages, limitations


def _run_image_ocr(images: list[bytes], language: str) -> tuple[str, list[str], int]:
    text_parts: list[str] = []
    limitations: list[str] = []
    pages_with_text = 0

    for image_bytes in images:
        extracted_text, ocr_metadata = extract_text_from_image(image_bytes, media_type="image/png", language=language)
        cleaned = (extracted_text or "").strip()
        if cleaned:
            text_parts.append(cleaned)
            pages_with_text += 1
            continue

        reason = str((ocr_metadata or {}).get("reason") or "").strip()
        if reason == "Screenshot analysis requires an Anthropic or OpenRouter API key.":
            reason = "Rendered-page OCR fallback requires an Anthropic or OpenRouter API key."
        if reason and reason not in limitations:
            limitations.append(reason)

    return "\n\n".join(part for part in text_parts if part).strip(), limitations, pages_with_text


def _archive_relationships(archive: zipfile.ZipFile, part_name: str) -> dict[str, str]:
    rel_path = str((Path(part_name).parent / "_rels" / f"{Path(part_name).name}.rels")).replace("\\", "/")
    if rel_path not in archive.namelist():
        return {}

    try:
        root = ET.fromstring(archive.read(rel_path))
    except Exception:
        return {}

    relationships: dict[str, str] = {}
    for node in root.findall(f"{PACKAGE_REL_NS}Relationship"):
        rel_id = str(node.attrib.get("Id") or "").strip()
        target = str(node.attrib.get("Target") or "").strip()
        target_mode = str(node.attrib.get("TargetMode") or "").strip().lower()
        if rel_id and target and target_mode == "external":
            relationships[rel_id] = target
    return relationships


def _is_macro_enabled_archive(archive: zipfile.ZipFile) -> bool:
    for name in archive.namelist():
        normalized = name.lower()
        if normalized.endswith("vbaproject.bin"):
            return True
        if "/macrosheets/" in normalized or "/dialogsheets/" in normalized:
            return True
    return False


def _parse_pdf(file_bytes: bytes, filename: str, media_type: str, language: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "file_name": filename,
        "file_type": "pdf",
        "media_type": media_type,
        "file_size": len(file_bytes),
        "parser": "pypdf" if PdfReader is not None else "pdf-fallback",
        "inspectable": True,
        "protected": False,
        "partial_analysis": False,
        "image_based": False,
        "macro_enabled": False,
        "page_count": None,
        "section_count": None,
        "image_count": 0,
        "text_truncated": False,
        "text_preview": "",
        "extracted_text": "",
        "ocr_text": "",
        "ocr_fallback_used": False,
        "ocr_pages_analyzed": 0,
        "ocr_page_limit": OCR_PAGE_LIMIT,
        "extracted_urls": [],
        "link_pairs": [],
        "qr_payloads": [],
        "limitations": [],
    }

    if PdfReader is None:
        decoded = file_bytes.decode("latin-1", errors="ignore")
        urls = _extract_inline_urls(decoded)
        metadata["inspectable"] = False
        metadata["partial_analysis"] = True
        metadata["limitations"].append(
            "PDF deep parsing support is not installed in this backend yet, so CyberCoach could only inspect obvious embedded URLs."
        )
        metadata["extracted_urls"] = _dedupe_strings(urls, limit=20)
        metadata["link_pairs"] = [_build_link_pair(url, url) for url in metadata["extracted_urls"]]
        metadata["text_preview"] = "PDF text extraction was unavailable in this environment."
        return metadata

    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        metadata["inspectable"] = False
        metadata["partial_analysis"] = True
        metadata["limitations"].append(f"CyberCoach could not parse this PDF: {exc}")
        return metadata

    if getattr(reader, "is_encrypted", False):
        metadata["inspectable"] = False
        metadata["protected"] = True
        metadata["partial_analysis"] = True
        metadata["limitations"].append(
            "This PDF appears to be password-protected or encrypted, so CyberCoach could not fully inspect its contents."
        )
        return metadata

    text_parts: list[str] = []
    urls: list[str] = []
    images: list[bytes] = []
    link_pairs: list[dict[str, Any]] = []
    metadata["page_count"] = len(reader.pages)

    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text.strip():
            text_parts.append(text.strip())

        try:
            annotations = page.get("/Annots") or []
        except Exception:
            annotations = []

        for annotation in annotations:
            try:
                annotation_obj = annotation.get_object() if hasattr(annotation, "get_object") else annotation
                action = annotation_obj.get("/A")
                action_obj = action.get_object() if hasattr(action, "get_object") else action
                uri = str(action_obj.get("/URI") or "").strip() if action_obj else ""
                if not uri:
                    continue
                label = str(annotation_obj.get("/Contents") or annotation_obj.get("/TU") or "").strip()
                urls.append(uri)
                link_pairs.append(_build_link_pair(label or uri, uri))
            except Exception:
                continue

        if hasattr(page, "images"):
            try:
                for image in page.images:
                    blob = getattr(image, "data", b"")
                    if blob:
                        images.append(blob)
            except Exception:
                pass

    combined_text = "\n\n".join(text_parts).strip()
    inline_urls = _extract_inline_urls(combined_text)
    urls = _dedupe_strings(urls + inline_urls, limit=30)
    existing_targets = {item["target_url"] for item in link_pairs}
    for url in urls:
        normalized = normalize_url_input(url)
        if normalized not in existing_targets:
            link_pairs.append(_build_link_pair(url, normalized))
            existing_targets.add(normalized)
            existing_targets.add(normalized)

    qr_payloads, qr_limitations = _decode_qr_payloads(images)
    metadata["image_count"] = len(images)
    metadata["qr_payloads"] = qr_payloads
    metadata["limitations"].extend(qr_limitations)

    if not combined_text and metadata["page_count"]:
        metadata["image_based"] = True
        metadata["partial_analysis"] = True
        metadata["limitations"].append(
            "This PDF appears to be image-based or scanned. CyberCoach could inspect embedded links and images, but the visible text could not be extracted deeply."
        )

        rendered_pages, _, render_limitations = _render_pdf_pages_for_ocr(file_bytes)
        metadata["limitations"].extend(render_limitations)
        metadata["ocr_pages_analyzed"] = len(rendered_pages)

        if rendered_pages:
            rendered_qr_payloads, rendered_qr_limitations = _decode_qr_payloads(rendered_pages)
            metadata["limitations"].extend(rendered_qr_limitations)
            metadata["qr_payloads"] = _dedupe_strings(metadata["qr_payloads"] + rendered_qr_payloads, limit=6)

            ocr_text, ocr_limitations, pages_with_text = _run_image_ocr(rendered_pages, language)
            metadata["limitations"].extend(ocr_limitations)
            metadata["ocr_pages_analyzed"] = max(metadata["ocr_pages_analyzed"], pages_with_text)
            metadata["ocr_text"] = ocr_text
            metadata["ocr_fallback_used"] = bool(ocr_text)
            if ocr_text:
                metadata["extracted_text"] = ocr_text
                metadata["text_preview"] = _excerpt(ocr_text)
                inline_ocr_urls = _extract_inline_urls(ocr_text)
                merged_urls = _dedupe_strings(metadata["extracted_urls"] + inline_ocr_urls, limit=30)
                metadata["extracted_urls"] = merged_urls
                existing_targets = {item["target_url"] for item in link_pairs}
                for url in merged_urls:
                    normalized = normalize_url_input(url)
                    if normalized not in existing_targets:
                        link_pairs.append(_build_link_pair(url, normalized))
                        existing_targets.add(normalized)
            else:
                metadata["limitations"].append(
                    "CyberCoach could not extract readable text from the rendered PDF pages, so the result remains partial."
                )

    if not metadata["extracted_text"]:
        metadata["extracted_text"] = combined_text
    metadata["text_preview"] = (
        metadata["text_preview"]
        or (_excerpt(combined_text) if combined_text else "No extractable PDF text was available.")
    )
    metadata["extracted_urls"] = _dedupe_strings(metadata["extracted_urls"] + urls, limit=30)
    metadata["link_pairs"] = link_pairs[:12]
    metadata["limitations"] = _dedupe_strings(metadata["limitations"], limit=12)
    return metadata


def _docx_relationships(archive: zipfile.ZipFile, part_name: str) -> dict[str, str]:
    return _archive_relationships(archive, part_name)


def _docx_part_text(root: ET.Element) -> list[str]:
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", WORD_NS):
        text = "".join((node.text or "") for node in paragraph.findall(".//w:t", WORD_NS)).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def _docx_part_links(root: ET.Element, relationships: dict[str, str]) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    for hyperlink in root.findall(".//w:hyperlink", WORD_NS):
        rel_id = hyperlink.attrib.get(DOCX_REL_ATTRIBUTE)
        target = relationships.get(rel_id or "")
        if not target:
            continue
        display_text = "".join((node.text or "") for node in hyperlink.findall(".//w:t", WORD_NS)).strip()
        links.append(_build_link_pair(display_text or target, target))
    return links


def _parse_word_document(file_bytes: bytes, filename: str, media_type: str, suffix: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "file_name": filename,
        "file_type": suffix.lstrip("."),
        "media_type": media_type,
        "file_size": len(file_bytes),
        "parser": "docx-xml",
        "inspectable": True,
        "protected": False,
        "partial_analysis": False,
        "image_based": False,
        "macro_enabled": suffix in MACRO_ENABLED_EXTENSIONS,
        "page_count": None,
        "section_count": None,
        "image_count": 0,
        "text_truncated": False,
        "text_preview": "",
        "extracted_text": "",
        "ocr_text": "",
        "ocr_fallback_used": False,
        "ocr_pages_analyzed": 0,
        "ocr_page_limit": OCR_PAGE_LIMIT,
        "extracted_urls": [],
        "link_pairs": [],
        "qr_payloads": [],
        "limitations": [],
    }

    try:
        archive = zipfile.ZipFile(BytesIO(file_bytes))
    except zipfile.BadZipFile:
        metadata["inspectable"] = False
        metadata["protected"] = True
        metadata["partial_analysis"] = True
        metadata["limitations"].append(
            "This Office document could not be opened as a standard DOCX file. It may be protected, corrupted, or use an unsupported format."
        )
        return metadata

    macro_enabled = metadata["macro_enabled"] or _is_macro_enabled_archive(archive)
    metadata["macro_enabled"] = macro_enabled
    if macro_enabled:
        metadata["partial_analysis"] = True
        metadata["limitations"].append(
            "This Office document is macro-enabled. CyberCoach inspected visible text and linked destinations, but it did not execute or emulate macros."
        )

    part_names = [
        name
        for name in archive.namelist()
        if name.startswith("word/")
        and name.endswith(".xml")
        and "/_rels/" not in name
        and Path(name).name.startswith(("document", "header", "footer", "footnotes", "endnotes"))
    ]

    text_parts: list[str] = []
    link_pairs: list[dict[str, Any]] = []
    for part_name in part_names:
        try:
            root = ET.fromstring(archive.read(part_name))
        except Exception:
            continue
        text_parts.extend(_docx_part_text(root))
        link_pairs.extend(_docx_part_links(root, _docx_relationships(archive, part_name)))

    images = []
    for name in archive.namelist():
        if name.startswith("word/media/") and name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp")):
            try:
                images.append(archive.read(name))
            except Exception:
                continue

    combined_text = "\n\n".join(text_parts).strip()
    urls = _dedupe_strings(
        [item["target_url"] for item in link_pairs] + _extract_inline_urls(combined_text),
        limit=30,
    )
    existing_targets = {item["target_url"] for item in link_pairs}
    for url in urls:
        normalized = normalize_url_input(url)
        if normalized not in existing_targets:
            link_pairs.append(_build_link_pair(url, normalized))

    qr_payloads, qr_limitations = _decode_qr_payloads(images)
    metadata["image_count"] = len(images)
    metadata["section_count"] = len(text_parts)
    metadata["qr_payloads"] = qr_payloads
    metadata["limitations"].extend(qr_limitations)
    metadata["extracted_text"] = combined_text
    metadata["text_preview"] = (
        _excerpt(combined_text)
        if combined_text
        else f'No extractable {str(metadata["file_type"]).upper()} text was available.'
    )
    metadata["extracted_urls"] = urls
    metadata["link_pairs"] = link_pairs[:12]
    metadata["limitations"] = _dedupe_strings(metadata["limitations"], limit=12)
    return metadata


def _xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except Exception:
        return []

    values: list[str] = []
    for item in root.findall(".//x:si", SHEET_NS):
        text = "".join((node.text or "") for node in item.findall(".//x:t", SHEET_NS)).strip()
        values.append(text)
    return values


def _xlsx_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = str(cell.attrib.get("t") or "").strip().lower()
    if cell_type == "inlineStr":
        return "".join((node.text or "") for node in cell.findall(".//x:t", SHEET_NS)).strip()

    value_node = cell.find("x:v", SHEET_NS)
    value = str(value_node.text or "").strip() if value_node is not None else ""
    if not value:
        return ""
    if cell_type == "s":
        try:
            return shared_strings[int(value)].strip()
        except (ValueError, IndexError):
            return value
    return value


def _parse_xlsm(file_bytes: bytes, filename: str, media_type: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "file_name": filename,
        "file_type": "xlsm",
        "media_type": media_type,
        "file_size": len(file_bytes),
        "parser": "excel-xml",
        "inspectable": True,
        "protected": False,
        "partial_analysis": True,
        "image_based": False,
        "macro_enabled": True,
        "page_count": None,
        "section_count": None,
        "image_count": 0,
        "text_truncated": False,
        "text_preview": "",
        "extracted_text": "",
        "ocr_text": "",
        "ocr_fallback_used": False,
        "ocr_pages_analyzed": 0,
        "ocr_page_limit": OCR_PAGE_LIMIT,
        "extracted_urls": [],
        "link_pairs": [],
        "qr_payloads": [],
        "limitations": [
            "This spreadsheet is macro-enabled. CyberCoach inspected visible workbook text and linked destinations, but it did not execute macros or calculate formula results."
        ],
    }

    try:
        archive = zipfile.ZipFile(BytesIO(file_bytes))
    except zipfile.BadZipFile:
        metadata["inspectable"] = False
        metadata["protected"] = True
        metadata["limitations"].append(
            "This spreadsheet could not be opened as a standard XLSM file. It may be protected, corrupted, or use an unsupported format."
        )
        return metadata

    metadata["macro_enabled"] = True
    shared_strings = _xlsx_shared_strings(archive)
    sheet_names = [
        name
        for name in archive.namelist()
        if name.startswith("xl/worksheets/")
        and name.endswith(".xml")
        and "/_rels/" not in name
    ]

    text_parts: list[str] = []
    link_pairs: list[dict[str, Any]] = []
    for part_name in sheet_names:
        try:
            root = ET.fromstring(archive.read(part_name))
        except Exception:
            continue

        cell_text_by_ref: dict[str, str] = {}
        for cell in root.findall(".//x:c", SHEET_NS):
            cell_ref = str(cell.attrib.get("r") or "").strip()
            value = _xlsx_cell_value(cell, shared_strings)
            if value:
                text_parts.append(value)
                if cell_ref:
                    cell_text_by_ref[cell_ref] = value

        relationships = _archive_relationships(archive, part_name)
        for hyperlink in root.findall(".//x:hyperlink", SHEET_NS):
            rel_id = hyperlink.attrib.get(SHEET_REL_ATTRIBUTE)
            target = relationships.get(rel_id or "")
            if not target:
                continue
            ref = str(hyperlink.attrib.get("ref") or "").strip()
            display_text = cell_text_by_ref.get(ref.split(":")[0], "")
            link_pairs.append(_build_link_pair(display_text or target, target))

    images = []
    for name in archive.namelist():
        if name.startswith("xl/media/") and name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp")):
            try:
                images.append(archive.read(name))
            except Exception:
                continue

    combined_text = "\n\n".join(text_parts).strip()
    urls = _dedupe_strings(
        [item["target_url"] for item in link_pairs] + _extract_inline_urls(combined_text),
        limit=30,
    )
    existing_targets = {item["target_url"] for item in link_pairs}
    for url in urls:
        normalized = normalize_url_input(url)
        if normalized not in existing_targets:
            link_pairs.append(_build_link_pair(url, normalized))
            existing_targets.add(normalized)

    qr_payloads, qr_limitations = _decode_qr_payloads(images)
    metadata["image_count"] = len(images)
    metadata["section_count"] = len(sheet_names)
    metadata["qr_payloads"] = qr_payloads
    metadata["limitations"].extend(qr_limitations)
    metadata["extracted_text"] = combined_text
    metadata["text_preview"] = _excerpt(combined_text) if combined_text else "No extractable spreadsheet text was available."
    metadata["extracted_urls"] = urls
    metadata["link_pairs"] = link_pairs[:12]
    metadata["limitations"] = _dedupe_strings(metadata["limitations"], limit=12)
    return metadata


def extract_document_artifacts(
    file_bytes: bytes,
    filename: str,
    media_type: str = "application/octet-stream",
    language: str = "English",
) -> dict[str, Any]:
    """Extract text, links, QR payloads, and inspection metadata from supported documents."""
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError("Deep Document Phishing Scanner currently supports PDF, DOCX, DOCM, and XLSM files.")

    if suffix == ".pdf":
        return _parse_pdf(file_bytes, filename, media_type, language)
    if suffix in {".docx", ".docm"}:
        return _parse_word_document(file_bytes, filename, media_type, suffix)
    return _parse_xlsm(file_bytes, filename, media_type)
