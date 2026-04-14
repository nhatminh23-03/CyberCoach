from __future__ import annotations

import math
import wave
import zipfile
from io import BytesIO
from typing import Iterable
from xml.sax.saxutils import escape

import fitz
from pypdf import PdfReader, PdfWriter


def png_with_text(lines: Iterable[str], *, width: int = 1200, height: int = 720) -> bytes:
    document = fitz.open()
    page = document.new_page(width=width, height=height)
    y = 96
    for line in lines:
        page.insert_text((72, y), str(line), fontsize=28, fontname="helv", fill=(0, 0, 0))
        y += 48
    pixmap = page.get_pixmap(alpha=False)
    data = pixmap.tobytes("png")
    document.close()
    return data


def pdf_with_text_and_links(
    *,
    paragraphs: Iterable[str],
    links: list[tuple[str, str]] | None = None,
) -> bytes:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    y = 72
    for paragraph in paragraphs:
        page.insert_textbox(fitz.Rect(72, y, 540, y + 80), str(paragraph), fontsize=12, fontname="helv")
        y += 72
    for display_text, target_url in links or []:
        rect = fitz.Rect(72, y, 420, y + 24)
        page.insert_textbox(rect, display_text, fontsize=12, fontname="helv", fill=(0, 0, 1))
        page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": target_url})
        y += 30
    data = document.tobytes()
    document.close()
    return data


def image_only_pdf(lines: Iterable[str]) -> bytes:
    image_bytes = png_with_text(lines, width=1200, height=900)
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.insert_image(fitz.Rect(36, 36, 576, 756), stream=image_bytes)
    data = document.tobytes()
    document.close()
    return data


def encrypted_pdf(paragraphs: Iterable[str], password: str = "secret") -> bytes:
    base_pdf = pdf_with_text_and_links(paragraphs=paragraphs)
    reader = PdfReader(BytesIO(base_pdf))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def wav_tone_bytes(*, seconds: float = 1.0, frequency: float = 440.0, sample_rate: int = 16000) -> bytes:
    frame_total = max(1, int(seconds * sample_rate))
    amplitude = 16000
    buffer = BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for index in range(frame_total):
            sample = int(amplitude * math.sin(2 * math.pi * frequency * index / sample_rate))
            frames.extend(sample.to_bytes(2, byteorder="little", signed=True))
        wav_file.writeframes(bytes(frames))
    return buffer.getvalue()


def _content_types_xml(macro_enabled: bool) -> str:
    macro_override = (
        '<Override PartName="/word/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject" />'
        if macro_enabled
        else ""
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />'
        '<Default Extension="xml" ContentType="application/xml" />'
        '<Default Extension="png" ContentType="image/png" />'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" />'
        f"{macro_override}"
        "</Types>"
    )


def _package_rels_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml" />'
        "</Relationships>"
    )


def _word_document_xml(paragraphs: list[str], links: list[tuple[str, str]], include_image: bool) -> tuple[str, list[tuple[str, str]]]:
    rels: list[tuple[str, str]] = []
    body_parts: list[str] = []

    def paragraph_xml(content: str) -> str:
        return f"<w:p><w:r><w:t xml:space=\"preserve\">{escape(content)}</w:t></w:r></w:p>"

    for paragraph in paragraphs:
        body_parts.append(paragraph_xml(paragraph))

    for index, (display_text, target_url) in enumerate(links, start=1):
        rel_id = f"rId{index}"
        rels.append((rel_id, target_url))
        body_parts.append(
            "<w:p><w:hyperlink r:id=\"{rid}\"><w:r><w:rPr><w:color w:val=\"0563C1\" />"
            "<w:u w:val=\"single\" /></w:rPr><w:t xml:space=\"preserve\">{text}</w:t></w:r></w:hyperlink></w:p>".format(
                rid=rel_id,
                text=escape(display_text),
            )
        )

    if include_image:
        body_parts.append(
            '<w:p><w:r><w:drawing>'
            '<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            "<wp:extent cx=\"1905000\" cy=\"1905000\" />"
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:blipFill><a:blip r:embed="rIdImage1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" /></pic:blipFill>'
            "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
        )

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<w:body>{''.join(body_parts)}</w:body>"
        "</w:document>"
    )
    return document_xml, rels


def _word_relationships_xml(link_relationships: list[tuple[str, str]], include_image: bool) -> str:
    items = [
        '<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
        'Target="{target}" TargetMode="External" />'.format(rid=rid, target=escape(target))
        for rid, target in link_relationships
    ]
    if include_image:
        items.append(
            '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            'Target="media/image1.png" />'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{''.join(items)}"
        "</Relationships>"
    )


def docx_bytes(
    *,
    paragraphs: Iterable[str],
    links: list[tuple[str, str]] | None = None,
    qr_payload: str | None = None,
    macro_enabled: bool = False,
) -> bytes:
    paragraphs_list = [str(item) for item in paragraphs]
    links_list = list(links or [])
    include_image = bool(qr_payload)
    document_xml, link_relationships = _word_document_xml(paragraphs_list, links_list, include_image)
    qr_image = png_qr_payload(qr_payload) if qr_payload else None
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _content_types_xml(macro_enabled))
        archive.writestr("_rels/.rels", _package_rels_xml())
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("word/_rels/document.xml.rels", _word_relationships_xml(link_relationships, include_image))
        if qr_image:
            archive.writestr("word/media/image1.png", qr_image)
        if macro_enabled:
            archive.writestr("word/vbaProject.bin", b"CyberCoach macro placeholder")
    return buffer.getvalue()


def xlsm_bytes() -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />'
            '<Default Extension="xml" ContentType="application/xml" />'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />'
            '<Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject" />'
            "</Types>",
        )
        archive.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="xl/workbook.xml" />'
            "</Relationships>",
        )
        archive.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets /></workbook>',
        )
        archive.writestr("xl/vbaProject.bin", b"CyberCoach spreadsheet macro placeholder")
    return buffer.getvalue()


def unsupported_binary(name: str = "unsupported.bin") -> tuple[str, bytes]:
    return name, b"unsupported-content"


def png_qr_payload(payload: str) -> bytes:
    return png_with_text([f"QR payload: {payload}"], width=420, height=420)
