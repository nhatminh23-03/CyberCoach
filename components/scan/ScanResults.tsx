"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import {
  DecisionSummaryPanel,
  ModelAssessmentsPanel,
  UrlEvidencePanel,
  getConsensusStatusLabel,
  getDecisionModeBadgeLabel,
  getDecisionPanelCopy
} from "@/components/scan/DecisionPanels";
import { useHighlightOnFirstVisible } from "@/components/scan/useHighlightOnFirstVisible";
import { getScanLocaleCopy, type MessageScanResult } from "@/lib/scan";

type ScanResultsProps = {
  result: MessageScanResult | null;
  loading: boolean;
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  reportBusy: "copy" | "txt" | "md" | null;
  notice: string | null;
  showDecisionPanels?: boolean;
  decisionHighlightKey?: number;
};

function ResultShell({
  title,
  eyebrow,
  children,
  className = "",
  delay = 0,
  highlightSessionKey = null,
  highlightEnabled = false
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  highlightSessionKey?: string | null;
  highlightEnabled?: boolean;
}) {
  const { ref, activeClassName } = useHighlightOnFirstVisible({
    sessionKey: highlightSessionKey,
    enabled: highlightEnabled
  });

  return (
    <section
      ref={ref}
      className={`ghost-border scan-card-highlightable animate-fade-up bg-surface-container-low p-8 ${activeClassName} ${className}`}
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

function DocumentBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "secondary" | "alert" }) {
  const className =
    tone === "secondary"
      ? "border-secondary/30 bg-secondary/10 text-secondary"
      : tone === "alert"
        ? "border-[#ffb4ab]/30 bg-[#93000a]/15 text-[#ffdad6]"
        : "border-outline-variant/30 bg-surface-container-lowest/60 text-vellum";

  return (
    <span className={`border px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] ${className}`}>
      {children}
    </span>
  );
}

export function ScanResults({
  result,
  loading,
  onCopyReport,
  onDownloadReport,
  reportBusy,
  notice,
  showDecisionPanels = true,
  decisionHighlightKey = 0
}: ScanResultsProps) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const [decisionHighlightActive, setDecisionHighlightActive] = useState(false);
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);
  const decisionCopy = useMemo(() => getDecisionPanelCopy(result?.locale ?? "en"), [result?.locale]);
  const highlightSessionKey = result
    ? [result.raw.metadata?.history_id ?? "", result.riskScore, result.summary, result.likelyScamPattern].join("::")
    : null;

  useEffect(() => {
    if (typeof window === "undefined" || decisionHighlightKey === 0) {
      return;
    }

    setDecisionHighlightActive(true);
    const timeout = window.setTimeout(() => {
      setDecisionHighlightActive(false);
    }, 1700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [decisionHighlightKey]);

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
          highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:risk` : null}
          highlightEnabled
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
            <div className="flex flex-wrap gap-2">
              <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                {getDecisionModeBadgeLabel(result.decisionSource, result.locale)}
              </span>
              {result.consensus ? (
                <span className="border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                  {getConsensusStatusLabel(result.consensus.status, result.locale)}
                </span>
              ) : null}
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

        <ResultShell
          title={copy.result.recommendedActions}
          eyebrow={copy.result.whatToDoNext}
          className="col-span-12 md:col-span-7"
          delay={60}
          highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:actions` : null}
          highlightEnabled
        >
          <RecommendedActionsCard actions={result.recommendedActions} />
        </ResultShell>

        <ResultShell
          title={copy.result.keyFindings}
          eyebrow={copy.result.patternScan}
          className="col-span-12 md:col-span-6"
          delay={120}
          highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:findings` : null}
          highlightEnabled
        >
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

        <ResultShell
          title={copy.result.technicalDetails}
          eyebrow={copy.result.triggeredRules}
          className={`col-span-12 md:col-span-6 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
          delay={180}
        >
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

        {result.documentAnalysis ? (
          <ResultShell
            title="Document X-Ray"
            eyebrow="Attachment Intelligence"
            className="col-span-12"
            delay={195}
            highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:document-xray` : null}
            highlightEnabled
          >
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <DocumentBadge tone="secondary">{result.documentAnalysis.fileType}</DocumentBadge>
                <DocumentBadge>{result.documentAnalysis.fileSizeDisplay}</DocumentBadge>
                {result.documentAnalysis.pageCount !== null ? <DocumentBadge>{result.documentAnalysis.pageCount} Pages</DocumentBadge> : null}
                {result.documentAnalysis.sectionCount !== null ? (
                  <DocumentBadge>{result.documentAnalysis.sectionCount} Sections</DocumentBadge>
                ) : null}
                {result.documentAnalysis.protected ? <DocumentBadge tone="alert">Protected</DocumentBadge> : null}
                {result.documentAnalysis.partialAnalysis ? <DocumentBadge>Partial Analysis</DocumentBadge> : null}
                {result.documentAnalysis.imageBased ? <DocumentBadge>Image Based</DocumentBadge> : null}
                {result.documentAnalysis.ocrFallbackUsed ? <DocumentBadge tone="secondary">OCR Fallback</DocumentBadge> : null}
                {result.documentAnalysis.macroEnabled ? <DocumentBadge tone="alert">Macro Enabled</DocumentBadge> : null}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)]">
                <div className="ghost-border min-w-0 bg-surface-container-lowest/55 p-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">File</p>
                  <p className="mt-2 text-sm font-semibold text-vellum break-words [overflow-wrap:anywhere]">
                    {result.documentAnalysis.fileName}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant break-words [overflow-wrap:anywhere]">
                    {result.documentAnalysis.mediaType}
                  </p>
                </div>
                <div className="ghost-border min-w-0 bg-surface-container-lowest/55 p-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Reader</p>
                  <p className="mt-2 text-sm font-semibold text-vellum">{result.documentAnalysis.parser}</p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    {result.documentAnalysis.ocrFallbackUsed
                      ? `Rendered-page OCR reviewed ${result.documentAnalysis.ocrPagesAnalyzed} page${result.documentAnalysis.ocrPagesAnalyzed === 1 ? "" : "s"}${result.documentAnalysis.ocrPageLimit ? ` (limit ${result.documentAnalysis.ocrPageLimit})` : ""}.`
                      : result.documentAnalysis.inspectable
                        ? "Deeper review completed."
                        : "Only a limited review was possible for this file."}
                  </p>
                </div>
              </div>

              <div className="ghost-border bg-primary-container/20 p-4">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Text Preview</p>
                <p className="mt-3 max-w-4xl text-sm leading-relaxed text-on-surface-variant">
                  {result.documentAnalysis.textPreview || "No readable text preview was available for this attachment."}
                </p>
              </div>
            </div>
          </ResultShell>
        ) : null}

        {result.documentAnalysis ? (
          <ResultShell title="Links And Buttons" eyebrow="Where they lead" className="col-span-12" delay={205}>
            <div className="grid gap-4 xl:grid-cols-2">
              {result.documentAnalysis.linkPairs.length > 0 ? (
                result.documentAnalysis.linkPairs.slice(0, 5).map((link, index) => (
                  <div key={`${link.target_url ?? "link"}-${index}`} className="ghost-border min-w-0 bg-surface-container-lowest/55 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary break-words [overflow-wrap:anywhere]">
                        {link.display_text?.trim() || `Link ${index + 1}`}
                      </span>
                      {link.display_target_mismatch ? <DocumentBadge tone="alert">Mismatch</DocumentBadge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface break-words [overflow-wrap:anywhere]">
                      {link.target_url?.trim() || "Unknown destination"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {link.registrable_domain ? <DocumentBadge>{link.registrable_domain}</DocumentBadge> : null}
                      {link.is_call_to_action ? <DocumentBadge tone="secondary">CTA</DocumentBadge> : null}
                      {link.is_shortened ? <DocumentBadge tone="alert">Shortened</DocumentBadge> : null}
                      {link.is_raw_ip ? <DocumentBadge tone="alert">Raw IP</DocumentBadge> : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  No embedded links were extracted from this document.
                </p>
              )}
            </div>
          </ResultShell>
        ) : null}

        {result.documentAnalysis && (result.documentAnalysis.qrPayloads.length > 0 || result.documentAnalysis.limitations.length > 0 || result.documentAnalysis.ocrFallbackUsed || result.documentAnalysis.macroEnabled) ? (
          <ResultShell title="Evidence Notes" eyebrow="QR codes and review limits" className="col-span-12" delay={215}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Review limits</p>
                {result.documentAnalysis.ocrFallbackUsed ? (
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                    OCR fallback reviewed {result.documentAnalysis.ocrPagesAnalyzed} page{result.documentAnalysis.ocrPagesAnalyzed === 1 ? "" : "s"}
                    {result.documentAnalysis.ocrPageLimit ? ` with a limit of ${result.documentAnalysis.ocrPageLimit}` : ""}.
                  </div>
                ) : null}
                {result.documentAnalysis.macroEnabled ? (
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                    This file is macro-enabled. CyberCoach reviewed the visible content and destinations, but did not run any macros.
                  </div>
                ) : null}
                {result.documentAnalysis.limitations.length > 0 ? (
                  result.documentAnalysis.limitations.map((item) => (
                    <div key={item} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">No special review limits were reported.</p>
                )}
              </div>

              <div className="space-y-4">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Detected QR destinations</p>
                {result.documentAnalysis.qrPayloads.length > 0 ? (
                  result.documentAnalysis.qrPayloads.map((payload) => (
                    <div key={payload} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface break-words [overflow-wrap:anywhere]">
                      {payload}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">No QR destinations were extracted from this document.</p>
                )}
              </div>
            </div>
          </ResultShell>
        ) : null}

        {showDecisionPanels ? (
          <ResultShell
            title={decisionCopy.titles.decisionTrace}
            eyebrow={decisionCopy.titles.consensusEngine}
            className={`col-span-12 md:col-span-4 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
            delay={210}
          >
            <DecisionSummaryPanel result={result} />
          </ResultShell>
        ) : null}

        {showDecisionPanels ? (
          <ResultShell
            title={decisionCopy.titles.modelAssessments}
            eyebrow={decisionCopy.titles.crossModelReview}
            className={`col-span-12 md:col-span-8 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
            delay={225}
          >
            <ModelAssessmentsPanel result={result} />
          </ResultShell>
        ) : null}

        {result.urlEvidence.length > 0 ? (
          <ResultShell title={decisionCopy.titles.urlEvidence} eyebrow={decisionCopy.titles.domainIntelligence} className="col-span-12" delay={235}>
            <UrlEvidencePanel result={result} />
          </ResultShell>
        ) : null}

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
