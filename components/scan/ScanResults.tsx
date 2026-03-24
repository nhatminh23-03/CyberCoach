"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import { getScanLocaleCopy, type MessageScanResult } from "@/lib/scan";

type ScanResultsProps = {
  result: MessageScanResult | null;
  loading: boolean;
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  reportBusy: "copy" | "txt" | "md" | null;
  notice: string | null;
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

function PlaceholderFeatures() {
  return (
    <section className="grid grid-cols-12 gap-6 animate-fade-up">
      <div className="col-span-12 space-y-6 bg-primary-container p-8 md:col-span-7">
        <ShieldCheckIcon className="h-8 w-8 text-secondary" />
        <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Deep Link Inspection</h3>
        <p className="max-w-sm text-sm leading-relaxed text-on-primary-container">
          Our engine examines embedded links, destination reputations, and redirection patterns before you act.
        </p>
      </div>
      <div className="col-span-12 space-y-6 bg-surface-container-high p-8 md:col-span-5">
        <CheckCircleIcon className="h-8 w-8 text-secondary" />
        <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Urgency Detection</h3>
        <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
          Identifies pressure tactics and coercive language designed to bypass your normal judgment.
        </p>
      </div>
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
            style={{ animationDelay: `${index * 70}ms` }}
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

export function ScanResults({
  result,
  loading,
  onCopyReport,
  onDownloadReport,
  reportBusy,
  notice
}: ScanResultsProps) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures />;
  }

  return (
    <section className="space-y-6">
      {notice ? (
        <div className="ghost-border animate-fade-up border-secondary/30 bg-secondary/10 p-5 text-sm leading-relaxed text-secondary">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-6">
        <ResultShell
          title={result.riskLabelDisplay}
          eyebrow={copy.result.riskSummary}
          className="col-span-12 md:col-span-5"
        >
          <div className="space-y-5">
            <div className={`font-headline text-5xl font-extrabold tracking-editorial ${RiskAccent({ label: result.riskLabel })}`}>
              {result.riskScore}
            </div>
            <div className="space-y-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{copy.result.heuristicScore}</p>
              <p className="text-sm text-on-surface-variant">
                {copy.result.confidence} {result.confidenceDisplay} · {result.providerLabel}
              </p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/60 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {copy.result.likelyPattern}
              </p>
              <p className="mt-2 text-lg font-semibold text-vellum">{result.likelyScamPattern}</p>
            </div>
            <p className="text-base leading-relaxed text-on-surface">{result.summary}</p>
          </div>
        </ResultShell>

        <ResultShell title={copy.result.recommendedActions} eyebrow={copy.result.whatToDoNext} className="col-span-12 md:col-span-7" delay={60}>
          <RecommendedActionsCard actions={result.recommendedActions} />
        </ResultShell>

        <ResultShell title={copy.result.keyFindings} eyebrow={copy.result.patternScan} className="col-span-12 md:col-span-6" delay={120}>
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

        <ResultShell title={copy.result.technicalDetails} eyebrow={copy.result.triggeredRules} className="col-span-12 md:col-span-6" delay={180}>
          <div className="space-y-4">
            {result.technicalDetails.length > 0 ? (
              result.technicalDetails.map((detail) => (
                <div key={`${detail.label}-${detail.detail}`} className="ghost-border bg-surface-container-lowest/55 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                      {detail.label}
                    </span>
                    <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">
                      {detail.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{detail.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">{copy.result.noTriggeredRules}</p>
            )}
          </div>
        </ResultShell>

        {result.privacyNote ? (
          <ResultShell title={copy.result.privacyNoteTitle} eyebrow={copy.result.protectedReview} className="col-span-12 md:col-span-4" delay={240}>
            <div className="flex items-start gap-4">
              <LockIcon className="mt-1 h-6 w-6 shrink-0 text-secondary" />
              <p className="text-sm leading-relaxed text-on-surface">{result.privacyNote}</p>
            </div>
          </ResultShell>
        ) : null}

        {result.quickTip ? (
          <ResultShell
            title={copy.result.quickTip}
            eyebrow={copy.result.educationalGuidance}
            className={result.privacyNote ? "col-span-12 md:col-span-8" : "col-span-12"}
            delay={300}
          >
            <p className="max-w-3xl text-sm leading-relaxed text-on-surface">{result.quickTip}</p>
          </ResultShell>
        ) : null}

        <ResultShell title={copy.result.riskScoreBreakdown} eyebrow={copy.result.advancedReview} className="col-span-12" delay={360}>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setScoreOpen((current) => !current)}
              className="flex w-full items-center justify-between border border-outline-variant/30 bg-surface-container-lowest/60 px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container"
            >
              <span>
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  {copy.result.scoreDetails}
                </span>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {copy.result.scoreDetailsDescription}
                </p>
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {scoreOpen ? copy.result.collapse : copy.result.expand}
              </span>
            </button>

            <div className={`grid overflow-hidden transition-all duration-500 ${scoreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0">
                <div className="space-y-3 pt-2">
                  {result.scoreBreakdown.length > 0 ? (
                    result.scoreBreakdown.map((item) => (
                      <div
                        key={`${item.label}-${item.detail}`}
                        className="flex items-start justify-between gap-6 border border-outline-variant/20 bg-surface-container-low p-4"
                      >
                        <div>
                          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{item.detail}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-headline text-2xl font-bold text-vellum">+{item.points}</p>
                          <p className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">
                            {item.severity}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="ghost-border bg-surface-container-low p-4 text-sm text-on-surface-variant">
                      {copy.result.noDetailedBreakdown}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ResultShell>

        <ResultShell title={copy.result.reportActions} eyebrow={copy.result.forwardOrArchive} className="col-span-12" delay={420}>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => void onCopyReport()}
              className="editorial-button justify-between px-5"
            >
              <span>{reportBusy === "copy" ? copy.result.copying : copy.result.copyReport}</span>
              <span className="text-secondary">TXT</span>
            </button>
            <button
              type="button"
              onClick={() => void onDownloadReport("txt")}
              className="editorial-button justify-between px-5"
            >
              <span>{reportBusy === "txt" ? copy.result.preparing : copy.result.downloadTxt}</span>
              <span className="text-secondary">.txt</span>
            </button>
            <button
              type="button"
              onClick={() => void onDownloadReport("md")}
              className="editorial-button justify-between px-5"
            >
              <span>{reportBusy === "md" ? copy.result.preparing : copy.result.downloadMd}</span>
              <span className="text-secondary">.md</span>
            </button>
          </div>
        </ResultShell>
      </div>
    </section>
  );
}
