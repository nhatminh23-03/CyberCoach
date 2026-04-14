# CyberCoach App Analysis

Last updated: April 12, 2026

## Purpose

This document summarizes my current understanding of the CyberCoach codebase based on the main frontend routes, backend services, data files, and existing project notes.

It is intended to answer four questions:

1. What is this app?
2. What does it currently do?
3. What has already been implemented?
4. What still needs to be done?

## Executive Summary

CyberCoach is a scam and phishing analysis app for non-technical users.

The product is designed to let a user:

- paste a suspicious message
- inspect a suspicious URL before visiting it
- upload or capture a screenshot of suspicious content

The app then returns:

- a plain-language risk label
- a score and confidence level
- the likely scam pattern
- key reasons the content was flagged
- recommended next steps
- downloadable text or markdown reports

The current stack is:

- `Next.js 14` frontend
- `FastAPI` backend
- local heuristic analysis plus optional LLM-assisted analysis

The codebase is no longer centered on Streamlit for runtime behavior. The old Streamlit implementation is treated as a legacy source of truth and migration reference, while the actual working app in this repository is the Next.js + FastAPI system.

## My Understanding Of The App

CyberCoach is trying to solve a specific user problem: people often receive suspicious texts, emails, links, screenshots, or visual prompts and do not know whether they are safe. The app is designed to reduce panic and technical confusion by translating scam analysis into a guided editorial-style product experience.

The product has two layers:

- a premium frontend experience focused on trust, privacy, and clarity
- a backend analysis pipeline that combines heuristics, redaction, OCR, URL inspection, and model-assisted reasoning

The main product philosophy appears to be:

- default to clear explanations instead of raw security jargon
- preserve privacy with redaction before model analysis
- support useful results even without an AI provider key
- keep scan results actionable, not just descriptive

## Current Functional Areas

### 1. Homepage / Product Narrative

The homepage is a polished marketing and onboarding surface that introduces the product, its scan vectors, and the design language.

Current homepage behavior includes:

- hero section
- quick scan entry points
- interactive detection framework section
- editorial information section
- premium footer and navigation

The homepage is not just decorative. It helps route users into scan flows and explain the value of each scan mode.

### 2. Message Scan

This is the most complete flow.

Users can:

- paste suspicious text
- choose output language
- enable or disable privacy mode
- load preset message examples
- load a random phishing sample when the dataset is available
- run analysis
- view reasons, scores, and recommendations
- copy or download reports
- review session history and intel feed information

This is the strongest “core workflow” in the app today.

### 3. URL Scan

Users can:

- paste a suspicious URL
- see a pre-analysis metadata preview
- identify obvious issues like raw IPs or shorteners before full analysis
- run the full scan
- receive result cards, evidence, and report actions

The URL flow uses both a lightweight precheck and a deeper analysis path, which is a strong design choice because it gives the user fast signal before a full scan finishes.

### 4. Screenshot Scan

Users can:

- upload an image
- drag and drop a screenshot
- use browser camera capture where supported
- decode QR payloads client-side
- send the screenshot for OCR and scan analysis
- review screenshot-specific findings and report output

Important constraint:

- screenshot analysis depends on a configured LLM-capable provider key

This means the screenshot flow is more operationally fragile than the message and URL flows.

### 5. Report Generation

The app supports report export in:

- `.txt`
- `.md`

This is implemented server-side and exposed through the frontend as a download action.

### 6. Session History

The backend stores completed scan results in an in-memory history store with a configurable max size.

This supports:

- recent scan history in the UI
- session-style continuity during a running backend instance

Important limitation:

- history is not persistent across backend restarts

### 7. Intel Feed

The backend exposes a curated intel feed, which appears to combine:

- baseline curated intel content
- session telemetry / live scan-driven summaries

This gives the product a “global threat map / live intelligence” flavor, even though the underlying data source is currently local and backend-driven.

## Architecture Summary

## Frontend

Main areas:

- `app/`
- `components/home/`
- `components/scan/`
- `lib/`

Key frontend behavior:

- App Router pages for home and scan routes
- scan-specific client components
- a shared frontend adapter layer in `lib/scan.ts`
- same-origin Next.js API proxy routes so the browser does not call FastAPI directly

Important frontend patterns already in place:

- strong component separation
- shared scan result adapter model
- sessionStorage use for preserving recent scan inputs and settings
- responsive UI work
- premium visual consistency across major screens

## Backend

Main areas:

- `backend/app/api/routes/`
- `backend/app/services/`
- `backend/app/models/`
- `backend/app/core/`
- `backend/app/data/`

Backend responsibilities include:

- scan request handling
- heuristics orchestration
- privacy redaction
- URL metadata and live inspection behavior
- screenshot OCR / vision flow
- model provider routing
- report generation
- session history
- intel feed generation

## Request Flow

The request path is:

`Browser -> Next.js API route -> FastAPI backend -> service layer -> unified response -> frontend adapter -> result UI`

This is a good architectural direction because:

- the frontend stays decoupled from backend internals
- browser-side CORS complexity is reduced
- the backend remains reusable for future consumers

## Analysis Pipeline

The backend analysis flow currently appears to work like this:

1. Normalize the input.
2. Optionally redact PII when privacy mode is enabled.
3. Run local heuristics.
4. If an API key exists, run model-assisted analysis.
5. Merge heuristic and model outputs into a unified response.
6. Store the result in in-memory history.
7. Return a structured response to the frontend.

For screenshots, the flow first performs OCR / vision extraction and optionally enriches the scan with QR payloads and visual signal metadata.

## What Has Been Implemented

The following work is clearly implemented in the codebase today.

### Product Surface

- homepage
- message scan UI
- URL scan UI
- screenshot scan UI
- report downloads
- scan history display
- intel feed display
- multilingual output selection

### Backend Refactor

- FastAPI backend separated from the legacy Streamlit app
- modular route structure
- modular service structure
- request and response models
- environment-based configuration and secret loading

### Detection Logic

- local heuristic scoring
- URL normalization and precheck
- phishing dataset lookups
- privacy redaction
- LLM provider selection
- OpenRouter and Anthropic support
- dual-model consensus path for OpenRouter
- screenshot text extraction through provider-backed vision calls

### Frontend Integration

- Next.js API proxy routes for backend communication
- unified frontend response adaptation in `lib/scan.ts`
- editorial premium layout across home and scan pages
- responsive/mobile improvements noted in project docs

### Partial / Staged Product Areas

These areas are represented in the UI but are not full production features yet:

- AR Scanner
- Document Scan

They currently behave more like staged preview flows than completed scanning modules.

## What Still Needs To Be Done

Based on the code and current structure, these are the biggest remaining areas of work.

### 1. Persistent Storage

The app still relies on in-memory history.

What should be added:

- database-backed scan history
- optional saved reports
- persistent intel/session analytics
- user-specific history if accounts are introduced

### 2. Authentication And Multi-User Readiness

I did not find an auth layer or account model.

If this app is intended to move beyond a local or demo setup, it likely needs:

- authentication
- user/session ownership
- rate limiting
- abuse protection
- provider key management strategy

### 3. Screenshot Independence From Provider Availability

Screenshot scanning currently requires a configured AI provider key because OCR is provider-backed.

That creates a product gap:

- message and URL scan can still provide useful fallback behavior
- screenshot scan becomes unavailable without provider access

Good next work would be:

- local OCR fallback
- clearer degraded-mode UX
- capability-specific messaging before upload

### 4. AR Scanner And Document Scan Completion

These are visible in the product story but are not implemented as complete workflows.

To finish them, the app needs:

- dedicated backend routes
- dedicated analysis pipeline logic
- result schemas
- real UI workflows instead of preview/staged routing

### 5. Testing

I did not see an obvious automated test suite in the current repository structure.

The project would benefit from:

- backend unit tests for heuristics, PII redaction, URL parsing, and analyzer orchestration
- API route tests
- frontend component and integration tests
- smoke tests for the proxy layer

### 6. Production Hardening

Before treating this as production-ready, I would still want:

- stronger error telemetry
- structured logging
- retry and timeout strategy review for provider calls
- file upload limits and validation hardening
- deployment documentation
- CI checks for build and test steps

### 7. Better Source-Of-Truth Documentation

The repo has useful documentation, but some notes still refer to older architecture or migration states.

It would help to consolidate:

- current production architecture
- supported features
- staged features
- required environment variables
- known limitations

## Current Status Assessment

My overall assessment is:

- the app is already a credible working prototype and strong hackathon/demo product
- the message and URL flows are meaningfully implemented
- the screenshot flow is good but operationally dependent on provider setup
- the architecture is much healthier than a single-file app
- the main missing pieces are persistence, test coverage, and completion of staged scan modes

In other words:

- this is beyond a mockup
- it is not yet fully production-complete

## Recommended Next Steps

If the goal is to turn CyberCoach into a stronger production-ready app, I would prioritize work in this order:

1. Add persistent storage for scan history and report metadata.
2. Add test coverage for core backend logic and API routes.
3. Reduce screenshot dependence on external providers by adding local OCR fallback.
4. Finish either AR Scanner or Document Scan as the next real product vector.
5. Add operational hardening such as auth, telemetry, and CI.
6. Clean up and unify documentation so the current architecture is the clear source of truth.

## Key Files Reviewed

Frontend:

- `app/page.tsx`
- `app/scan/page.tsx`
- `components/scan/MessageScanPage.tsx`
- `components/scan/UrlScanPage.tsx`
- `components/scan/ScreenshotScanPage.tsx`
- `components/home/DetectionFrameworkSection.tsx`
- `lib/scan.ts`
- `lib/backendProxy.ts`

Backend:

- `backend/app/main.py`
- `backend/app/api/routes/scan.py`
- `backend/app/api/routes/report.py`
- `backend/app/api/routes/intel.py`
- `backend/app/services/analyzer.py`
- `backend/app/services/history.py`
- `backend/app/services/ocr.py`
- `backend/app/services/llm.py`
- `backend/app/core/config.py`
- `backend/app/core/secrets.py`

Project notes:

- `README.md`
- `SafetyCoach/IMPLEMENTATION_PROGRESS.md`
- `SafetyCoach/FUNCTIONS_AND_IMPROVEMENTS.md`

