import type { Page, Route } from "@playwright/test";


function scanResponse(overrides: Record<string, unknown>) {
  return {
    risk_label: "High Risk",
    risk_score: 8,
    confidence: "Medium",
    likely_scam_pattern: "Official Entity Impersonation",
    summary: "CyberCoach found multiple warning signs that deserve caution.",
    top_reasons: [
      "The sender or link appears to imitate a trusted organization.",
      "The message pushes the user to act quickly.",
    ],
    recommended_actions: [
      "Do not click the link or reply until you verify it through a trusted channel.",
      "Open the official site or app yourself if you need to check the account.",
    ],
    signals: [
      "The sender or link appears to imitate a trusted organization.",
      "The message pushes the user to act quickly.",
    ],
    original_input: "",
    redacted_input: null,
    provider_used: null,
    metadata: {
      language: "English",
      heuristic_findings: [
        {
          type: "official_entity_impersonation",
          detail: "The content imitates a trusted organization.",
          severity: "high",
        },
      ],
      evidence_buckets: [
        {
          key: "structural",
          score: 6,
          finding_count: 2,
          summary: "Most of the concern comes from the structure of the content or link.",
        },
        {
          key: "reputation",
          score: 0,
          finding_count: 0,
          summary: "No strong outside reputation signals were added here.",
        },
        {
          key: "destination",
          score: 0,
          finding_count: 0,
          summary: "Destination behavior did not add extra warning signs in this mock result.",
        },
      ],
      consensus: {
        status: "heuristic_fallback",
        summary: "This result was produced from the local analysis layer.",
        models_compared: 0,
        agree: false,
        strategy: "heuristics_only",
      },
      model_runs: [],
      url_evidence: [],
      url_live_inspection: [],
      ocr: {},
      document: {},
      voice: {},
    },
    ...overrides,
  };
}


export const messageScanResult = scanResponse({
  scan_type: "message",
  original_input: "Your bank needs you to verify your account right now.",
});

export const urlScanResult = scanResponse({
  scan_type: "url",
  likely_scam_pattern: "Brand Name And Link Do Not Match",
  original_input: "https://paypal-security-check-login.com/review",
  metadata: {
    language: "English",
    heuristic_findings: [
      {
        type: "domain_mismatch",
        detail: "The brand name and the real domain do not match.",
        severity: "high",
      },
    ],
    url_evidence: [
      {
        normalized_url: "https://paypal-security-check-login.com/review",
        domain: "paypal-security-check-login.com",
        registrable_domain: "paypal-security-check-login.com",
        subdomain: "",
        tld: ".com",
        subdomain_count: 0,
        is_raw_ip: false,
        is_shortened: false,
      },
    ],
    evidence_buckets: [
      {
        key: "structural",
        score: 9,
        finding_count: 3,
        summary: "Most of this risk comes from the link itself.",
      },
      {
        key: "reputation",
        score: 0,
        finding_count: 0,
        summary: "No reputation data was added in this mock response.",
      },
      {
        key: "destination",
        score: 0,
        finding_count: 0,
        summary: "Destination behavior did not add more warning signs in this mock response.",
      },
    ],
    consensus: {
      status: "heuristic_fallback",
      summary: "This result was produced from the local analysis layer.",
      models_compared: 0,
      agree: false,
      strategy: "heuristics_only",
    },
    model_runs: [],
    url_live_inspection: [],
    ocr: {},
    document: {},
    voice: {},
  },
});

export const documentScanResult = scanResponse({
  scan_type: "document",
  likely_scam_pattern: "Document Link Mismatch",
  original_input: "Secure file request",
  metadata: {
    language: "English",
    heuristic_findings: [
      {
        type: "document_link_mismatch",
        detail: "The document text and destination do not match.",
        severity: "high",
      },
    ],
    evidence_buckets: [],
    consensus: {
      status: "heuristic_fallback",
      summary: "This result was produced from the local analysis layer.",
      models_compared: 0,
      agree: false,
      strategy: "heuristics_only",
    },
    model_runs: [],
    url_evidence: [],
    url_live_inspection: [],
    ocr: {},
    document: {
      file_name: "invoice.docx",
      file_type: "docx",
      file_size: 2048,
      parser: "docx-xml",
      inspectable: true,
      protected: false,
      partial_analysis: false,
      image_based: false,
      macro_enabled: false,
      page_count: 2,
      section_count: 4,
      image_count: 0,
      text_preview: "Review the secure invoice request today.",
      extracted_text: "Review the secure invoice request today.",
      extracted_urls: ["https://microsoft-sharepoint-secure-docs-login.co/verify"],
      link_pairs: [
        {
          display_text: "Open Secure File in SharePoint",
          target_url: "https://microsoft-sharepoint-secure-docs-login.co/verify",
          target_domain: "microsoft-sharepoint-secure-docs-login.co",
          display_target_mismatch: true,
        },
      ],
      qr_payloads: [],
      limitations: [],
    },
    voice: {},
  },
});

export const voiceUploadResult = scanResponse({
  scan_type: "voice",
  likely_scam_pattern: "Voice Bank Impersonation",
  original_input:
    "This is the fraud department for your credit card account. Stay on the line and read me the one-time code.",
  metadata: {
    language: "English",
    heuristic_findings: [
      {
        type: "voice_bank_impersonation",
        detail: "The caller claims financial-account authority.",
        severity: "high",
      },
    ],
    evidence_buckets: [],
    consensus: {
      status: "heuristic_fallback",
      summary: "This result was produced from the local analysis layer.",
      models_compared: 0,
      agree: false,
      strategy: "heuristics_only",
    },
    model_runs: [],
    url_evidence: [],
    url_live_inspection: [],
    ocr: {},
    document: {},
    voice: {
      session_id: "voice-upload-123",
      analysis_state: "final",
      elapsed_seconds: 0,
      transcript_text:
        "This is the fraud department for your credit card account. Stay on the line and read me the one-time code.",
      transcript_segments: [
        {
          text: "This is the fraud department for your credit card account.",
          timestamp: "",
        },
      ],
      transcript_word_count: 18,
      challenge_questions: ["Call the official number from your card statement before acting."],
      live_warnings: ["The caller claims financial-account authority."],
      voice_signals: [],
      listening_mode: "uploaded_voicemail",
      source_file_name: "call.mp4",
      source_file_size: 4096,
      source_media_type: "video/mp4",
      transcription_source: "manual_override",
      transcription_model: "manual",
      limitations: [],
      live_ai_state: "final_ai_reviewed",
      live_ai_summary: "CyberCoach finalized this call from the transcript and warning signs.",
      live_ai_reasons: ["The caller claims financial-account authority."],
      live_ai_confidence: "Medium",
      live_ai_last_updated_at: "",
      live_ai_attempted: false,
      live_ai_action: "Call the official number from your card statement before acting.",
    },
  },
});


async function fulfillJson(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}


export async function installCommonApiMocks(page: Page) {
  await page.route("**/api/scan/capabilities", async (route) =>
    fulfillJson(route, {
      screenshot_analysis_available: false,
      screenshot_requires_api_key: true,
      llm_provider: null,
      llm_model: null,
      voice_live_browser_mode: true,
      voice_live_streaming_available: false,
      voice_recording_upload_available: true,
      voice_recording_auto_transcription_available: false,
    }),
  );

  await page.route("**/api/scan/history", async (route) => fulfillJson(route, { items: [] }));
  await page.route("**/api/intel/feed", async (route) => fulfillJson(route, { items: [] }));
  await page.route("**/api/scan/message-samples", async (route) =>
    fulfillJson(route, { presets: [], random_real_phish: null }),
  );
  await page.route("**/api/scan/url-precheck**", async (route) =>
    fulfillJson(route, {
      normalized_url: "https://paypal-security-check-login.com/review",
      domain: "paypal-security-check-login.com",
      registrable_domain: "paypal-security-check-login.com",
      tld: ".com",
      subdomain_count: 0,
      is_raw_ip: false,
      is_shortened: false,
      phishtank_loaded: false,
      phishtank_hit: false,
      phishtank_count: 0,
    }),
  );
}
