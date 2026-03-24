"use client";

import type { ScanCapabilities } from "@/lib/scan";

type ScreenshotScanRightRailProps = {
  hasPreview: boolean;
  loading: boolean;
  capabilities: ScanCapabilities | null;
  statusMessage: string | null;
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
  "Use full-screen captures when possible so sender names, URLs, and button labels remain visible.",
  "Blurry photos reduce OCR quality. A steady capture usually yields stronger findings and clearer next steps.",
  "Privacy Mode can redact visible personal details before the final model review."
];

export function ScreenshotScanRightRail({
  hasPreview,
  loading,
  capabilities,
  statusMessage
}: ScreenshotScanRightRailProps) {
  const providerLabel = capabilities?.llmProvider === "openrouter" ? "OpenRouter" : capabilities?.llmProvider === "anthropic" ? "Anthropic" : "Unavailable";

  return (
    <aside className="space-y-12">
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Screenshot Analysis Notes</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            Vision capture guidance
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
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Vision Engine</h2>
          <span className="text-secondary">
            <EyeIcon />
          </span>
        </div>

        <div className="space-y-4">
          <div className="ghost-border bg-surface-container-lowest/50 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Status</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface">
              {loading
                ? "Extracting visible text, checking heuristics, and preparing guidance."
                : hasPreview
                  ? "Image loaded and ready for screenshot analysis."
                  : "Awaiting an uploaded screenshot or camera capture."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/50 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Provider</p>
              <p className="mt-2 text-sm text-on-surface">{providerLabel}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/50 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">API Access</p>
              <p className={`mt-2 text-sm ${capabilities?.screenshotAnalysisAvailable ? "text-on-surface" : "text-[#ffdad6]"}`}>
                {capabilities?.screenshotAnalysisAvailable ? "Ready" : "Required"}
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
            <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Capture Guidance</h2>
            <p className="mt-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
              Browse or take photo
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-on-surface-variant">
          The camera option is best for real-time phone-screen checks. Browse is best for saved screenshots with crisp text and full context.
        </p>
      </section>
    </aside>
  );
}
