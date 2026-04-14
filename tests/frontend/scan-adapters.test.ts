import { afterEach, describe, expect, it, vi } from "vitest";

import {
  adaptMessageScanResult,
  buildPlainTextReport,
  fetchScanCapabilities,
  type BackendScanResponse,
} from "@/lib/scan";


const baseResponse: BackendScanResponse = {
  scan_type: "document",
  risk_label: "High Risk",
  risk_score: 9,
  confidence: "Medium",
  likely_scam_pattern: "Document Link Mismatch",
  summary: "The document scan found multiple warning signs that deserve caution.",
  top_reasons: ["The document text and the real destination do not match."],
  recommended_actions: ["Do not click the link. Verify the request in a trusted app or site."],
  signals: ["The document text and the real destination do not match."],
  original_input: "Secure file request",
  redacted_input: null,
  provider_used: null,
  metadata: {
    language: "English",
    decision_source: "heuristic_fallback",
    heuristic_findings: [
      {
        type: "document_link_mismatch",
        detail: "The document presents a trusted button but sends you to another domain.",
        severity: "high",
      },
    ],
    document: {
      file_name: "secure-review.docx",
      file_type: "docx",
      file_size: 2048,
      parser: "docx-xml",
      inspectable: true,
      protected: false,
      partial_analysis: false,
      image_based: false,
      macro_enabled: false,
      page_count: null,
      section_count: 4,
      image_count: 1,
      text_preview: "Secure Document Review Request",
      extracted_text: "Secure Document Review Request",
      extracted_urls: ["https://microsoft-sharepoint-secure-docs-login.co/verify"],
      link_pairs: [
        {
          display_text: "Open Secure File in SharePoint",
          target_url: "https://microsoft-sharepoint-secure-docs-login.co/verify",
          target_domain: "microsoft-sharepoint-secure-docs-login.co",
          display_target_mismatch: true,
        },
      ],
      qr_payloads: ["https://microsoft-sharepoint-secure-docs-login.co/verify"],
      limitations: [
        "QR-code inspection support is unavailable in the current backend environment.",
        "Only the first 5 pages were checked.",
      ],
    },
  },
};


describe("scan adapters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes document metadata and suppresses stale QR-unavailable copy when a payload exists", () => {
    const adapted = adaptMessageScanResult(baseResponse, {
      locale: "en",
      privacyMode: true,
    });

    expect(adapted.documentAnalysis?.qrPayloads).toEqual([
      "https://microsoft-sharepoint-secure-docs-login.co/verify",
    ]);
    expect(adapted.documentAnalysis?.limitations).not.toContain(
      "QR-code inspection support is unavailable in the current backend environment.",
    );
    expect(adapted.technicalDetails[0].label).toBe("Document text and link destination do not match");
  });

  it("builds a plain-text report with the same user-facing sections", () => {
    const adapted = adaptMessageScanResult(baseResponse, {
      locale: "en",
      privacyMode: true,
    });

    const report = buildPlainTextReport(adapted);

    expect(report).toContain("CyberCoach Safety Report");
    expect(report).toContain("Document X-Ray");
    expect(report).toContain("Recommended Actions");
    expect(report).toContain("Embedded Links");
  });

  it("maps backend scan capabilities into the frontend-friendly shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          screenshot_analysis_available: true,
          screenshot_requires_api_key: true,
          llm_provider: "openrouter",
          llm_model: "anthropic/claude-sonnet-4.6",
          voice_live_browser_mode: true,
          voice_live_streaming_available: true,
          voice_recording_upload_available: true,
          voice_recording_auto_transcription_available: false,
        }),
      ) as Response,
    );

    await expect(fetchScanCapabilities()).resolves.toEqual({
      screenshotAnalysisAvailable: true,
      screenshotRequiresApiKey: true,
      llmProvider: "openrouter",
      llmModel: "anthropic/claude-sonnet-4.6",
      voiceLiveBrowserMode: true,
      voiceLiveStreamingAvailable: true,
      voiceRecordingUploadAvailable: true,
      voiceRecordingAutoTranscriptionAvailable: false,
    });
  });
});
