"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import {
  getScanLocaleCopy,
  resolveSupportedLocale,
  type DetailedScanHistoryItem,
  type MessageScanResult
} from "@/lib/scan";

type ScreenshotScanResultsProps = {
  result: MessageScanResult | null;
  loading: boolean;
  historyItems: DetailedScanHistoryItem[];
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  onRestoreHistory: (item: DetailedScanHistoryItem) => void;
  reportBusy: "copy" | "txt" | "md" | null;
};

function ResultShell({
  title,
  eyebrow,
  children,
  className = "",
  delay = 0
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`ghost-border animate-fade-up bg-surface-container-low p-8 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function LoadingResults() {
  return (
    <section className="grid grid-cols-12 gap-6 animate-fade-up">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`loading-sheen ghost-border bg-surface-container-low p-8 ${index === 0 ? "col-span-12 md:col-span-5" : "col-span-12 md:col-span-7"}`}
        >
          <div className="h-3 w-28 bg-surface-container-highest" />
          <div className="mt-5 h-8 w-3/4 bg-surface-container-highest" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-full bg-surface-container-highest" />
            <div className="h-3 w-5/6 bg-surface-container-highest" />
            <div className="h-3 w-2/3 bg-surface-container-highest" />
          </div>
        </div>
      ))}
    </section>
  );
}

function PlaceholderFeatures() {
  return (
    <section className="grid grid-cols-12 gap-6 animate-fade-up">
      <div className="col-span-12 bg-primary-container p-8 md:col-span-6">
        <ShieldCheckIcon className="h-8 w-8 text-secondary" />
        <h3 className="mt-6 font-headline text-2xl font-bold tracking-tight text-vellum">Upload or Capture</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-primary-container">
          Drag in a screenshot, browse for an image file, or take a fresh photo from your device to start the vision scan.
        </p>
      </div>
      <div className="col-span-12 bg-surface-container-high p-8 md:col-span-6">
        <CheckCircleIcon className="h-8 w-8 text-secondary" />
        <h3 className="mt-6 font-headline text-2xl font-bold tracking-tight text-vellum">Vision + Guidance</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-surface-variant">
          CyberCoach extracts visible text, runs preserved phishing heuristics, and returns the same guidance/report flow as the original app.
        </p>
      </div>
    </section>
  );
}

function RiskAccent({ label }: { label: MessageScanResult["riskLabel"] }) {
  if (label === "High Risk") {
    return "text-[#ffb4ab]";
  }
  if (label === "Suspicious") {
    return "text-secondary";
  }
  return "text-[#d6e3ff]";
}

function RecommendedActionsCard({ actions }: { actions: string[] }) {
  const [checked, setChecked] = useState<number[]>([]);

  return (
    <div className="space-y-3">
      {actions.map((action, index) => {
        const active = checked.includes(index);
        return (
          <button
            key={action}
            type="button"
            onClick={() =>
              setChecked((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))
            }
            className={`flex w-full items-start gap-4 border px-4 py-4 text-left transition-all ${
              active
                ? "border-secondary/50 bg-secondary/10"
                : "border-outline-variant/30 bg-surface-container-lowest/50 hover:border-secondary/30 hover:bg-surface-container"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border ${
                active ? "border-secondary bg-secondary text-on-secondary" : "border-outline-variant text-outline"
              }`}
            >
              {active ? "✓" : index + 1}
            </span>
            <span className="text-sm leading-relaxed text-on-surface">{action}</span>
          </button>
        );
      })}
    </div>
  );
}

function analysisModeLabel(result: MessageScanResult) {
  const metadata = result.raw.metadata ?? {};
  const aiAvailable = metadata.ai_available !== false;
  const ocr = metadata.ocr as { ocr_available?: boolean; provider_used?: string | null } | undefined;

  if (ocr?.ocr_available && aiAvailable) {
    return "OCR + AI";
  }
  if (aiAvailable) {
    return "AI assisted";
  }
  return "Heuristic only";
}

function formatHistoryTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Live session";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function ScreenshotScanResults({
  result,
  loading,
  historyItems,
  onCopyReport,
  onDownloadReport,
  onRestoreHistory,
  reportBusy
}: ScreenshotScanResultsProps) {
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures />;
  }

  const currentSessionItems = historyItems.slice(0, 6);
  const showHistory = currentSessionItems.length > 1;
  const extractedText = result.raw.scan_type === "screenshot" ? result.originalInput : null;
  const locale = resolveSupportedLocale(result.raw.metadata?.language?.toString() ?? result.locale);

  return (
    <section className="grid grid-cols-12 gap-6">
      <ResultShell title={result.riskLabelDisplay} eyebrow={copy.result.riskSummary} className="col-span-12 md:col-span-5">
        <div className="space-y-5">
          <div className={`font-headline text-5xl font-extrabold tracking-editorial ${RiskAccent({ label: result.riskLabel })}`}>
            {result.riskScore}
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
              {analysisModeLabel(result)}
            </span>
            <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-vellum">
              {copy.result.confidence} {result.confidenceDisplay}
            </span>
          </div>
          <div className="ghost-border bg-surface-container-lowest/60 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.result.likelyPattern}</p>
            <p className="mt-2 text-lg font-semibold text-vellum">{result.likelyScamPattern}</p>
          </div>
          <p className="text-base leading-relaxed text-on-surface">{result.summary}</p>
        </div>
      </ResultShell>

      <ResultShell title={copy.result.recommendedActions} eyebrow={copy.result.whatToDoNext} className="col-span-12 md:col-span-7" delay={60}>
        <RecommendedActionsCard actions={result.recommendedActions} />
      </ResultShell>

      <ResultShell title="Summary" eyebrow="Threat Brief" className="col-span-12 md:col-span-6" delay={120}>
        <p className="text-sm leading-relaxed text-on-surface">{result.summary}</p>
      </ResultShell>

      <ResultShell title={copy.result.keyFindings} eyebrow={copy.result.patternScan} className="col-span-12 md:col-span-6" delay={180}>
        <div className="space-y-4">
          {result.topReasons.map((reason, index) => (
            <div key={reason} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-primary-container font-label text-[10px] font-bold text-secondary">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-on-surface">{reason}</p>
            </div>
          ))}
        </div>
      </ResultShell>

      {result.technicalDetails.length > 0 ? (
        <ResultShell title={copy.result.technicalDetails} eyebrow={copy.result.triggeredRules} className="col-span-12" delay={240}>
          <div className="grid gap-4 md:grid-cols-2">
            {result.technicalDetails.map((detail) => (
              <div key={`${detail.label}-${detail.detail}`} className="ghost-border bg-surface-container-lowest/55 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {detail.label}
                  </span>
                  <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">{detail.severity}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{detail.detail}</p>
              </div>
            ))}
          </div>
        </ResultShell>
      ) : null}

      {result.quickTip ? (
        <ResultShell title={copy.result.quickTip} eyebrow={copy.result.educationalGuidance} className="col-span-12 md:col-span-8" delay={300}>
          <p className="text-sm leading-relaxed text-on-surface">{result.quickTip}</p>
        </ResultShell>
      ) : null}

      {result.privacyNote ? (
        <ResultShell title={copy.result.privacyNoteTitle} eyebrow={copy.result.protectedReview} className="col-span-12 md:col-span-4" delay={360}>
          <div className="flex items-start gap-4">
            <LockIcon className="mt-1 h-6 w-6 shrink-0 text-secondary" />
            <p className="text-sm leading-relaxed text-on-surface">{result.privacyNote}</p>
          </div>
        </ResultShell>
      ) : null}

      {extractedText ? (
        <ResultShell title="Extracted Content" eyebrow="OCR Preview" className="col-span-12" delay={420}>
          <div className="ghost-border max-h-72 overflow-y-auto bg-surface-container-lowest/60 p-5">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-on-surface">{extractedText}</pre>
          </div>
        </ResultShell>
      ) : null}

      <ResultShell title={copy.result.reportActions} eyebrow="Forward To IT" className="col-span-12 md:col-span-7" delay={480}>
        <div className="grid gap-3 md:grid-cols-3">
          <button type="button" onClick={() => void onCopyReport()} className="editorial-button justify-between px-5">
            <span>{reportBusy === "copy" ? copy.result.copying : copy.result.copyReport}</span>
            <span className="text-secondary">TXT</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("txt")} className="editorial-button justify-between px-5">
            <span>{reportBusy === "txt" ? copy.result.preparing : copy.result.downloadTxt}</span>
            <span className="text-secondary">.txt</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("md")} className="editorial-button justify-between px-5">
            <span>{reportBusy === "md" ? copy.result.preparing : copy.result.downloadMd}</span>
            <span className="text-secondary">.md</span>
          </button>
        </div>
      </ResultShell>

      {showHistory ? (
        <ResultShell title="Session History" eyebrow="Recent Scans" className="col-span-12 md:col-span-5" delay={540}>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between border border-outline-variant/30 bg-surface-container-lowest/60 px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container"
            >
              <span>
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  Current Session
                </span>
                <p className="mt-1 text-sm text-on-surface-variant">{currentSessionItems.length} saved scan snapshots are available.</p>
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {historyOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            <div className={`grid overflow-hidden transition-all duration-500 ${historyOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0">
                <div className="space-y-3 pt-2">
                  {currentSessionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onRestoreHistory(item)}
                      className="flex w-full items-start justify-between gap-4 border border-outline-variant/20 bg-surface-container-low p-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container-high"
                    >
                      <div>
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                          {item.scanType} · {formatHistoryTime(item.createdAt)}
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
                        {getScanLocaleCopy(locale).riskLabels[item.riskLabel]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ResultShell>
      ) : null}
    </section>
  );
}
