# CyberCoach Implementation Progress

Last updated: March 24, 2026

## Purpose

This document captures what has been implemented so far across the CyberCoach project, including:

- the FastAPI backend refactor extracted from the original Streamlit app
- the new Next.js frontend and premium landing page
- the new scan experiences for Message, URL, and Screenshot flows
- integration work between frontend and backend
- responsive/mobile behavior updates
- current limitations, known issues, and follow-up recommendations

This file is intended to serve as a handoff and status reference for ongoing work.

## High-Level Status

The project now consists of:

- the original Streamlit app, still kept in the repo as the source-of-truth reference
- a modular FastAPI backend under `backend/app`
- a new Next.js App Router frontend under `app`, `components`, and `lib`

The new system currently supports:

- homepage / landing page
- Message Scan page
- URL Scan page
- Screenshot Scan page
- shared API proxying through Next.js
- environment-variable based secret loading
- basic scan history support
- a backend-driven global intel feed
- mobile/responsive improvements for the homepage and scan flows

## Original Source of Truth

The original business logic still lives in:

- `app.py`

That Streamlit file was treated as the behavioral reference during migration. The goal was to preserve working behavior first and improve structure second.

## Backend Refactor Summary

### Goal

The original single-file Streamlit app contained:

- UI
- heuristics
- PII redaction
- OCR / screenshot analysis
- LLM provider logic
- report generation
- session/history behavior

This was refactored into a FastAPI backend with modular services while trying to preserve the current working behavior.

### Current Backend Structure

The backend now lives in:

- `backend/app/main.py`
- `backend/app/api/routes`
- `backend/app/core`
- `backend/app/services`
- `backend/app/models`
- `backend/app/data`

### Backend Modules Added

#### Core

- `backend/app/core/config.py`
  - backend configuration
  - CORS settings
  - service-level environment settings

- `backend/app/core/secrets.py`
  - root `.env` loading support
  - supports local env files like `.env`, `.env.local`, `.env.development.local`
  - allows backend to read API keys from project root without relying on Streamlit secrets

#### Routes

- `backend/app/api/routes/health.py`
  - health endpoint

- `backend/app/api/routes/scan.py`
  - message scan
  - URL scan
  - screenshot scan
  - URL precheck endpoint
  - scan capability endpoint
  - message sample endpoint

- `backend/app/api/routes/report.py`
  - report generation endpoint

- `backend/app/api/routes/intel.py`
  - backend-driven global intel feed

#### Services

- `backend/app/services/analyzer.py`
  - orchestration layer
  - combines preprocessing, heuristics, privacy mode, OCR, model analysis, and result formatting

- `backend/app/services/heuristics.py`
  - local scam/phishing scoring logic
  - URL parsing helpers
  - phishing dataset loading
  - PhishTank-style lookup behavior and precheck data used by the URL flow

- `backend/app/services/pii.py`
  - PII redaction
  - privacy-related transformations before model analysis

- `backend/app/services/ocr.py`
  - screenshot/image text extraction support

- `backend/app/services/llm.py`
  - model/provider routing
  - Anthropic / OpenRouter / GPT provider handling
  - fallback logic

- `backend/app/services/reports.py`
  - report generation for scans

- `backend/app/services/history.py`
  - lightweight in-memory scan history

- `backend/app/services/intel.py`
  - global intel feed builder
  - merges curated baseline intel with live session telemetry

#### Models

- `backend/app/models/requests.py`
  - request models for scan and report endpoints

- `backend/app/models/responses.py`
  - unified response models
  - intel feed response shape

#### Data

- `backend/app/data/phishing_email.csv`
- `backend/app/data/verified_online.csv`
- `backend/app/data/intel_feed.json`

### Backend Endpoints Currently in Use

- `GET /api/health`
- `POST /api/scan/message`
- `POST /api/scan/url`
- `POST /api/scan/screenshot`
- `GET /api/scan/url-precheck`
- `GET /api/scan/history`
- `GET /api/scan/message-samples`
- `GET /api/scan/capabilities`
- `POST /api/report`
- `GET /api/intel/feed`

### Backend Integration Notes

- The backend now expects secrets from environment variables instead of Streamlit secrets.
- The backend supports local `.env` loading from the project root.
- Screenshot/image scanning still depends on an API-capable provider, which matches the original behavior.
- History is currently in-memory only and is not persistent across backend restarts.

## Frontend Summary

### Goal

The new frontend was built in Next.js App Router using TypeScript and Tailwind CSS. The intent was to translate the premium dark editorial CyberCoach visual direction into a reusable frontend while preserving the original scan behavior.

### Frontend Structure

Main areas:

- `app`
  - routes
  - API proxy routes

- `components/home`
  - homepage and shared marketing-style UI

- `components/scan`
  - scan pages
  - scan layout pieces
  - scan result cards

- `lib/scan.ts`
  - frontend scan client
  - response adapters
  - report helpers

### Next.js API Proxy Layer

To avoid browser-side CORS and to simplify local development, the frontend now proxies scan and report requests through same-origin Next.js routes.

Current proxy routes include:

- `app/api/scan/message/route.ts`
- `app/api/scan/message-samples/route.ts`
- `app/api/scan/history/route.ts`
- `app/api/scan/url/route.ts`
- `app/api/scan/url-precheck/route.ts`
- `app/api/scan/screenshot/route.ts`
- `app/api/scan/capabilities/route.ts`
- `app/api/report/route.ts`
- `app/api/intel/feed/route.ts`

The proxy target is managed through:

- `lib/backendProxy.ts`

This means the browser talks to Next.js, and Next.js talks to FastAPI.

## Homepage / Landing Page

### What Was Built

The homepage was built to match the premium dark editorial reference, with the requested design changes:

- simplified top navigation
- premium hero section
- quick-scan bar replacing dual CTA buttons
- right-side status/intelligence card
- preserved dark detection framework section
- preserved lighter editorial lower section
- refined footer

### Main Files

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `components/home/Header.tsx`
- `components/home/HeroSection.tsx`
- `components/home/QuickScanBar.tsx`
- `components/home/DetectionFrameworkSection.tsx`
- `components/home/EditorialInfoSection.tsx`
- `components/home/Footer.tsx`
- `components/home/ScrollReveal.tsx`

### Homepage Improvements Added Later

The homepage was later enhanced to feel less static:

- reveal-on-scroll motion
- better section framing
- improved first-screen hero composition
- stronger background atmosphere
- reduced hero/header gap
- better mobile responsiveness

### Quick Scan Behavior

The homepage quick scan:

- accepts typed/pasted input
- routes to the scan flow
- preserves the typed value for later use in the scan page

## Message Scan Page

### Goal

The Message Scan page was built to match the provided premium scan reference while preserving the original Streamlit message-scan behavior.

### Main Files

- `app/scan/page.tsx`
- `components/scan/MessageScanPage.tsx`
- `components/scan/ScanResults.tsx`
- `components/scan/ScanRightRail.tsx`
- `components/scan/ScanSupportPanels.tsx`

### Message Scan Features Implemented

- pasted suspicious message input
- privacy mode toggle
- language selector
- execute scan
- premium loading state
- risk summary
- recommended actions
- key findings
- technical / triggered-rule style evidence
- privacy note
- quick tip / education card
- score breakdown
- report actions
- session-aware recent analysis rail

### Streamlit Behaviors Preserved

The page also preserves several smaller support behaviors from the original app:

- sample/demo input presets
- “How it works” support panel
- privacy reassurance note

### Right Rail Evolution

The right rail originally used static content. It was later improved to support:

- dynamic recent analysis based on backend history
- backend-driven global intel feed

### Localization Work

The message result stack was updated so the selected language applies beyond just the first result cards. The intent was to carry the selected language across the broader result layout and report-related UI.

## URL Scan Page

### Goal

The URL Scan page was implemented as a sibling to Message Scan while preserving the actual Streamlit URL-scan behavior.

### Main Files

- `app/scan/url/page.tsx`
- `components/scan/UrlScanPage.tsx`
- `components/scan/UrlScanResults.tsx`
- `components/scan/UrlScanRightRail.tsx`

### URL Scan Features Implemented

- suspicious URL input
- URL normalization and parsing
- immediate URL precheck
- domain display
- TLD display
- subdomain count
- phishing-database style check result
- privacy mode toggle
- language selector
- risk summary
- recommendations
- key findings
- quick tip
- report actions

### Supporting Backend Work

To support the URL flow, additional work was added for:

- URL precheck endpoint
- phishing-lookup / rule extraction
- frontend proxy route for URL precheck
- UI mapping for URL-specific metadata

## Screenshot Scan Page

### Goal

The Screenshot Scan page was implemented to preserve the original screenshot/image flow from the Streamlit app while matching the premium CyberCoach visual system.

### Main Files

- `app/scan/screenshot/page.tsx`
- `components/scan/ScreenshotScanPage.tsx`
- `components/scan/ScreenshotScanResults.tsx`
- `components/scan/ScreenshotScanRightRail.tsx`

### Screenshot Features Implemented

- upload screenshot
- drag and drop
- browse files
- camera/photo capture via capture-enabled input where supported
- image preview before analysis
- privacy mode toggle
- language selector
- API capability check
- screenshot/image analysis state
- risk result
- summary
- recommended actions
- key findings
- quick tip
- report actions
- session history

### Dependency Handling

The screenshot flow was designed not to fail silently when AI-backed image analysis is unavailable. It checks backend capabilities and can surface dependency/API readiness status.

## Global Intel Feed

### What It Is

The global intel feed is now backend-driven instead of being hardcoded directly in the frontend.

### Current Data Model

The current implementation merges:

- curated static baseline intel from `backend/app/data/intel_feed.json`
- live session-derived telemetry generated from scan history

### Important Note

The global intel feed does **not** require OpenAI or another LLM just to exist. It is currently data-driven, not model-driven.

An LLM could be added later only for optional tasks such as:

- rewriting feed items into editorial summaries
- translation
- clustering similar incidents

## History Support

### What Exists Now

There is lightweight in-memory history in the backend.

This is used by:

- recent analysis on scan pages
- session history on screenshot flow
- live telemetry input to the global intel feed

### Current Limitation

History is not persistent. Restarting the backend clears it.

## Reports

### Report Support Preserved

Across scan flows, the new UI preserves report-related behavior:

- copy report text
- download `.txt`
- download `.md`

The frontend uses shared report helpers in:

- `lib/scan.ts`

The backend report generation lives in:

- `backend/app/services/reports.py`

## Responsive / Mobile Work

### What Was Improved

A large amount of follow-up work went into responsiveness, especially for scan pages.

### Homepage

- hero spacing adjusted for smaller screens
- tighter mobile layout
- improved mobile quick-scan presentation
- mobile top nav behavior adjusted

### Scan Pages

Desktop scan pages use a structured layout with:

- left scanner navigation
- central workflow column
- right support/intel column

For smaller screens, this has been progressively adapted so it remains usable.

### Current Mobile Navigation Changes

#### Shared Top Nav

The header was updated so mobile now keeps navigation on the same row as the CyberCoach wordmark instead of dropping below it.

#### Scan Menu

The scan sidebar was updated for mobile:

- instead of the full left rail
- a three-bar menu button appears
- tapping it opens a slide-in scanner menu/drawer
- the top nav remains visible

### Shared Footer

The scan pages now reuse the homepage footer component so both experiences match visually.

## Environment and Local Setup

### Root `.env` Loading

The backend now supports loading environment variables from the project root `.env`, including values like:

- `LLM_PROVIDER`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `SECOND_MODEL`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

### Local Run Pattern

Typical local development flow:

1. start FastAPI
2. start Next.js frontend

Example:

```bash
source .venv/bin/activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

```bash
npm run dev
```

### Important Note

There was at least one local environment where `uvicorn` was not found in the active `.venv`, so dependency installation and environment consistency should be checked if startup fails.

## Verification Performed

Across the work so far, the following kinds of checks were run:

- Next.js production builds with `npm run build`
- backend compile checks using `python3 -m compileall backend/app`
- local backend startup validation in environments where dependencies were available

The frontend build has been passing after recent changes.

## Known Issues / Rough Edges

### 1. Intel Response Model Warning

During backend startup, there is a warning from Pydantic about the field name `copy` in `IntelItemResponse` shadowing a BaseModel attribute.

This is not necessarily breaking, but it should be cleaned up.

### 2. History Is In-Memory Only

Current history and related telemetry are not persistent.

### 3. Some Navigation Is Intentionally Simplified

The current shared header implementation shows a reduced nav set. Depending on the latest UI direction, Privacy and Support may need to be fully restored or wired to real sections/pages.

### 4. Global Intel Feed Baseline Is Still Curated

Although the UI is no longer frontend-hardcoded, the baseline feed content still comes from a static JSON file and is not yet backed by an editable CMS or external threat feed.

### 5. Screenshot Analysis Still Depends on Provider Availability

This matches the original behavior, but the UX around missing capability can still be refined further.

## Recommended Next Steps

### Product / UX

- finish remaining mobile polish pass
- validate scan drawers, right rails, and result density across small devices
- restore or fully wire Privacy and Support nav destinations if needed

### Backend

- make history persistent if required
- clean up the `copy` field naming warning in the intel response model
- optionally add timed caching or a managed source for the intel feed

### Frontend

- continue localization review across all scan result cards
- validate language coverage for reports and every result section
- continue scroll/motion refinement without overcomplicating the editorial design

### Operations

- ensure backend dependencies are consistently installed in the active `.venv`
- document `.env` expectations more explicitly in the main README if needed

## Major Files Worth Reviewing

### Backend

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/secrets.py`
- `backend/app/api/routes/scan.py`
- `backend/app/api/routes/report.py`
- `backend/app/api/routes/intel.py`
- `backend/app/services/analyzer.py`
- `backend/app/services/heuristics.py`
- `backend/app/services/llm.py`
- `backend/app/services/ocr.py`
- `backend/app/services/reports.py`
- `backend/app/services/history.py`
- `backend/app/services/intel.py`
- `backend/app/models/requests.py`
- `backend/app/models/responses.py`

### Frontend

- `app/page.tsx`
- `app/scan/page.tsx`
- `app/scan/url/page.tsx`
- `app/scan/screenshot/page.tsx`
- `components/home/Header.tsx`
- `components/home/HeroSection.tsx`
- `components/home/QuickScanBar.tsx`
- `components/home/Footer.tsx`
- `components/scan/MessageScanPage.tsx`
- `components/scan/UrlScanPage.tsx`
- `components/scan/ScreenshotScanPage.tsx`
- `components/scan/ScanSidebar.tsx`
- `components/scan/ScanFooter.tsx`
- `components/scan/ScanResults.tsx`
- `components/scan/UrlScanResults.tsx`
- `components/scan/ScreenshotScanResults.tsx`
- `components/scan/ScanRightRail.tsx`
- `components/scan/ScanSupportPanels.tsx`
- `lib/scan.ts`
- `lib/backendProxy.ts`

## Summary

So far, the project has moved from a single-file Streamlit prototype toward a modular backend + modern frontend application while preserving the original CyberCoach behaviors as closely as possible.

The most important completed outcomes are:

- modular FastAPI backend extracted from Streamlit logic
- premium Next.js landing page
- Message, URL, and Screenshot scan experiences
- report support
- history support
- global intel feed support
- API proxying and env-based local setup
- substantial responsive/mobile refinement

The main remaining work is now less about basic structure and more about polish, persistence, localization completeness, and final UX refinement.
