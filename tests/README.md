# CyberCoach Test Strategy

CyberCoach now has a layered automated test foundation so we can validate both scan quality and product behavior without relying on a handful of smoke checks.

## What is covered

- Backend unit tests for:
  - PII redaction
  - URL parsing and metadata extraction
  - heuristic triggers for message, URL, document, and voice analysis
  - document parsing and partial-analysis paths
  - report generation
  - deterministic golden outputs for high-signal regression cases
- Backend integration tests for:
  - `POST /api/scan/message`
  - `POST /api/scan/url`
  - `POST /api/scan/screenshot`
  - `POST /api/scan/document`
  - `POST /api/scan/voice/start`
  - `POST /api/scan/voice/update`
  - `POST /api/scan/voice/finalize`
  - `POST /api/scan/voice/upload`
  - `GET /api/scan/history`
  - `GET /api/scan/url-precheck`
  - `POST /api/report`
- High-priority regression coverage now explicitly includes:
  - privacy-mode redaction surviving into any opt-in history persistence
  - oversized message, transcript, screenshot, document, voice, and report payload rejection
  - route-level SSRF blocking for local/private and mixed-DNS destinations
  - markdown export escaping for user-controlled content
  - real backend-backed smoke paths for message, URL, screenshot, document, and Call Guard upload/live flows
- Public scan history is intentionally disabled by default. `ENABLE_PUBLIC_SCAN_HISTORY` must be set explicitly for local-only experiments, because unscoped shared history is not safe for production.
- Production config validation now fails fast when:
  - backend production CORS is still pointed at localhost
  - `LLM_PROVIDER` is set in production without its required API key
  - frontend production builds are missing `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`
  - frontend production builds still point those API base URLs at localhost
- Frontend/Vitest tests for:
  - homepage quick-scan routing
  - homepage URL-vs-message detection behavior
  - scan route `autorun` plumbing
  - shared adapter/report formatting behavior
- Playwright end-to-end foundation for:
  - homepage quick scan into message/url flows
  - non-real-time result discovery and `See Results` CTA behavior
- Optional live-model tests that only run when a real model key is configured

## Test layout

```text
tests/
  README.md
  conftest.py
  fixtures/
    text/messages.json
    urls/urls.json
    voice/transcripts.json
  helpers/
    asset_factory.py
    fixtures.py
  integration/
    test_scan_api.py
    test_upload_and_edge_cases.py
  live/
    test_live_model_analysis.py
  snapshots/
    heuristic_golden.json
  unit/
    test_analysis_golden.py
    test_document_intel.py
    test_domain_utils.py
    test_heuristics.py
    test_pii.py
    test_reports.py
  frontend/
    quick-scan-bar.test.tsx
    scan-adapters.test.ts
    scan-routes.test.tsx
  e2e/
    backend-mocks.ts
    home-quick-scan.spec.ts
    result-discovery.spec.ts
```

## Fixture strategy

### Static fixtures

These live in `tests/fixtures/` and define the reusable story library for the suite:

- suspicious and benign text messages
- suspicious and benign URLs
- suspicious and benign call transcripts
- stable golden expectations for deterministic fallback analysis

### Generated binary fixtures

Binary assets are generated programmatically in `tests/helpers/asset_factory.py` so the suite stays reproducible without manually maintaining lots of binary files:

- screenshot-like PNGs
- PDFs with links
- image-only PDFs
- encrypted PDFs
- DOCX/DOCM-style OOXML archives with embedded links
- XLSM-style macro-enabled archives
- small WAV files for Call Guard upload tests

This keeps the tests portable while still exercising realistic upload paths.

## How to run

### Backend unit + integration tests

```bash
npm run test:backend
```

This uses the project `.venv` and runs the pytest suite.

### Frontend Vitest suite

```bash
npm run test:frontend
```

This covers homepage routing logic, route plumbing, and shared adapter/report behavior.

### Full local default suite

```bash
npm test
```

This runs frontend tests first, then backend pytest.

### End-to-end tests

```bash
npm run test:e2e
```

Playwright uses mocked API responses for the browser flows, so the backend does not need to be running.

If Playwright browsers are not installed yet, run:

```bash
npx playwright install chromium
```

### Optional live-model tests

```bash
.venv/bin/python -m pytest tests/live -m live_model
```

These tests are skipped automatically when no supported provider key is configured.

They are intentionally separate from normal local runs because they depend on:

- live API credentials
- network access
- non-deterministic model phrasing

## Live-model environment

Any normal CyberCoach provider configuration can enable the live suite, for example:

- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- optional `LLM_PROVIDER`

The live tests only assert broad semantic expectations such as:

- risky fixtures return `Suspicious` or `High Risk`
- summaries are populated
- actions contain practical cautionary guidance

They do not pin exact wording.

## Golden tests

`tests/snapshots/heuristic_golden.json` stores the stable expected shape for deterministic fallback scenarios.

These tests compare:

- scan type
- risk label
- expected finding types
- important summary fragments
- important action fragments

This is strict enough to catch real regressions while still avoiding overfitting to prose.

## Current limits

- Screenshot OCR is API-dependent in this app, so automated screenshot tests use manual OCR override text unless live-model tests are enabled.
- Voice upload transcription is also API-dependent, so the default suite uses transcript overrides for deterministic coverage.
- Playwright e2e tests are implemented, but they still depend on local Chromium availability.
- Real browser microphone streaming for live Call Guard is not exercised in CI-style tests yet; the test foundation covers upload mode and backend live-session state transitions instead.

## Pre-Deploy Manual QA Checklist

- Homepage quick scan:
  - paste a normal message and confirm it routes to Message Scan and autoruns
  - paste a suspicious link and confirm it routes to URL Scan and autoruns
- Message Scan:
  - run one suspicious sample and one safe sample
  - verify privacy mode on/off changes returned content as expected
- URL Scan:
  - test one suspicious URL and one safe URL
  - confirm destination-check messaging looks correct when inspection is blocked or unavailable
- Screenshot Scan:
  - upload a screenshot with OCR override text
  - verify result cards, report actions, and privacy wording
- Document Scan:
  - upload a benign PDF/DOCX and a suspicious one with links
  - verify protected/image-only/macro-enabled edge cases if those formats are enabled in deploy
- Call Guard:
  - test upload-recording mode end to end
  - test live start, update, and finalize at least once in the deployed browser stack
- Reports:
  - export TXT and MD
  - confirm no broken markdown structure when inputs contain brackets, hashes, or link syntax
- Platform:
  - verify mobile/tablet layouts for homepage, one standard scan page, and Call Guard
  - verify backend health, provider connectivity, and production env validation on boot

## Remaining Known Gaps

- Real browser microphone capture and websocket live-stream behavior still need manual verification in the deployed browser/runtime combination.
- Optional live-model tests remain network- and provider-dependent, so they should stay non-blocking in CI.
- Playwright coverage still uses mocked backend responses for UI flows; it is best paired with the backend integration suite rather than treated as full-stack proof by itself.

## Why this foundation matters

This suite is meant to catch the types of regressions that matter most for CyberCoach:

- routing users into the wrong scan flow
- losing result-card content or structure
- weakening heuristics unexpectedly
- breaking upload endpoints
- regressing report generation
- returning malformed scan responses
- silently changing deterministic output on core scam fixtures
