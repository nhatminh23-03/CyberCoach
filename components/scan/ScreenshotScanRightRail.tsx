"use client";

import { useState } from "react";

import { getScanLocaleCopy, type DetailedScanHistoryItem, type ScanCapabilities, type SupportedLocale } from "@/lib/scan";

type ScreenshotScanRightRailProps = {
  hasPreview: boolean;
  loading: boolean;
  capabilities: ScanCapabilities | null;
  statusMessage: string | null;
  historyItems: DetailedScanHistoryItem[];
  locale: SupportedLocale;
  onRestoreHistory: (item: DetailedScanHistoryItem) => void;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path d="M4 7h3l1.4-2h7.2L17 7h3v12H4Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

const notes = [
  "Use full-screen captures when possible so sender names, links, and button labels stay visible.",
  "Blurry photos make the text harder to read. A steady image usually leads to clearer findings and next steps.",
  "Privacy Mode can redact visible personal details before the final review."
];

function formatHistoryTime(isoDate: string, locale: SupportedLocale) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return locale === "en" ? "Live session" : "Live session";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function ScreenshotScanRightRail({
  hasPreview,
  loading,
  capabilities,
  statusMessage,
  historyItems,
  locale,
  onRestoreHistory
}: ScreenshotScanRightRailProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const providerLabel = capabilities?.llmProvider === "openrouter" ? "OpenRouter" : capabilities?.llmProvider === "anthropic" ? "Anthropic" : "Unavailable";
  const currentSessionItems = historyItems.slice(0, 6);
  const localized = getScanLocaleCopy(locale);

  return (
    <aside className="space-y-12">
      {currentSessionItems.length > 1 ? (
        <section className="animate-fade-up space-y-6" style={{ animationDelay: "90ms" }}>
          <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Session History</h2>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
              Current session snapshots
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 border border-outline-variant/30 bg-surface-container-low px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container-high"
            >
              <span className="min-w-0">
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  Current Session
                </span>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {currentSessionItems.length} saved scan snapshot{currentSessionItems.length === 1 ? "" : "s"} are available.
                </p>
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {historyOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            <div className={`grid overflow-hidden transition-all duration-500 ${historyOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0">
                <div className="max-h-80 space-y-3 overflow-y-auto pt-2 pr-1">
                  {currentSessionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onRestoreHistory(item)}
                      className="grid w-full gap-3 border border-outline-variant/20 bg-surface-container-low p-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container-high sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                          {item.scanType} · {formatHistoryTime(item.createdAt, locale)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{item.snippet}</p>
                      </div>
                      <span
                        className={`font-label text-[10px] font-bold uppercase ${
                          item.riskLabel === "High Risk"
                            ? "text-[#ffb4ab]"
                            : item.riskLabel === "Suspicious"
                              ? "text-secondary"
                              : "text-[#d6e3ff]"
                        }`}
                      >
                        {localized.riskLabels[item.riskLabel]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Screenshot Analysis Notes</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            Screenshot guidance
          </p>
        </div>

        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note} className="ghost-border bg-surface-container-low p-5">
              <p className="text-sm leading-relaxed text-on-surface-variant">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-fade-up space-y-6 bg-primary-container/35 p-8" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Review Readiness</h2>
          <span className="text-secondary">
            <EyeIcon />
          </span>
        </div>

        <div className="space-y-4">
          <div className="ghost-border bg-surface-container-lowest/50 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Status</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface">
              {loading
                ? "Reading visible text, checking the screenshot, and preparing guidance."
                : hasPreview
                  ? "The image is loaded and ready for screenshot review."
                  : "Waiting for an uploaded screenshot or camera capture."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/50 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Provider</p>
              <p className="mt-2 text-sm text-on-surface">{providerLabel}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/50 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Availability</p>
              <p className={`mt-2 text-sm ${capabilities?.screenshotAnalysisAvailable ? "text-on-surface" : "text-[#ffdad6]"}`}>
                {capabilities?.screenshotAnalysisAvailable ? "Ready" : "Needs setup"}
              </p>
            </div>
          </div>

          {capabilities?.llmModel ? (
            <div className="ghost-border bg-surface-container-lowest/50 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Model</p>
              <p className="mt-2 break-all text-sm leading-relaxed text-on-surface-variant">{capabilities.llmModel}</p>
            </div>
          ) : null}

          {statusMessage ? (
            <div className="ghost-border border-secondary/20 bg-secondary/10 p-4 text-sm leading-relaxed text-secondary">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </section>

      <section className="animate-fade-up space-y-6 bg-surface-container-low p-8" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center gap-3">
          <span className="text-secondary">
            <CameraIcon />
          </span>
          <div>
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">How to capture it</h2>
            <p className="mt-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
              Browse or take photo
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-on-surface-variant">
          Use the camera for a quick photo of a live screen. Use browse for saved screenshots with clear text and full context.
        </p>
      </section>
    </aside>
  );
}
