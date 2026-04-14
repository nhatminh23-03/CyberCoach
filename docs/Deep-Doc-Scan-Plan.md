# Deep Document Phishing Scanner

## Summary

Add a first-class `Document Scan` mode to CyberCoach for suspicious `PDF` and `DOCX` uploads. The feature will parse documents server-side, extract text/links/images, run document-specific phishing heuristics plus existing URL/credential/urgency logic, and return the same explainable CyberCoach-style result family: risk label, likely scam pattern, summary, findings, actions, technical evidence, quick tip, and report actions.

Defaults chosen:
- v1 supports `PDF` and `DOCX` only
- preview is an x-ray panel, not full document rendering
- image-based PDFs are handled gracefully with a limitation message and screenshot-scan fallback guidance
- password-protected/encrypted documents return a `Suspicious` result with limited-inspection messaging
- QR detection is best-effort for embedded images in both PDF and DOCX
- document scan works without an LLM; AI enrichment remains optional

## Implementation Changes

### Frontend

- Add a dedicated route and page for document scanning, preferably `/scan/document`, and update existing document entry points to use it instead of the current placeholder query-param flow.
- Create a `DocumentScanPage` using the same scan-family structure as URL/Screenshot:
  - premium upload area for `PDF` and `DOCX`
  - privacy mode and language controls
  - document x-ray preview panel showing file metadata, extracted text snippets, extracted links, QR findings, and inspection limitations
  - result region with risk summary, findings, recommended actions, technical evidence, and report actions
- Add a document-specific results component that reuses existing shared result shells/badges/buttons where possible, but includes document-only panels:
  - extracted links with display-text vs destination mismatches
  - suspicious CTA/button findings
  - QR payload findings
  - inspection limitations such as encrypted or image-only files
- Update scan navigation and homepage scan vectors so Document Scan is no longer marked “Soon” and routes into the real flow.
- Extend `lib/scan.ts` to support `scan_type: "document"` and a document metadata section exposed to the UI.

### Backend API and shared types

- Add `POST /api/scan/document` in FastAPI and a matching Next.js proxy route under `app/api/scan/document/route.ts`.
- Extend shared response typing so unified scan responses support `document` alongside `message`, `url`, and `screenshot`.
- Add a document-upload request path using multipart form data with:
  - uploaded file
  - language
  - privacy mode
- Extend scan capabilities if helpful for the UI, but keep document scan generally available even when no AI provider is configured. Only image/vision enrichment should be capability-gated.

### Document parsing and detection pipeline

- Add a dedicated backend document-analysis service that:
  - validates file type and size
  - parses `PDF` via a PDF parser library
  - parses `DOCX` via a DOCX parser/library plus OOXML relationship inspection
  - extracts visible text
  - extracts hyperlinks and link targets
  - captures display text vs actual destination mismatches
  - extracts embedded images where possible for QR detection
  - flags encrypted/protected or partially inspectable files
- Recommended dependency set:
  - `pypdf` for PDF text, annotations, metadata, and image extraction where available
  - `python-docx` plus OOXML relationship/media inspection for DOCX text, hyperlinks, and embedded images
  - `opencv-python-headless` for backend QR detection on extracted images
- Build a normalized document analysis object with fields such as:
  - file name, type, size
  - page/section count where available
  - extracted text preview
  - extracted URLs
  - link display-target pairs
  - QR payloads
  - inspection status and limitations
  - document-specific findings
- Feed the normalized text plus extracted URLs/QR payloads into the existing heuristic and optional LLM pipeline, but prepend document context so the classifier understands it is analyzing an uploaded document rather than a message.
- Add document-specific heuristic rules for:
  - fake CTA phrases like `Review Document`, `Open Secure File`, `View Invoice`, `Sign`, `Download`, `Open`
  - invoice/payment pressure language
  - login/password/account verification prompts
  - document-brand impersonation for Microsoft, SharePoint, OneDrive, DocuSign, Google Drive, payroll/HR, invoice, and bank-style forms
  - link text that claims a trusted brand while pointing to a mismatched domain
  - shortened URLs, suspicious TLDs, excessive subdomains, raw IPs, and PhishTank matches on extracted destinations
- Return a unified response with a `metadata.document` section containing parsed-document evidence and limitations. Extend report generation so document reports include document-specific evidence sections when present.

### UX and copy behavior

- Keep the experience aligned with current CyberCoach philosophy:
  - simple upload-first workflow
  - calm, non-technical language
  - explainability before jargon
  - clear next-step guidance
  - copy/download report actions
- Use “Deep Document Phishing Scanner” in primary page copy, but keep scan-family naming consistent in nav and summaries.
- For encrypted/protected files:
  - do not hard-fail the UX
  - return a `Suspicious` assessment with explicit wording that the document could not be fully inspected and should be verified through another trusted channel
- For image-only PDFs:
  - do not run full OCR in v1
  - return partial analysis with a clear limitation note and recommend Screenshot Scan for deeper visual review
- For unsupported files outside v1 scope:
  - reject with a clear upload validation message instead of pretending to analyze them

## Public Interfaces / Type Changes

- Add `document` to the backend `ScanResponse.scan_type` literal and matching frontend response unions.
- Add a new document upload API route:
  - `POST /api/scan/document`
  - multipart form fields: `file`, `language`, `privacy_mode`
- Add `metadata.document` to unified scan payloads with structured document evidence, including:
  - `file_name`, `file_type`, `file_size`
  - `protected`, `inspectable`, `image_based`, `partial_analysis`
  - `text_preview`
  - `links`
  - `display_target_mismatches`
  - `cta_findings`
  - `qr_payloads`
  - `document_findings`
  - `limitations`
- Extend report formatting to render document evidence when `scan_type === "document"`.

## Test Plan

- Upload a benign PDF with no links or phishing language and verify a low-risk or safe-style result with no false document-specific findings.
- Upload a phishing-style PDF with a fake DocuSign or SharePoint CTA pointing to an unrelated domain and verify:
  - mismatched-link finding
  - brand impersonation signal
  - elevated risk label
  - practical actions
- Upload a DOCX with invoice/payment pressure language and a shortened URL and verify document + URL heuristics combine correctly.
- Upload a PDF or DOCX with embedded QR code pointing to a suspicious destination and verify QR extraction plus destination findings appear in technical evidence.
- Upload an encrypted/password-protected PDF and verify the result is `Suspicious` with limited-inspection messaging instead of a generic failure.
- Upload an image-only PDF and verify graceful fallback messaging recommends Screenshot Scan.
- Upload an unsupported file type such as `DOCM` or `XLSM` and verify clear v1 rejection messaging.
- Verify report copy/download actions still work for document results.
- Verify navigation, homepage vector entry, sidebar entry, and direct route loading all reach the real Document Scan page.
- Verify document scan still works without an LLM key using parser + heuristics only.

## Assumptions

- v1 does not implement full rendered document viewing; “preview” means document x-ray evidence and extracted-content preview.
- Macro-enabled Office file analysis is deferred because the chosen MVP scope is `PDF` + `DOCX` only.
- QR detection is best-effort and should not block overall analysis if image extraction fails.
- Existing shared result and report systems should be extended, not replaced, to keep the scan family consistent.
- The implementation may add focused backend parser dependencies as part of the feature.
