# Scan Family Implementation Status

## Summary

This document captures the current implementation state of the CyberCoach scan-family alignment work and the deeper document-threat additions.

The work completed so far covers:

- scan-family result alignment for Screenshot Scan and URL Scan
- calmer URL destination-failure messaging
- richer screenshot visual-signal support
- deeper Document Scan support for image-based PDFs
- limited-inspection support for macro-enabled Office files

## What Is Implemented

### 1. Scan-family result alignment

Screenshot Scan and URL Scan now follow the same high-level CyberCoach result flow already used by the shared scan family:

- risk summary
- recommended actions
- key findings
- technical evidence
- scan-specific evidence
- report actions

Session history is kept in the right rail instead of being mixed into the main result area.

### 2. Screenshot Scan improvements

Screenshot Scan still keeps its own specialized evidence modules, including:

- OCR confidence
- OCR warnings
- visual cues
- QR payload review
- editable extracted text with manual rescan

The screenshot visual-signal vocabulary has been expanded to support:

- browser chrome or suspicious address-bar context
- banking or payment-app overlays
- notification or banner prompts
- cropped context warnings
- partial login screens

These signals are intended to surface as plain-language findings instead of raw internal tags.

### 3. URL Scan improvements

URL Scan now presents destination-inspection failures more calmly in the main UI.

Instead of exposing raw transport-style errors directly in the destination card, the user sees clearer states such as:

- destination lookup blocked
- destination lookup unavailable in this environment
- destination lookup timed out
- destination hostname could not be resolved

Lower-level error detail is still preserved in technical evidence and downloadable reports.

### 4. Document Scan depth

Document Scan now supports:

- `PDF`
- `DOCX`
- `DOCM`
- `XLSM`

#### PDF

- Standard PDFs still use deep parsing first.
- If a PDF appears image-based or scanned, CyberCoach now renders up to 5 pages and attempts OCR/QR inspection through the existing image-analysis path.
- If OCR succeeds, the document result includes OCR-fallback coverage metadata.
- If OCR cannot complete, the result remains clearly marked as partial.

#### DOCM / XLSM

- Macro-enabled Office files are now accepted instead of hard-rejected.
- They are treated as limited-inspection documents.
- Macro presence is surfaced as an explicit risk signal.
- CyberCoach does not execute macros.

### 5. Reporting and shared metadata

Shared scan/report plumbing has been extended so document results can include:

- macro-enabled status
- OCR-fallback usage
- OCR page coverage
- document limitations

## Key Runtime Notes

### Backend dependency added

`PyMuPDF` has been added to `requirements.txt` and installed into the project `.venv` so image-based PDF rendering is available locally.

### Current environment limitation

The current backend environment still cannot reach the configured OpenRouter endpoint. Because of that:

- screenshot vision extraction can fall back or remain partial
- image-based PDF OCR fallback can render pages, but OCR may still fail when the model endpoint is unreachable
- scan classification can still proceed through heuristics/fallback logic

This is an environment/network issue, not a frontend layout issue.

## Verification Completed

The following checks were completed successfully:

- `npm run build`
- Python syntax compilation for backend files

Smoke-tested paths:

- suspicious `DOCX` sample still returns `High Risk`
- `DOCM` sample path is accepted and marked `macro_enabled: true`
- `XLSM` sample path is accepted and marked `macro_enabled: true`
- image-based PDF fallback path executes and reports partial inspection when OCR cannot complete

## Main Files Touched

Backend:

- `backend/app/services/document_intel.py`
- `backend/app/services/analyzer.py`
- `backend/app/services/heuristics.py`
- `backend/app/services/llm.py`
- `backend/app/services/reports.py`
- `backend/app/data/detection_rules.json`

Frontend:

- `components/scan/ScreenshotScanResults.tsx`
- `components/scan/UrlScanResults.tsx`
- `components/scan/DocumentScanPage.tsx`
- `components/scan/ScanResults.tsx`
- `lib/scan.ts`

Environment:

- `requirements.txt`

## What Still Needs Attention

### 1. Restart backend after dependency changes

If the backend is already running, restart it with the project venv:

```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 2. Re-test screenshot and image-PDF OCR once model/network access is healthy

When the LLM provider is reachable again, verify:

- screenshot OCR quality
- screenshot visual-signal richness
- image-based PDF OCR extraction quality
- QR extraction continuity in rendered-page fallback

### 3. Optional next improvements

Recommended next pass:

- add calmer localized copy for the new destination lookup states across all supported languages
- add dedicated UI badges for partial destination inspection
- expand document evidence cards for OCR coverage details
- test against real image-based phishing PDFs and payroll/invoice samples

## Notes

The repo already uses a `docs/` folder, so this note is stored there instead of creating a separate `doc/` directory.
