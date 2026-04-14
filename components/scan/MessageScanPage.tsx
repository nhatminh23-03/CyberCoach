"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ScanFooter } from "@/components/scan/ScanFooter";
import { ResultDiscoveryCta, useScanResultDiscovery } from "@/components/scan/ResultDiscovery";
import { ScanResults } from "@/components/scan/ScanResults";
import { ScanRightRail } from "@/components/scan/ScanRightRail";
import { ScanSidebar } from "@/components/scan/ScanSidebar";
import { ScanSupportPanels } from "@/components/scan/ScanSupportPanels";
import {
  adaptMessageScanResult,
  buildPlainTextReport,
  downloadBackendReport,
  executeMessageScan,
  fetchIntelFeed,
  fetchScanHistory,
  fetchMessageSamples,
  type IntelFeedItem,
  type MessageSample,
  type MessageScanResult,
  type ScanHistoryItem,
  type SupportedLocale
} from "@/lib/scan";

type MessageScanPageProps = {
  initialQuery: string;
  initialView: string;
  initialAutoRun?: boolean;
};

const STORAGE_KEY = "cybercoach:quick-scan-input";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "vi", label: "Vietnamese" },
  { value: "ko", label: "Korean" },
  { value: "tl", label: "Tagalog" },
  { value: "fr", label: "French" }
];

const recentComingSoon = {
  url: "URL Scan is staged next. Message Scan remains active for now.",
  screenshot: "Screenshot Scan is staged next. Message Scan remains active for now.",
  ar: "AR Scanner is not live yet. Message Scan remains the active intelligence module.",
  document: "Document Scan is coming soon. Message Scan remains the active intelligence module."
} as const;

export function MessageScanPage({ initialQuery, initialView, initialAutoRun = false }: MessageScanPageProps) {
  const [message, setMessage] = useState(initialQuery);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<MessageSample[]>([]);
  const [randomRealPhish, setRandomRealPhish] = useState<MessageSample | null>(null);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([]);
  const [intelFeedItems, setIntelFeedItems] = useState<IntelFeedItem[]>([]);
  const autoRunRef = useRef<string | null>(null);
  const {
    resultsSectionRef,
    showSeeResultsCta,
    scrollToResults,
    resultSpotlightActive,
    traceHighlightKey
  } = useScanResultDiscovery({ result, loading });

  useEffect(() => {
    if (initialQuery) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setMessage(saved);
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

    async function loadSamples() {
      setSamplesLoading(true);
      try {
        const data = await fetchMessageSamples();
        if (!cancelled) {
          setSamples(data.presets);
          setRandomRealPhish(data.random_real_phish);
        }
      } finally {
        if (!cancelled) {
          setSamplesLoading(false);
        }
      }
    }

    void loadSamples();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const items = await fetchScanHistory(language);
      if (!cancelled) {
        setHistoryItems(items);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntelFeed() {
      const items = await fetchIntelFeed();
      if (!cancelled) {
        setIntelFeedItems(items);
      }
    }

    void loadIntelFeed();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewNotice = useMemo(() => {
    if (initialView && initialView in recentComingSoon) {
      return recentComingSoon[initialView as keyof typeof recentComingSoon];
    }
    return null;
  }, [initialView]);

  const characterCount = message.length;

  function applySample(sample: MessageSample) {
    setMessage(sample.text);
    setActiveSampleId(sample.id);
    setError(null);
    setStatusMessage(`${sample.label} loaded into the message input.`);
  }

  async function handleRefreshRandomSample() {
    setSamplesLoading(true);
    try {
      const data = await fetchMessageSamples();
      if (data.random_real_phish) {
        setRandomRealPhish(data.random_real_phish);
        setMessage(data.random_real_phish.text);
        setActiveSampleId(data.random_real_phish.id);
        setStatusMessage("Random real phish sample loaded from the existing dataset.");
      } else {
        setStatusMessage("Random real phish is unavailable because the phishing dataset is not loaded.");
      }
    } finally {
      setSamplesLoading(false);
    }
  }

  const handleExecuteScan = useCallback(async (overrideMessage?: string) => {
    const trimmed = (overrideMessage ?? message).trim();
    if (!trimmed) {
      setError("Paste a suspicious message before executing a scan.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, trimmed);
      }

      const payload = await executeMessageScan({
        text: trimmed,
        language,
        privacyMode
      });

      setResult(
        adaptMessageScanResult(payload, {
          locale: language,
          privacyMode
        })
      );
      const [nextHistory, nextIntel] = await Promise.all([fetchScanHistory(language), fetchIntelFeed()]);
      setHistoryItems(nextHistory);
      setIntelFeedItems(nextIntel);
      setStatusMessage("Analysis complete. Result cards updated with the latest scan.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Message scan failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [language, message, privacyMode]);

  useEffect(() => {
    const trimmed = initialQuery.trim();
    if (!initialAutoRun || !trimmed || autoRunRef.current === trimmed) {
      return;
    }

    autoRunRef.current = trimmed;
    void handleExecuteScan(trimmed);
  }, [handleExecuteScan, initialAutoRun, initialQuery]);

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
        <ScanSidebar activeItem="message" />

        <div className="col-span-12 space-y-8 lg:space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Message Review
              </span>
            </div>

            <h1 className="max-w-2xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              MESSAGE <span className="text-secondary">SAFETY</span> CHECK.
            </h1>

            <p className="max-w-xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Paste a suspicious message to check for pressure, impersonation, risky links, and other signs that it may not be trustworthy.
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

            <div className="group relative">
              <label className="mb-4 block font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
                Message To Review
              </label>

              <div className="relative border-l-2 border-secondary bg-surface-container-lowest p-5 transition-all focus-within:bg-surface-container sm:p-6 lg:p-8">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Paste a suspicious text, email, or chat message here"
                  className="min-h-[220px] w-full resize-none border-none bg-transparent pr-0 text-lg text-on-surface placeholder:text-outline/40 focus:outline-none sm:min-h-[240px] sm:text-xl md:pr-48"
                />

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:absolute md:bottom-6 md:right-6 md:mt-0 md:justify-end md:gap-4">
                  <div className="border border-outline-variant px-3 py-1 font-label text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Chars: {characterCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExecuteScan()}
                    disabled={loading}
                    className={`bg-secondary px-8 py-3 font-label text-xs font-bold uppercase tracking-widest text-on-secondary transition-all hover:opacity-90 active:scale-95 ${
                      loading ? "animate-soft-pulse opacity-80" : ""
                    }`}
                  >
                    {loading ? "Checking..." : "Check Message"}
                  </button>
                </div>
              </div>
            </div>

            <div className="ghost-border animate-fade-up flex items-center gap-3 bg-primary-container/25 px-5 py-4 text-sm leading-relaxed text-primary">
              <LockIcon className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                {privacyMode
                  ? "Nothing is stored by default. Privacy Mode can redact sensitive details before the final review."
                  : "Nothing is stored by default. This message is reviewed only for the current session."}
              </span>
            </div>

            {error ? (
              <div className="ghost-border animate-fade-up border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm text-[#ffdad6]">
                {error}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="ghost-border animate-fade-up border-secondary/20 bg-primary-container/30 p-5 text-sm text-primary">
                {statusMessage}
              </div>
            ) : null}
          </section>

          <div
            ref={resultsSectionRef}
            className={`scroll-mt-28 border border-transparent transition-all duration-500 ${
              resultSpotlightActive ? "scan-results-spotlight" : ""
            }`}
          >
            <ScanResults
              result={result}
              loading={loading}
              onCopyReport={handleCopyReport}
              onDownloadReport={handleDownloadReport}
              reportBusy={reportBusy}
              notice={viewNotice}
              decisionHighlightKey={traceHighlightKey}
            />
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:space-y-8 xl:col-span-4 xl:self-start">
          <ScanSupportPanels
            samples={samples}
            randomRealPhish={randomRealPhish}
            activeSampleId={activeSampleId}
            privacyMode={privacyMode}
            onSelectSample={applySample}
            onRefreshRandom={handleRefreshRandomSample}
            samplesLoading={samplesLoading}
          />
          <ScanRightRail
            historyItems={historyItems}
            intelFeedItems={intelFeedItems}
            locale={language as SupportedLocale}
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
