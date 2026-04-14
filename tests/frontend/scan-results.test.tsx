import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScanResults } from "@/components/scan/ScanResults";
import { adaptMessageScanResult, type BackendScanResponse } from "@/lib/scan";


const messagePayload: BackendScanResponse = {
  scan_type: "message",
  risk_label: "High Risk",
  risk_score: 8,
  confidence: "Medium",
  likely_scam_pattern: "Official Entity Impersonation",
  summary: "CyberCoach found several warning signs in this message.",
  top_reasons: [
    "The message imitates a trusted organization.",
    "The link and brand do not appear to match.",
  ],
  recommended_actions: [
    "Do not click the link until you verify it another way.",
    "Open the official site or app yourself if you need to check the account.",
  ],
  signals: [
    "The message imitates a trusted organization.",
    "The link and brand do not appear to match.",
  ],
  original_input: "Please verify your account right now.",
  redacted_input: null,
  provider_used: null,
  metadata: {
    language: "English",
    decision_source: "heuristic_fallback",
    heuristic_findings: [
      {
        type: "official_entity_impersonation",
        detail: "The content imitates a trusted organization.",
        severity: "high",
      },
    ],
    consensus: {
      status: "heuristic_fallback",
      summary: "This result came from the local analysis layer.",
      models_compared: 0,
      agree: false,
      strategy: "heuristics_only",
    },
    model_runs: [],
    evidence_buckets: [],
    url_evidence: [],
    url_live_inspection: [],
    ocr: {},
    document: {},
    voice: {},
  },
};


describe("ScanResults", () => {
  it("renders the shared result hierarchy for a completed scan", () => {
    const result = adaptMessageScanResult(messagePayload, {
      locale: "en",
      privacyMode: true,
    });

    render(
      <ScanResults
        result={result}
        loading={false}
        onCopyReport={vi.fn(async () => {})}
        onDownloadReport={vi.fn(async () => {})}
        reportBusy={null}
        notice={null}
      />,
    );

    expect(screen.getByText("Risk Summary")).toBeInTheDocument();
    expect(screen.getByText("What To Do Next")).toBeInTheDocument();
    expect(screen.getByText("Key Findings")).toBeInTheDocument();
    expect(screen.getByText("Report Actions")).toBeInTheDocument();
    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });

  it("renders the loading shell while analysis is running", () => {
    render(
      <ScanResults
        result={null}
        loading
        onCopyReport={vi.fn(async () => {})}
        onDownloadReport={vi.fn(async () => {})}
        reportBusy={null}
        notice={null}
      />,
    );

    expect(document.querySelectorAll(".loading-sheen").length).toBeGreaterThan(0);
  });
});
