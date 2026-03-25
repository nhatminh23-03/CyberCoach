# CyberCoach Functions and Improvements Guide

Last updated: March 24, 2026

## Purpose

This document explains:

- what the main functional areas of CyberCoach do
- how those functions were split out from the original Streamlit app
- what changed or improved during the migration to FastAPI + Next.js

This is a more detailed companion to `IMPLEMENTATION_PROGRESS.md`.

## 1. Original Streamlit App: What It Did

The original `app.py` was a large, single-file Streamlit application that handled nearly everything in one place:

- UI rendering
- user inputs
- local heuristics
- URL checks
- PII redaction
- screenshot/image handling
- LLM provider routing
- risk analysis formatting
- report generation
- session state and history

That meant the product worked, but it also meant:

- backend and frontend concerns were tightly coupled
- testing individual logic paths was harder
- reuse across multiple pages or products was limited
- non-Streamlit consumers could not call the logic cleanly

The migration kept the original behavior as the source of truth, but reorganized the system into clearer functional boundaries.

## 2. Core Product Functions

### 2.1 Message Scan

#### What it does

Message Scan lets a user paste a suspicious message, email, or text and analyze it for phishing or scam indicators.

It supports:

- freeform suspicious text input
- privacy mode
- response language selection
- heuristic analysis
- optional model-assisted analysis
- risk summary and recommendations
- findings and explanation output
- report export

#### Where it lives now

- frontend page:
  - `components/scan/MessageScanPage.tsx`
- backend orchestration:
  - `backend/app/services/analyzer.py`
- frontend adapter / API client:
  - `lib/scan.ts`

#### What improved from Streamlit

- the UI is now separated from the analysis logic
- scan results are easier to reuse across interfaces
- the Message Scan page now has a structured premium layout with reusable cards
- support features from Streamlit were preserved in a more polished way:
  - sample presets
  - how-it-works helper
  - privacy reassurance
- result rendering became modular instead of being embedded in one large Streamlit flow

## 2.2 URL Scan

### What it does

URL Scan lets a user paste a suspicious URL and inspect it before visiting.

The behavior preserved from Streamlit includes:

- accepting a suspicious URL
- normalizing / parsing the URL
- extracting metadata such as:
  - domain
  - TLD
  - subdomain count
- running a phishing-database style lookup
- supporting privacy mode
- supporting response language
- producing a risk result and recommendation output

### Where it lives now

- frontend page:
  - `components/scan/UrlScanPage.tsx`
- backend routing:
  - `backend/app/api/routes/scan.py`
- heuristic helpers:
  - `backend/app/services/heuristics.py`
- frontend adapter / API client:
  - `lib/scan.ts`

### What improved from Streamlit

- URL precheck is now exposed as a clearer backend capability instead of being buried inside UI logic
- parsed URL metadata is shown in a dedicated premium UI card
- the phishing-database style result is now easier to render and extend
- the frontend separates:
  - precheck state
  - analysis state
  - final result rendering
- URL behavior is now reusable by any frontend, not just Streamlit

## 2.3 Screenshot Scan

### What it does

Screenshot Scan allows users to inspect uploaded screenshots or images for signs of scams, phishing attempts, or suspicious requests.

Preserved behavior includes:

- upload image
- drag and drop
- browse files
- camera/photo capture where supported
- privacy mode
- language selection
- OCR or image-to-text style extraction
- heuristic / AI-assisted image analysis when provider access exists
- session history
- report actions

### Where it lives now

- frontend page:
  - `components/scan/ScreenshotScanPage.tsx`
- backend OCR support:
  - `backend/app/services/ocr.py`
- backend orchestration:
  - `backend/app/services/analyzer.py`
- model provider support:
  - `backend/app/services/llm.py`
- frontend adapter:
  - `lib/scan.ts`

### What improved from Streamlit

- image capabilities are now checked in a cleaner way through the backend
- the UI no longer fails silently when a provider is unavailable
- upload, preview, and analysis states are clearly separated
- camera capture was translated into a web-appropriate capture-enabled file input
- screenshot results now live inside the same premium result-card system as other scan types

## 3. Heuristics Engine

### What it does

The heuristics engine is the local analysis layer that looks for suspicious patterns without needing a model call.

It is responsible for behavior such as:

- phishing/scam scoring
- suspicious pattern detection
- URL parsing and classification
- phishing lookup behavior
- fallback analysis when model access is missing

### Where it lives now

- `backend/app/services/heuristics.py`

### What improved from Streamlit

- logic that was previously embedded in `app.py` was extracted into pure service-style functions
- the heuristics are now easier to call from multiple routes
- URL precheck became a reusable backend function instead of a UI-side behavior
- the backend can now expose structured heuristic outputs to the frontend more cleanly

## 4. PII Redaction / Privacy Mode

### What it does

Privacy mode allows CyberCoach to reduce exposure of sensitive user content before model analysis.

The redaction layer handles patterns such as:

- email addresses
- phone numbers
- SSNs
- credit-card-like numbers
- some contextual personal identifiers

### Where it lives now

- `backend/app/services/pii.py`

### What improved from Streamlit

- privacy logic is now isolated from UI code
- privacy behavior can be reused consistently across message, URL, and screenshot flows
- frontend messaging can reflect privacy mode more accurately because the backend exposes clearer redaction outcomes
- privacy reassurance was preserved, but redesigned into a calmer, premium presentation

## 5. OCR / Image Text Extraction

### What it does

This part handles visible-text extraction or image interpretation for screenshot-based scans.

It can be used to:

- extract visible content from a screenshot
- feed extracted content into the same analysis pipeline as message text
- support AI-assisted screenshot evaluation

### Where it lives now

- `backend/app/services/ocr.py`

### What improved from Streamlit

- OCR/image extraction is now its own service
- screenshot processing can evolve independently from page layout
- capabilities can be checked explicitly
- the architecture now supports future upgrades without rewriting the UI

## 6. LLM Provider Routing

### What it does

This layer decides how and when CyberCoach uses model providers.

It handles:

- provider selection
- API key resolution
- model routing
- fallback behavior
- optional multi-model analysis patterns

### Where it lives now

- `backend/app/services/llm.py`
- `backend/app/core/secrets.py`

### What improved from Streamlit

- provider resolution is now separated from UI
- environment-variable loading replaced Streamlit-only secret access
- model-call logic is easier to reason about and reuse
- the backend is now the source of truth for AI availability instead of the frontend guessing

## 7. Analyzer / Orchestration Layer

### What it does

The analyzer is the central orchestration layer that combines:

- preprocessing
- privacy mode
- heuristics
- OCR when applicable
- model analysis
- final unified response formatting

This is the main backend coordinator for the scan flows.

### Where it lives now

- `backend/app/services/analyzer.py`

### What improved from Streamlit

- orchestration is now explicit instead of being buried inside a large `main()` workflow
- Message, URL, and Screenshot analyses can all pass through a shared service layer
- response shapes became more consistent and easier for the frontend to consume
- scan-type-specific behavior can still exist without fragmenting the whole system

## 8. Reports

### What it does

Report generation converts scan results into shareable or downloadable outputs.

Supported behaviors preserved from Streamlit include:

- copy report
- download `.txt`
- download `.md`

### Where it lives now

- backend:
  - `backend/app/services/reports.py`
  - `backend/app/api/routes/report.py`
- frontend:
  - `lib/scan.ts`

### What improved from Streamlit

- report generation is now a reusable backend capability
- the frontend has a cleaner action layer for copying/downloading
- report actions can be shared across scan pages instead of re-implemented in each UI section

## 9. History

### What it does

History tracks recent scan activity within the active backend session.

It currently supports:

- recent analyses in the Message Scan rail
- screenshot session history
- live session telemetry for the intel feed

### Where it lives now

- `backend/app/services/history.py`

### What improved from Streamlit

- history is now backend-managed rather than tied only to Streamlit session state
- frontend pages can pull history through API routes
- multiple UI surfaces can reuse the same history data

### Current limitation

It is still in-memory only, so it is not persistent across restarts.

## 10. Global Intel Feed

### What it does

The Global Intel Feed provides supporting intelligence content in the scan pages.

It currently combines:

- curated static baseline feed items
- live session-based telemetry derived from current scans

### Where it lives now

- backend:
  - `backend/app/services/intel.py`
  - `backend/app/api/routes/intel.py`
- frontend:
  - right-rail scan components
  - `app/api/intel/feed/route.ts`

### What improved from Streamlit

- the feed is no longer UI-hardcoded
- the backend owns the feed output
- the frontend now renders live data instead of static-only cards
- the feed does not depend on OpenAI or another LLM just to exist

### What still needs improvement

- baseline items still come from local curated JSON
- there is no CMS or external threat feed integration yet

## 11. Frontend Proxy Layer

### What it does

The proxy layer allows the browser to call Next.js API routes while Next.js forwards those requests to FastAPI.

This solves:

- local browser CORS problems
- backend URL leakage into many UI components
- repetitive fetch logic

### Where it lives now

- `app/api/...`
- `lib/backendProxy.ts`
- `lib/scan.ts`

### What improved from Streamlit

- network behavior is now cleaner and more production-shaped
- frontend pages do not depend on direct browser-to-FastAPI calls
- scan pages have better error handling when the backend is unreachable

## 12. Homepage Functionality

### What it does

The homepage acts as a premium landing page and entry point into scanning workflows.

It supports:

- editorial hero presentation
- quick scan input
- quick navigation into scan pages
- supporting actions such as:
  - Upload Document
  - Scan Screenshot

### Where it lives now

- `app/page.tsx`
- `components/home/*`

### What improved from Streamlit

- the app now has a proper landing experience rather than only a direct utility-style interface
- the quick scan bar creates a smoother entry point into scan workflows
- homepage sections now use scroll/reveal motion and stronger visual hierarchy

## 13. Shared Scan Layout

### What it does

The scan layout provides a consistent product structure across Message, URL, and Screenshot flows.

Desktop pattern:

- top nav
- left scan nav
- central workflow column
- right support/intel column

Mobile pattern:

- top nav remains visible
- scan menu becomes a hamburger-triggered drawer
- the content becomes a more linear vertical flow

### Where it lives now

- `components/scan/ScanSidebar.tsx`
- `components/scan/ScanFooter.tsx`
- shared header and footer components

### What improved from Streamlit

- the product now has a coherent multi-page scan system
- scan modes are clearly separated but still visually related
- mobile behavior is more intentional than simply shrinking desktop panels

## 14. Main Improvements Over the Original Streamlit App

This section summarizes the most meaningful improvements made during migration.

### 14.1 Separation of Concerns

#### Before

The Streamlit app mixed:

- rendering
- business logic
- provider logic
- state
- report handling

inside one large file.

#### After

The new system cleanly separates:

- backend services
- API routes
- frontend pages
- shared adapters
- UI components

This is the single biggest architectural improvement.

### 14.2 Reusable Backend

#### Before

The logic was mainly usable through Streamlit.

#### After

The logic is now exposed through FastAPI endpoints, which means:

- the frontend can evolve independently
- future clients could reuse the same backend
- testing and maintenance are much easier

### 14.3 Reusable Result System

#### Before

Result rendering was bound to the Streamlit interface.

#### After

The frontend uses reusable result-card systems for:

- risk summary
- recommendations
- findings
- technical evidence
- privacy notes
- quick tips
- score breakdown
- report actions

This made the app feel like a product instead of a prototype.

### 14.4 Better User Flows

#### Before

The Streamlit app worked, but the UX was more tool-like and linear.

#### After

The new UI adds:

- homepage entry
- structured scan navigation
- stronger scan page hierarchy
- support rails
- better state transitions
- clearer result reveal patterns

### 14.5 Better Mobile Strategy

#### Before

The Streamlit experience did not map well to a custom, premium mobile UX.

#### After

The responsive behavior was deliberately redesigned:

- homepage mobile nav now stays on the main row
- scan sidebar becomes a drawer on mobile
- content is reordered to prioritize the main task first

### 14.6 Cleaner Environment Handling

#### Before

Secrets were closely tied to Streamlit config/secrets usage.

#### After

The backend now supports standard `.env`-based development, which is much more portable and easier to run locally.

### 14.7 Better Error Handling

#### Before

Failures like missing backend connectivity or unavailable providers were more tightly coupled to the UI flow.

#### After

The new stack surfaces these states more clearly:

- same-origin proxy errors
- backend unavailable messages
- scan capability checks
- provider readiness guidance

## 15. What Was Preserved On Purpose

Not everything was “improved” by changing behavior. Some things were intentionally preserved because they were part of the original working product.

These include:

- the core phishing/scam heuristics
- privacy redaction behavior
- screenshot scan dependency on AI-capable providers
- report formats
- result style concepts such as:
  - risk result
  - what to do next
  - quick tip
  - findings

The migration philosophy was:

- preserve behavior first
- improve structure second
- improve UI polish third

## 16. Remaining Gaps and Follow-Up Recommendations

### Highest-value follow-ups

- persist history beyond memory
- clean up the Pydantic warning around the intel response `copy` field
- continue auditing multilingual behavior across every result card
- connect the Global Intel Feed to a more dynamic source if needed
- document environment setup more centrally in the main README

### UX follow-ups

- continue mobile spacing and drawer polish
- validate all scan pages on small screens and tablets
- restore or wire final Privacy and Support destinations if needed

## 17. Final Summary

The Streamlit app proved the CyberCoach logic and workflow. The new implementation keeps that behavior but reorganizes it into a much more maintainable product architecture.

The main functions now have clear homes:

- heuristics
- privacy
- OCR
- model routing
- orchestration
- history
- reports
- intel feed
- dedicated scan pages

The biggest improvement is not that CyberCoach behaves like a completely different product. The biggest improvement is that it now behaves like the same product with:

- clearer architecture
- better frontend experience
- better modularity
- better responsiveness
- better long-term maintainability
