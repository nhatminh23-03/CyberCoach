"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ResultDiscoveryCta, useScanResultDiscovery } from "@/components/scan/ResultDiscovery";
import { ScanFooter } from "@/components/scan/ScanFooter";
import { ScanSidebar } from "@/components/scan/ScanSidebar";
import { UrlScanResults } from "@/components/scan/UrlScanResults";
import { UrlScanRightRail } from "@/components/scan/UrlScanRightRail";
import {
  adaptMessageScanResult,
  buildPlainTextReport,
  downloadBackendReport,
  executeUrlScan,
  fetchDetailedScanHistory,
  fetchUrlPrecheck,
  resolveSupportedLocale,
  type DetailedScanHistoryItem,
  type MessageScanResult,
  type SupportedLocale,
  type UrlPrecheck
} from "@/lib/scan";

type UrlScanPageProps = {
  initialQuery: string;
  initialAutoRun?: boolean;
};

const STORAGE_KEY = "cybercoach:url-scan-input";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "vi", label: "Vietnamese" },
  { value: "ko", label: "Korean" },
  { value: "tl", label: "Tagalog" },
  { value: "fr", label: "French" }
];

function WarningGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${active ? "text-[#ffb4ab]" : "text-outline"}`}>
      <path d="M12 4 21 20H3L12 4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export function UrlScanPage({ initialQuery, initialAutoRun = false }: UrlScanPageProps) {
  const [urlInput, setUrlInput] = useState(initialQuery);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [historyItems, setHistoryItems] = useState<DetailedScanHistoryItem[]>([]);
  const [precheck, setPrecheck] = useState<UrlPrecheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [precheckError, setPrecheckError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const autoRunRef = useRef<string | null>(null);
  const {
    resultsSectionRef,
    showSeeResultsCta,
    scrollToResults,
    resultSpotlightActive,
    traceHighlightKey
  } = useScanResultDiscovery({ result, loading });

  useEffect(() => {
    if (initialQuery || typeof window === "undefined") {
      return;
    }
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUrlInput(saved);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!initialAutoRun || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has("autorun") && !url.searchParams.has("source")) {
      return;
    }

    url.searchParams.delete("autorun");
    url.searchParams.delete("source");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialAutoRun]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const items = await fetchDetailedScanHistory(language);
      if (!cancelled) {
        setHistoryItems(items.filter((item) => item.scanType === "url"));
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setPrecheck(null);
      setPrecheckError(null);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const data = await fetchUrlPrecheck(trimmed);
        if (!cancelled) {
          setPrecheck(data);
          setPrecheckError(null);
        }
      } catch (precheckFetchError) {
        if (!cancelled) {
          setPrecheck(null);
          setPrecheckError(precheckFetchError instanceof Error ? precheckFetchError.message : "Unable to inspect this URL.");
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [urlInput]);

  const hasRaisedFlag = Boolean(precheck?.phishTankHit || precheck?.isRawIp || precheck?.isShortened);

  const metadataLine = useMemo(() => {
    if (!precheck) {
      return null;
    }

    const parts = [
      `Domain: ${precheck.domain}`,
      `TLD: ${precheck.tld}`,
      `Subdomains: ${precheck.subdomainCount}`
    ];

    if (precheck.isRawIp) {
      parts.push("Type: Raw IP address");
    }
    if (precheck.isShortened) {
      parts.push("Type: URL shortener");
    }

    return parts.join(" · ");
  }, [precheck]);

  const handleAnalyze = useCallback(async (overrideUrl?: string) => {
    const trimmed = (overrideUrl ?? urlInput).trim();
    if (!trimmed) {
      setError("Paste a suspicious URL before running analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, trimmed);
      }

      const payload = await executeUrlScan({
        url: trimmed,
        language,
        privacyMode
      });

      setResult(
        adaptMessageScanResult(payload, {
          locale: language,
          privacyMode
        })
      );
      const nextHistory = await fetchDetailedScanHistory(language);
      setHistoryItems(nextHistory.filter((item) => item.scanType === "url"));
      setStatusMessage("URL analysis complete. Metadata and result cards have been refreshed.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "URL scan failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [language, privacyMode, urlInput]);

  useEffect(() => {
    const trimmed = initialQuery.trim();
    if (!initialAutoRun || !trimmed || autoRunRef.current === trimmed) {
      return;
    }

    autoRunRef.current = trimmed;
    void handleAnalyze(trimmed);
  }, [handleAnalyze, initialAutoRun, initialQuery]);

  function handleRestoreHistory(item: DetailedScanHistoryItem) {
    const historyLocale = resolveSupportedLocale(item.raw.metadata?.language?.toString() ?? language);
    setLanguage(historyLocale);
    setUrlInput(item.raw.original_input);
    setResult(
      adaptMessageScanResult(item.raw, {
        locale: historyLocale,
        privacyMode: Boolean(item.raw.redacted_input || (item.raw.metadata?.redaction_count ?? 0))
      })
    );
    setStatusMessage("Restored a saved URL scan from the current session.");
  }

  async function handleCopyReport() {
    if (!result) {
      return;
    }

    try {
      setReportBusy("copy");
      await navigator.clipboard.writeText(buildPlainTextReport(result));
      setStatusMessage("Report copied to clipboard.");
    } catch {
      setStatusMessage("Clipboard access failed. Try the TXT download instead.");
    } finally {
      setReportBusy(null);
    }
  }

  async function handleDownloadReport(format: "txt" | "md") {
    if (!result) {
      return;
    }

    try {
      setReportBusy(format);
      await downloadBackendReport(result.raw, format);
      setStatusMessage(`Report download started (${format.toUpperCase()}).`);
    } catch {
      setStatusMessage("Report generation failed. Please try again.");
    } finally {
      setReportBusy(null);
    }
  }

  return (
    <>
      <Header active="Scans" />

      <main className="mx-auto grid max-w-[1440px] grid-cols-12 gap-6 px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:gap-8 lg:px-8 lg:pt-24 xl:gap-12">
        <ScanSidebar activeItem="url" />

        <div className="col-span-12 space-y-8 lg:space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Link Review
              </span>
            </div>

            <h1 className="max-w-3xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              URL <span className="text-secondary">SAFETY</span> CHECK.
            </h1>

            <p className="max-w-xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Check whether a link looks suspicious before you open it, including domain tricks, phishing-database matches, and risky destination behavior.
            </p>
          </section>

          <section className="space-y-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="group flex items-center justify-between border border-outline-variant/20 bg-surface-container-low p-6 transition-all hover:border-secondary/30">
                <div>
                  <span className="mb-1 block font-label text-[10px] uppercase tracking-widest text-on-primary-container">
                    Security Protocol
                  </span>
                  <span className="font-headline font-bold text-on-surface">Privacy Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacyMode((current) => !current)}
                  className="flex items-center space-x-3"
                  aria-pressed={privacyMode}
                >
                  <span className="font-label text-[10px] font-bold uppercase tracking-tight text-secondary">
                    {privacyMode ? "Active" : "Off"}
                  </span>
                  <span
                    className={`flex h-5 w-10 border border-secondary/60 px-0.5 transition-colors ${
                      privacyMode ? "bg-secondary" : "bg-surface-container-high"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 bg-on-secondary transition-transform duration-300 ${
                        privacyMode ? "translate-x-0" : "translate-x-5 bg-vellum"
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div className="group flex items-center justify-between border border-outline-variant/20 bg-surface-container-low p-6 transition-all hover:border-secondary/30">
                <div>
                  <span className="mb-1 block font-label text-[10px] uppercase tracking-widest text-on-primary-container">
                    Review Language
                  </span>
                  <span className="font-headline font-bold text-on-surface">Language</span>
                </div>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="appearance-none bg-transparent pr-6 font-label text-[10px] font-bold uppercase tracking-tight text-secondary outline-none"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-surface text-on-surface">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-secondary">▾</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
                Link To Check
              </label>

              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1 border-b border-outline-variant bg-surface-container-lowest px-4 py-4 transition-all focus-within:border-secondary sm:px-6 sm:py-5">
                  <input
                    value={urlInput}
                    onChange={(event) => setUrlInput(event.target.value)}
                    placeholder="https://example-suspicious-site.xyz/login"
                    className="w-full border-none bg-transparent pr-9 font-mono text-base text-on-surface placeholder:text-outline/40 focus:outline-none sm:text-lg"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2">
                    <WarningGlyph active={hasRaisedFlag} />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={loading}
                  className={`w-full bg-secondary px-6 py-4 font-label text-xs font-bold uppercase tracking-[0.24em] text-on-secondary transition-all hover:opacity-90 active:scale-95 sm:min-w-[180px] sm:w-auto sm:px-8 sm:py-5 ${
                    loading ? "animate-soft-pulse opacity-80" : ""
                  }`}
                >
                  {loading ? "Analyzing..." : "Analyze"}
                </button>
              </div>

              {metadataLine ? (
                <div className="ghost-border bg-surface-container-low p-5 text-sm leading-relaxed text-on-surface-variant">
                  {metadataLine}
                </div>
              ) : null}

              {precheck ? (
                <div
                  className={`ghost-border p-5 text-sm ${
                    precheck.phishTankHit
                      ? "border-[#ffb4ab]/30 bg-[#93000a]/15 text-[#ffdad6]"
                      : "border-secondary/20 bg-primary-container/25 text-primary"
                  }`}
                >
                  {precheck.phishTankLoaded ? (
                    precheck.phishTankHit ? (
                      "Confirmed phishing: this link appears in the PhishTank database of verified phishing sites. Do not open it."
                    ) : (
                      `Not found in PhishTank (${precheck.phishTankCount.toLocaleString()} known phishing links checked).`
                    )
                  ) : (
                    "The phishing database is not available in the backend right now."
                  )}
                </div>
              ) : null}

              <div className="ghost-border animate-fade-up flex items-center gap-3 bg-primary-container/25 px-5 py-4 text-sm leading-relaxed text-primary">
                <LockIcon className="h-4 w-4 shrink-0 text-secondary" />
                <span>
                  {privacyMode
                  ? "Nothing is stored by default. Privacy Mode redacts sensitive details for analysis and keeps raw text out of the returned result when possible."
                  : "Nothing is stored by default. This link is reviewed only for the current session."}
                </span>
              </div>

              {precheckError ? (
                <div className="ghost-border border-outline-variant/20 bg-surface-container-low p-5 text-sm text-on-surface-variant">
                  {precheckError}
                </div>
              ) : null}

              {error ? (
                <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm text-[#ffdad6]">{error}</div>
              ) : null}

              {statusMessage ? (
                <div className="ghost-border border-secondary/20 bg-primary-container/30 p-5 text-sm text-primary">{statusMessage}</div>
              ) : null}
            </div>
          </section>

          <div
            ref={resultsSectionRef}
            className={`scroll-mt-28 border border-transparent transition-all duration-500 ${
              resultSpotlightActive ? "scan-results-spotlight" : ""
            }`}
          >
            <UrlScanResults
              result={result}
              precheck={precheck}
              loading={loading}
              onCopyReport={handleCopyReport}
              onDownloadReport={handleDownloadReport}
              reportBusy={reportBusy}
              decisionHighlightKey={traceHighlightKey}
            />
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:space-y-8 xl:col-span-4 xl:self-start">
          <UrlScanRightRail
            result={result}
            loading={loading}
            onDownloadPrimaryReport={() => handleDownloadReport("txt")}
            historyItems={historyItems}
            onRestoreHistory={handleRestoreHistory}
          />
        </div>
      </main>

      {showSeeResultsCta && result ? (
        <ResultDiscoveryCta onClick={scrollToResults} />
      ) : null}

      <ScanFooter />
    </>
  );
}
