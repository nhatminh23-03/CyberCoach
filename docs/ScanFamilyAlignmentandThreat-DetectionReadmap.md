# Scan Family Alignment and Threat-Detection Roadmap

## Summary
- Phase 1 aligns Screenshot Scan and URL Scan with the same premium CyberCoach result scaffold already used by message/document flows: risk summary, recommended actions, key findings, technical evidence, scan-specific evidence, and report actions.
- Screenshot Scan will keep its own intelligence modules, especially OCR confidence, visual cues, QR review, and editable OCR text. It should feel related to Document Scan, not identical to it.
- URL Scan will get calmer live-inspection messaging so users do not see raw network or Python-style errors.
- Phase 2 extends Document Scan with OCR for image-based PDFs and limited macro-aware handling for macro-enabled Office files.

## Implementation Changes
### Phase 1: Shared scan-family UX
- Refactor Screenshot Scan and URL Scan to use the same high-level result section order as the shared CyberCoach scaffold:
  - risk summary
  - recommended actions
  - key findings
  - technical evidence
  - scan-specific evidence
  - report actions
- Keep the right rail reserved for contextual support only:
  - session history
  - scan notes
  - capabilities
  - intel/support panels
- Do not render session history inside the main result grid for Screenshot Scan or URL Scan.
- Keep wide evidence cards full-width once they contain long URLs, metric blocks, or multi-line evidence so they never feel compressed.

### Phase 1: Screenshot Scan improvements
- Expand screenshot-specific visual-signal detection to cover:
  - fake browser chrome or address bars
  - payment or banking app overlays
  - cropped sender/context warnings
  - notification/banner prompts
  - partial login screens or incomplete credential prompts
- Update screenshot copy and signal rendering so these appear as plain-language findings, not raw tags.
- Keep the current screenshot flow architecture:
  - client-side QR detection first
  - backend OCR and screenshot-vision analysis second
  - heuristics and guidance after that
- Preserve manual OCR correction/rescan, but keep it visually secondary to the main result summary.

### Phase 1: URL and destination inspection improvements
- Normalize live destination failures into calm user-facing states:
  - destination lookup unavailable in this environment
  - destination could not be resolved
  - destination lookup timed out
  - destination lookup was blocked before opening the page
- Keep lower-level error detail available in technical evidence and downloaded reports, but not as the main user-facing card copy.
- Treat blocked or failed destination checks as partial inspection, not as a clean result.

### Phase 2: Document Scan depth
- Add OCR fallback for image-based PDFs by rendering pages to images server-side and reusing the screenshot OCR/QR pipeline.
- Limit OCR to the first 5 pages by default and show a partial-coverage note when more pages exist.
- Add limited-inspection support for `.docm` and `.xlsm`:
  - accept upload
  - detect macro-enabled packaging or macro parts
  - return Suspicious or High Risk guidance with clear inspection limits
- Keep `.pdf` and `.docx` as the primary fully supported document formats.

## Public APIs and Types
- No new frontend routes are needed.
- Extend screenshot visual-signal types and localized copy to support the new UI cues.
- Keep the current URL inspection wire shape if possible by mapping existing `error` and `blocked_reason` values into a small frontend status model.
- Phase 2 extends document acceptance/type handling to include `.docm` and `.xlsm` as limited-inspection formats and adds document metadata for:
  - OCR coverage
  - OCR-derived text
  - macro detection flags

## Test Plan
- Screenshot Scan:
  - result layout matches the shared summary/actions/findings/report structure
  - session history appears only in the right rail and only shows screenshot entries
  - QR payloads still decode and feed into findings/destination inspection
  - blurred, cropped, or partial screenshots surface OCR-quality warnings
  - fake browser/login/payment-style screenshots trigger the new visual findings
  - manual OCR override changes the result and preserves original OCR text for comparison
- URL Scan:
  - successful live lookup still shows destination details for resolvable URLs
  - unresolved or blocked URLs show calm user-facing copy instead of raw transport errors
  - failed destination checks are shown as incomplete inspection, not implicitly safe
  - long URLs and metric blocks wrap cleanly without overlap
  - session history appears only in the right rail and only shows URL entries
- Document Phase 2:
  - image-based PDFs produce OCR-derived findings and a partial-coverage note
  - PDFs longer than 5 pages clearly state OCR page limits
  - DOCM/XLSM files are accepted, flagged as macro-enabled, and return limited-inspection guidance
  - standard PDF/DOCX flows continue to behave as they do now
- Regression:
  - message, URL, screenshot, and document report copy/download still work
  - scan history restore still works per scan type
  - full build and typecheck pass

## Assumptions and Defaults
- The target is a shared CyberCoach scaffold, not a pixel-identical screenshot/document clone.
- Phase 1 is the UI and explainability alignment release.
- Phase 2 is the deeper document-intelligence expansion.
- Live destination inspection remains best-effort and must never be presented as full verification when the environment blocks resolution.
- Image-based PDF OCR should reuse the screenshot-analysis pipeline rather than becoming a separate product path.
