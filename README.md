# CyberCoach

AI-powered scam and phishing analysis for non-technical users.

CyberCoach helps a person paste a suspicious message, inspect a URL before visiting it, or upload a screenshot of a text/email, then receive a plain-language risk assessment with reasons and next steps.

This repository's current implementation is:

- `Next.js 14` frontend
- `FastAPI` backend
- shared phishing heuristics, privacy redaction, OCR, reporting, and session history services

Note: older project notes may still mention a Streamlit app. The current runnable app in this repository is the Next.js + FastAPI stack described below.

## What The App Does

CyberCoach is designed for people who are not security experts. The product focuses on clarity, privacy, and guided action.

Core user flows:

1. Message Scan
Paste suspicious email, SMS, or chat content and analyze it for phishing or scam signals.

2. URL Scan
Inspect a suspicious link before opening it, including metadata precheck, domain analysis, and phishing-database lookup behavior.

3. Screenshot Scan
Upload or capture an image of a suspicious message, extract visible text, and run the same downstream analysis pipeline.

Each scan returns:

- a risk label: `Safe`, `Suspicious`, or `High Risk`
- a heuristic score
- confidence level
- likely scam pattern
- plain-language summary
- top reasons
- recommended actions
- technical findings / triggered rules
- optional downloadable report (`.txt` or `.md`)

## Current Architecture

The app is split into a frontend experience layer and a backend analysis layer.

### Frontend

The frontend is a `Next.js` App Router application in [`app`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/app), [`components`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/components), and [`lib`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/lib).

Key entry points:

- Homepage: [`app/page.tsx`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/app/page.tsx)
- Shared scan router: [`app/scan/page.tsx`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/app/scan/page.tsx)
- Message scan UI: [`components/scan/MessageScanPage.tsx`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/components/scan/MessageScanPage.tsx)
- URL scan UI: [`components/scan/UrlScanPage.tsx`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/components/scan/UrlScanPage.tsx)
- Screenshot scan UI: [`components/scan/ScreenshotScanPage.tsx`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/components/scan/ScreenshotScanPage.tsx)
- Frontend scan client and adapters: [`lib/scan.ts`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/lib/scan.ts)

The frontend does not call the Python backend directly from the browser. Instead, it uses same-origin Next.js API routes as proxy endpoints.

### Backend

The backend is a `FastAPI` app rooted at [`backend/app/main.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/main.py).

Main backend areas:

- API routes: [`backend/app/api/routes`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes)
- Core config and env loading: [`backend/app/core`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/core)
- Analysis services: [`backend/app/services`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services)
- Request/response models: [`backend/app/models`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/models)
- Local datasets and intel feed seed data: [`backend/app/data`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/data)

### Request Flow

Typical request path:

`Browser UI -> Next.js API route -> FastAPI backend -> analysis services -> unified scan response -> UI render/report export`

Example:

- user submits message in the frontend
- frontend calls [`app/api/scan/message/route.ts`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/app/api/scan/message/route.ts)
- the route proxies to the backend using [`lib/backendProxy.ts`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/lib/backendProxy.ts)
- FastAPI handles the request in [`backend/app/api/routes/scan.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/scan.py)
- the backend runs orchestration in [`backend/app/services/analyzer.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/analyzer.py)
- the frontend adapts the response in [`lib/scan.ts`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/lib/scan.ts) and renders it in the scan result components

## Detection Pipeline

CyberCoach uses a layered analysis flow.

### 1. Privacy Redaction

When privacy mode is enabled, the backend attempts to redact sensitive content before model analysis.

Implemented in:

- [`backend/app/services/pii.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/pii.py)

Examples of redacted data include:

- email addresses
- phone numbers
- SSNs
- credit-card-like numbers
- some contextual personal identifiers

### 2. Local Heuristics

CyberCoach always runs local heuristic checks, even if no model API key is configured.

Implemented in:

- [`backend/app/services/heuristics.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/heuristics.py)

Current heuristic categories include:

- urgency language
- requests for credentials or sensitive information
- suspicious TLDs
- domain mismatch against brand mentions
- sender spoofing indicators
- homoglyph-style deception
- shortened URLs
- raw IP-based URLs
- excessive subdomains
- phishing dataset lookups

The heuristics layer also provides:

- URL precheck metadata
- built-in demo message samples
- random real-phish examples when the phishing dataset is available

### 3. Model-Assisted Analysis

If an API key is configured, CyberCoach augments local heuristics with LLM analysis.

Implemented in:

- [`backend/app/services/llm.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/llm.py)

Supported provider modes:

- `Anthropic`
- `OpenRouter`

When `OpenRouter` is configured, the backend can run a dual-model style flow:

- primary model
- secondary model for an independent second pass

If no model key is available or the model call fails, CyberCoach falls back to a heuristics-only result.

### 4. OCR / Screenshot Analysis

Screenshot scans first extract visible text from an uploaded image, then pass the extracted text into the shared analysis pipeline.

Implemented in:

- [`backend/app/services/ocr.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/ocr.py)
- [`backend/app/services/analyzer.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/analyzer.py)

Important behavior:

- screenshot analysis requires an LLM-capable provider key
- without a key, screenshot scanning is unavailable

## Features

### Analysis Features

- message scanning
- URL scanning
- screenshot/image scanning
- local heuristics engine
- optional model-assisted reasoning
- phishing-dataset-backed URL lookup behavior
- report export in text and markdown formats

### Privacy Features

- privacy mode enabled by default in the scan UIs
- backend-side PII redaction before model analysis
- local heuristics still work without an API key

### UX Features

- premium landing page and scan layouts
- scan history within the active backend session
- curated intel feed with live session telemetry
- multilingual scan output options:
  - English
  - Spanish
  - Chinese
  - Vietnamese
  - Korean
  - Tagalog
  - French

## Project Structure

```text
CyberCoach/
├── app/                          # Next.js App Router pages and API proxy routes
├── components/                   # Home and scan UI components
├── lib/                          # Frontend API client, adapters, backend proxy helpers
├── backend/
│   └── app/
│       ├── api/routes/           # FastAPI endpoints
│       ├── core/                 # Config and env loading
│       ├── data/                 # Intel feed + phishing datasets
│       ├── models/               # Pydantic request/response models
│       └── services/             # Heuristics, analyzer, OCR, LLM, reports, history
├── UI Prototype/                 # Earlier design artifacts and prototypes
├── SafetyCoach/                  # Implementation notes and migration docs
├── package.json                  # Frontend scripts and dependencies
├── requirements.txt             # Backend Python dependencies
├── next.config.mjs              # Next.js config
├── tailwind.config.ts           # Tailwind config
└── .env                         # Local environment variables (should not contain committed secrets)
```

## API Surface

The backend currently exposes the following routes under the default `/api` prefix:

### Health

- `GET /api/health`

Returns backend status, version, and dataset availability.

### Scan Endpoints

- `POST /api/scan/message`
- `POST /api/scan/url`
- `POST /api/scan/screenshot`
- `GET /api/scan/url-precheck?url=...`
- `GET /api/scan/history`
- `GET /api/scan/message-samples`
- `GET /api/scan/capabilities`

### Supporting Endpoints

- `POST /api/report`
- `GET /api/intel/feed`

Implemented in:

- [`backend/app/api/routes/scan.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/scan.py)
- [`backend/app/api/routes/report.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/report.py)
- [`backend/app/api/routes/intel.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/intel.py)
- [`backend/app/api/routes/health.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/health.py)

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm
- Python 3.10+ recommended

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 3. Create Local Environment Variables

Create a root `.env` file with the values you need.

Minimal local example:

```bash
API_BASE_URL=http://127.0.0.1:8000/api
```

Optional model configuration:

```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
SECOND_MODEL=openai/gpt-5.3-chat
```

Alternative Anthropic-style configuration:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

The backend auto-loads these files if present:

- `.env`
- `.env.local`
- `.env.development.local`

That behavior is implemented in [`backend/app/core/secrets.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/core/secrets.py).

### 4. Start The Backend

```bash
uvicorn backend.app.main:app --reload
```

Default backend URL:

- `http://127.0.0.1:8000`

FastAPI docs:

- `http://127.0.0.1:8000/docs`

### 5. Start The Frontend

```bash
npm run dev
```

Default frontend URL:

- `http://localhost:3000`

## Frontend Proxy Configuration

The frontend proxies requests to the backend using [`lib/backendProxy.ts`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/lib/backendProxy.ts).

Resolution order for the backend base URL:

1. `API_BASE_URL`
2. `NEXT_PUBLIC_API_BASE_URL`
3. fallback: `http://127.0.0.1:8000/api`

If the backend is unavailable, the proxy layer returns a helpful `503` response explaining how to point the frontend at the backend.

## Datasets And Local Data

Current checked-in backend data files:

- [`backend/app/data/verified_online.csv`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/data/verified_online.csv)
- [`backend/app/data/phishing_email.csv`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/data/phishing_email.csv)
- [`backend/app/data/intel_feed.json`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/data/intel_feed.json)

These support:

- phishing URL lookup behavior
- random phishing sample generation
- curated intel feed content

The health endpoint reports dataset availability counts.

## Session State And History

CyberCoach currently keeps scan history in memory on the backend.

Implemented in:

- [`backend/app/services/history.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/history.py)

Important limitation:

- history is not persistent across backend restarts

## Reports

The app can export scan results as:

- `.txt`
- `.md`

Implemented in:

- [`backend/app/services/reports.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/services/reports.py)
- [`backend/app/api/routes/report.py`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/api/routes/report.py)

## Tech Stack

### Frontend

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- Pydantic v2
- Uvicorn
- `python-multipart` for screenshot upload handling

### AI / Analysis

- Anthropic SDK
- OpenRouter integration
- local heuristics engine

## Security And Operational Notes

### Do Not Commit Real API Keys

The repository should not store live model credentials in `.env` or other committed files.

Recommended practice:

- keep local secrets in untracked env files
- rotate any key that has already been committed
- use different keys for development and demos when possible

### Privacy Expectations

CyberCoach includes privacy redaction before model analysis when privacy mode is enabled, but users should still treat uploaded content carefully, especially when external provider APIs are enabled.

### Screenshot Availability

Screenshot scanning depends on a configured API provider. Message and URL heuristics can still function without model access.

## Known Caveats

- older documentation may still reference the legacy Streamlit app
- scan history is in-memory only
- screenshot analysis is unavailable without an API key
- local behavior depends partly on dataset availability in [`backend/app/data`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/backend/app/data)

## Useful Reference Files

- Runtime status and migration notes: [`SafetyCoach/IMPLEMENTATION_PROGRESS.md`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/SafetyCoach/IMPLEMENTATION_PROGRESS.md)
- Functional breakdown and improvements: [`SafetyCoach/FUNCTIONS_AND_IMPROVEMENTS.md`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/SafetyCoach/FUNCTIONS_AND_IMPROVEMENTS.md)
- Package metadata: [`package.json`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/package.json)
- Backend dependencies: [`requirements.txt`](/Users/mnd/Desktop/AI%20Hackathon/CyberCoach/requirements.txt)

## Team

Built for the ISACA OC Sponsored Problem Challenge | AI Hackathon 2026 | Cal Poly Pomona.

Original team credit in project materials:

- Kai
- Yaza
- Minh
- Alvin
