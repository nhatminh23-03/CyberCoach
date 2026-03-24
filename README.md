# CyberCoach

**AI-Powered Personal Cyber Safety Tool**

Built for the ISACA OC Sponsored Problem Challenge | AI Hackathon 2026 | Cal Poly Pomona

---

## What is CyberCoach?

CyberCoach helps anyone — your parents, your grandparents, your coworkers — figure out if a message they received is a scam. No cybersecurity knowledge needed. Paste it in, get a clear answer.

## The Problem

Phishing attacks are the #1 cyber threat to individuals. Most people can't tell the difference between a real email from their bank and a convincing fake. Existing tools are built for security professionals, not for the person who just got a scary text saying their account is suspended.

## Our Solution

A simple, trustworthy tool that:
1. Takes a suspicious message (email, text, URL, or screenshot)
2. Runs it through multiple layers of analysis
3. Tells you — in plain language — whether it's safe, suspicious, or dangerous
4. Gives you a checklist of exactly what to do next

---

## How It Works

```
User pastes message / URL / uploads screenshot
                    |
            Privacy Scrub
    (PII auto-redacted before AI sees it)
                    |
        +------ Analysis ------+
        |           |          |
   Heuristic    Claude      GPT-5.3
    Engine     Sonnet 4.6   (OpenRouter)
   (local)    (OpenRouter)
        |           |          |
        +--- Results Merged ---+
                    |
    Risk Level + Consensus + Actions
```

### Three Layers of Detection

**Layer 1 — Heuristic Engine (runs locally, no API needed)**
- 10+ pattern checks: suspicious domains, urgency language, credential requests, sender spoofing, homoglyph attacks, shortened URLs, IP-based URLs, excessive subdomains
- PhishTank database lookup — cross-references URLs against thousands of confirmed phishing sites
- Scored 0–15 with visual breakdown

**Layer 2 — Claude Sonnet 4.6**
- Contextual AI analysis with structured JSON output
- Uses heuristic findings as grounding evidence
- Returns risk level, confidence score, plain-language explanation, and action steps

**Layer 3 — GPT-5.3**
- Independent second opinion from a different model
- Dual-model consensus: when both agree, users can trust the result more
- When they disagree, the app flags it and recommends caution

---

## Features

### Analysis
- Three input modes: paste text, check URL, upload screenshot/photo
- Image OCR via Claude Vision — photograph a suspicious message from your phone
- Dual-model consensus validation with side-by-side reasoning
- PhishTank real-time URL lookup against confirmed phishing database
- Heuristic risk scoring with detailed breakdown

### Privacy
- Privacy Mode (on by default) — auto-redacts emails, phone numbers, SSNs, credit cards, and names before AI analysis
- Nothing is stored or logged
- Works entirely offline with heuristics when no API key is provided

### Accessibility
- Multi-language support: English, Spanish, Chinese, Vietnamese, Korean, Tagalog, French
- Adjustable font size (Small / Default / Large / Extra Large)
- High contrast mode
- Plain-language explanations — no jargon

### User Experience
- Animated intro with guided content reveal
- Staggered result animations with risk badge stamp effect
- High-risk results trigger glowing red alert with directional arrow to action steps
- Siren animation on action items for urgent threats
- Hover-to-enlarge on action checklist items
- Dual progress banners (Claude + GPT) during analysis
- Downloadable reports (.txt and .md)
- Session history to review past scans
- Cybersecurity micro-tips after each scan
- "New here?" guided onboarding popover

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Streamlit (Python) + custom CSS/JS |
| AI Models | Claude Sonnet 4.6 + GPT-5.3 via OpenRouter |
| Heuristics | Rule-based pattern detection (no dependencies) |
| Threat Intel | PhishTank (URL lookup) + Kaggle Phishing Email Dataset |
| Privacy | Regex-based PII redaction |
| Deployment | Streamlit Cloud |

---

## Quick Start

### Run Locally
```bash
pip install -r requirements.txt
streamlit run app.py
```

### Deploy to Streamlit Cloud
1. Push to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect your repo and deploy
4. Add secrets in the Streamlit dashboard (see below)

### Configuration

Create `.streamlit/secrets.toml`:
```toml
LLM_PROVIDER = "openrouter"
OPENROUTER_API_KEY = "sk-or-v1-..."
OPENROUTER_MODEL = "anthropic/claude-sonnet-4.6"
SECOND_MODEL = "openai/gpt-5.3-chat"
```

### Threat Intelligence Data

Place in the `data/` folder:
- `verified_online.csv` — from [PhishTank](https://phishtank.org/developer_info.php)
- `phishing_email.csv` — from [Kaggle](https://www.kaggle.com/datasets/naserabdullahalam/phishing-email-dataset)

---

## No API Key?

CyberCoach still works without an API key. The heuristic engine and PhishTank lookup run entirely locally — no data leaves your device. AI features (dual-model analysis, image OCR, multi-language) require an OpenRouter or Anthropic API key.

---

## Project Structure
```
CyberCoach/
├── app.py                    # Main application
├── config.toml               # Streamlit theme (CPP green/gold)
├── requirements.txt          # Python dependencies
├── data/
│   ├── verified_online.csv   # PhishTank database
│   └── phishing_email.csv    # Kaggle phishing samples
└── .streamlit/
    └── secrets.toml          # API keys (not committed)
```

---

## Hackathon Rubric Alignment

| Criterion | How CyberCoach Addresses It |
|---|---|
| **Impact** | Protects non-technical users from the #1 cyber threat |
| **Feasibility** | Runs in a browser, no install, works without API key |
| **Trust** | Privacy Mode, PII redaction, dual-model validation, nothing stored |
| **Clarity** | Plain language, visual risk badges, action checklists |
| **Innovation** | Dual-model consensus, PhishTank integration, image OCR |

---

Built by Kai, Yaza, Minh and Alvin at Cal Poly Pomona
