# CyberCoach Real-Time Vishing Guard

## Summary
- Add a new CyberCoach scan mode for real-time call protection aimed first at seniors using desktop or tablet while a suspicious phone call is on speakerphone.
- The MVP is a browser-based “speakerphone listener,” not a phone-network integration. CyberCoach listens through the device mic, transcribes the call live, detects scam/vishing patterns, and shows live warnings plus challenge questions to ask the caller.
- The product should be framed conservatively: suspicious voice-pattern and scam-behavior detection, not definitive deepfake proof.
- Audio handling defaults to ephemeral-only processing: no raw audio storage by default, temporary live transcript/session state only, with optional report export after the call.

## Key Changes
### Product and UX
- Add a new scan mode in the existing CyberCoach family, best named `Call Guard` or `Vishing Guard`, reachable from home, scan navigation, and direct route.
- Build a live-call experience optimized for seniors:
  - large type
  - high contrast
  - simple start/stop controls
  - minimal branching
  - clear “what to do right now” prompts
- Main live screen should include:
  - mic/listening status
  - live transcript panel
  - risk meter with `Safe / Suspicious / High Risk`
  - live warning cards
  - challenge questions to ask the caller
  - recommended next steps
  - optional caregiver-style summary/report export after the session
- Keep the same CyberCoach result philosophy:
  - plain language
  - explainability first
  - actionable advice
  - no raw forensic/security jargon as the primary UI

### Real-time analysis flow
- Use browser microphone capture via `getUserMedia`, with the user instructed to place the suspicious phone call on speaker near the device.
- Stream short audio chunks to the backend for:
  - speech-to-text
  - rolling transcript assembly
  - incremental risk scoring
  - vishing heuristics
  - optional synthetic-voice suspicion signals
- Analyze on a rolling window and cumulative session basis:
  - urgency and panic language
  - family-emergency framing
  - impersonation of relatives, police, bank, hospital, IRS, delivery, fraud team, tech support
  - requests for money, gift cards, wire transfers, crypto, or OTP codes
  - requests to stay on the line or keep the call secret
  - requests to move to another app or payment method
- Surface challenge questions dynamically based on detected scenario:
  - family identity checks
  - known personal-history checks
  - institution callback verification prompts
  - “hang up and call the official number” guidance when appropriate

### Voice/deepfake handling
- Treat synthetic-voice detection as a supporting signal, not the sole decision engine.
- Return a separate signal family such as:
  - `voice pattern suspicious`
  - `speech cadence inconsistent`
  - `audio artifacts detected`
  - `confidence too low to assess synthetic speech`
- Never label the result as “confirmed AI deepfake.”
- If acoustic analysis is weak or unavailable, the feature must still work through transcript + scam-pattern analysis + challenge-question coaching.

### Backend and interfaces
- Add a new scan type such as `voice` or `call_guard` to shared types and result adapters.
- Add backend endpoints for:
  - starting a live session
  - accepting streaming audio chunks
  - returning incremental transcript and risk updates
  - ending/finalizing a session into a normal CyberCoach report payload
- Reuse the shared response model shape where possible:
  - risk label
  - likely scam pattern
  - summary
  - key findings
  - recommended actions
  - technical evidence
  - quick tip
  - report actions
- Extend metadata for live-call sessions with fields like:
  - session status
  - transcript segments
  - live warnings
  - challenge questions
  - voice-signal findings
  - partial/final analysis state
- Keep session data ephemeral by default; only final exported reports persist outside the active runtime if the existing app already supports that output path.

## Test Plan
- Core live flow:
  - start listening from browser mic
  - receive rolling transcript updates
  - show live warnings within a short delay
  - stop session and generate final report
- Positive detection scenarios:
  - fake grandchild emergency asking for urgent money
  - fake bank fraud team asking for OTP or transfer confirmation
  - fake police or government caller demanding immediate payment
  - fake hospital or legal-pressure scenario urging secrecy and panic
- Safety/false-positive scenarios:
  - normal family call with emotional tone but no fraud request
  - legitimate bank callback with no credential/payment request
  - poor audio quality where transcript is partial
- Voice-signal behavior:
  - synthetic or obviously processed voice sample produces only a suspicion signal, not definitive deepfake wording
  - low-quality audio falls back gracefully to transcript-led guidance
- Accessibility and UX:
  - large-text desktop/tablet usability
  - clear mic permission flow
  - visible listening/not-listening states
  - challenge questions readable during a stressful call
- Privacy:
  - confirm raw audio is not stored by default
  - confirm session clears after end unless user exports a report
- Regression:
  - existing message, URL, screenshot, and document scan flows remain unchanged
  - shared report generation still works with the new scan type

## Assumptions and Defaults
- First release is browser-based speakerphone listening, not telecom/phone-call integration.
- Primary first-release user is a senior on desktop/tablet, with caregiver support as a secondary benefit.
- Default runtime policy is ephemeral-only audio handling.
- The feature’s promise is “real-time scam and suspicious-voice guidance,” not “proof that a voice is AI-generated.”
- The initial implementation should prioritize transcript-driven scam detection and challenge-question coaching, with acoustic deepfake signals as an additive layer rather than a blocker for launch.
