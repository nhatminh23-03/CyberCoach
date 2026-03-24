"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import { getScanLocaleCopy, type MessageScanResult, type UrlPrecheck } from "@/lib/scan";

type UrlScanResultsProps = {
  result: MessageScanResult | null;
  precheck: UrlPrecheck | null;
  loading: boolean;
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
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

function PlaceholderFeatures() {
  return (
    <section className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <ShieldCheckIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Deep Link Crawl</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Recursive extraction of target links, destination hosts, and nested path structure before you decide.
          </p>
        </div>
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <CheckCircleIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Domain Reputation</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Cross-reference against local phishing intelligence, suspicious TLDs, and deceptive domain structure.
          </p>
        </div>
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <ShieldCheckIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Phishing Signature</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Heuristic matching for homoglyph attacks, IP-based links, shorteners, and excessive subdomain layering.
          </p>
        </div>
      </div>

      <div className="animate-fade-up border-l-2 border-secondary bg-primary-container p-8" style={{ animationDelay: "90ms" }}>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Live Interception Log</p>
            <p className="mt-2 text-sm text-on-primary-container">Session ID: CC-URL-ALPHA</p>
          </div>
          <div className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
            Encrypted Session
          </div>
        </div>
        <div className="space-y-3 font-mono text-[12px] text-primary">
          <div>
            <span className="text-secondary">[08:42:11]</span> Initializing URL inspection environment...
          </div>
          <div>
            <span className="text-secondary">[08:42:13]</span> Waiting for target endpoint input...
          </div>
          <div>
            <span className="text-secondary">[08:42:15]</span> DNS, PhishTank, and heuristic checks will appear after analysis.
          </div>
        </div>
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

function UrlMetadataCard({ precheck }: { precheck: UrlPrecheck | null }) {
  const tags = [
    precheck?.isRawIp ? "Raw IP" : null,
    precheck?.isShortened ? "URL Shortener" : null,
    precheck?.phishTankHit ? "PhishTank Match" : null
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {precheck ? (
        <>
          <div className="ghost-border bg-surface-container-lowest/55 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Normalized URL</p>
            <p className="mt-2 break-all text-sm leading-relaxed text-on-surface">{precheck.normalizedUrl}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Domain</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.domain}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">TLD</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.tld}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Subdomains</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.subdomainCount}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Phishing Database</p>
              <p className={`mt-2 text-lg font-semibold ${precheck.phishTankHit ? "text-[#ffb4ab]" : "text-vellum"}`}>
                {precheck.phishTankLoaded
                  ? precheck.phishTankHit
                    ? "Found in PhishTank"
                    : "Not Found"
                  : "Dataset Unavailable"}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {precheck.phishTankLoaded
                  ? `${precheck.phishTankCount.toLocaleString()} known phishing URLs checked`
                  : "Add verified_online.csv to enable local phishing-database confirmation."}
              </p>
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Paste a URL to preview its normalized host, top-level domain, subdomain count, and phishing-database status.
        </p>
      )}
    </div>
  );
}

export function UrlScanResults({
  result,
  precheck,
  loading,
  onCopyReport,
  onDownloadReport,
  reportBusy
}: UrlScanResultsProps) {
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures />;
  }

  return (
    <section className="grid grid-cols-12 gap-6">
      <ResultShell title={result.riskLabelDisplay} eyebrow={copy.result.riskSummary} className="col-span-12 md:col-span-5">
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
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.result.likelyPattern}</p>
            <p className="mt-2 text-lg font-semibold text-vellum">{result.likelyScamPattern}</p>
          </div>
          <p className="text-base leading-relaxed text-on-surface">{result.summary}</p>
        </div>
      </ResultShell>

      <ResultShell title="URL Metadata" eyebrow="Forensic Breakdown" className="col-span-12 md:col-span-7" delay={60}>
        <UrlMetadataCard precheck={precheck} />
      </ResultShell>

      <ResultShell title={copy.result.recommendedActions} eyebrow={copy.result.whatToDoNext} className="col-span-12 md:col-span-7" delay={120}>
        <RecommendedActionsCard actions={result.recommendedActions} />
      </ResultShell>

      <ResultShell title={copy.result.keyFindings} eyebrow={copy.result.patternScan} className="col-span-12 md:col-span-5" delay={180}>
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

      <ResultShell title={copy.result.reportActions} eyebrow={copy.result.forwardOrArchive} className="col-span-12" delay={420}>
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
    </section>
  );
}
