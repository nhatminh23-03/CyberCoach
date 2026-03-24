"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ScanFooter } from "@/components/scan/ScanFooter";
import { ScanSidebar } from "@/components/scan/ScanSidebar";
import { ScreenshotScanResults } from "@/components/scan/ScreenshotScanResults";
import { ScreenshotScanRightRail } from "@/components/scan/ScreenshotScanRightRail";
import {
  adaptMessageScanResult,
  buildPlainTextReport,
  downloadBackendReport,
  executeScreenshotScan,
  fetchDetailedScanHistory,
  fetchScanCapabilities,
  resolveSupportedLocale,
  type DetailedScanHistoryItem,
  type MessageScanResult,
  type ScanCapabilities,
  type SupportedLocale
} from "@/lib/scan";

const STORAGE_KEY = "cybercoach:screenshot-language";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "vi", label: "Vietnamese" },
  { value: "ko", label: "Korean" },
  { value: "tl", label: "Tagalog" },
  { value: "fr", label: "French" }
];

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
      <path d="M4 7h3l1.4-2h7.2L17 7h3v12H4Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function bytesLabel(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScreenshotScanPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [historyItems, setHistoryItems] = useState<DetailedScanHistoryItem[]>([]);
  const [capabilities, setCapabilities] = useState<ScanCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const savedLanguage = window.sessionStorage.getItem(STORAGE_KEY);
    if (savedLanguage) {
      setLanguage(resolveSupportedLocale(savedLanguage));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;

    async function loadDependencies() {
      const [nextCapabilities, nextHistory] = await Promise.all([
        fetchScanCapabilities(),
        fetchDetailedScanHistory(language)
      ]);

      if (!cancelled) {
        setCapabilities(nextCapabilities);
        setHistoryItems(nextHistory);
      }
    }

    void loadDependencies();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const analysisReady = Boolean(selectedFile && capabilities?.screenshotAnalysisAvailable);

  const fileMetadata = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return {
      name: selectedFile.name,
      size: bytesLabel(selectedFile.size),
      type: selectedFile.type || "image/png"
    };
  }, [selectedFile]);

  function acceptFile(file: File | null, source: "browse" | "camera" | "drop") {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for screenshot analysis.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStatusMessage(
      source === "camera"
        ? "Camera photo loaded for screenshot analysis."
        : source === "drop"
          ? "Screenshot dropped into the scan workspace."
          : "Screenshot loaded and ready for analysis."
    );
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setError("Upload a screenshot or take a photo before running analysis.");
      return;
    }

    if (!capabilities?.screenshotAnalysisAvailable) {
      setError("Screenshot analysis requires an Anthropic or OpenRouter API key.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Extracting visible text, checking scam patterns, and preparing guidance...");

    try {
      const payload = await executeScreenshotScan({
        file: selectedFile,
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
      setHistoryItems(nextHistory);
      setStatusMessage("Screenshot analysis complete. Result cards have been updated.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Screenshot scan failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setStatusMessage("Screenshot selection cleared.");
    if (browseInputRef.current) {
      browseInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
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

  function handleRestoreHistory(item: DetailedScanHistoryItem) {
    const historyLocale = resolveSupportedLocale(item.raw.metadata?.language?.toString() ?? language);
    setLanguage(historyLocale);
    setResult(
      adaptMessageScanResult(item.raw, {
        locale: historyLocale,
        privacyMode: Boolean(item.raw.redacted_input || (item.raw.metadata?.redaction_count ?? 0))
      })
    );
    setStatusMessage(`Restored ${item.scanType} result from the current session.`);
  }

  return (
    <>
      <Header active="Scans" />

      <main className="mx-auto grid max-w-[1440px] grid-cols-12 gap-8 px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8 xl:gap-12">
        <ScanSidebar activeItem="screenshot" />

        <div className="col-span-12 space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Vision Intercept Unit
              </span>
            </div>

            <h1 className="max-w-3xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              SCREENSHOT <span className="text-secondary">INTELLIGENCE</span> SCAN.
            </h1>

            <p className="max-w-xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Upload or capture a suspicious screen, extract the visible message content, and review preserved scam guidance in a private editorial workflow.
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
                    Vision Language
                  </span>
                  <span className="font-headline font-bold text-on-surface">Language</span>
                </div>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as SupportedLocale)}
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

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0] ?? null;
                acceptFile(file, "drop");
              }}
              className={`ghost-border relative overflow-hidden border border-dashed p-5 transition-all sm:p-6 lg:p-8 ${
                dragActive ? "border-secondary bg-primary-container/25" : "border-outline-variant/30 bg-surface-container-low"
              }`}
            >
              <input
                ref={browseInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0] ?? null, "browse")}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0] ?? null, "camera")}
              />

              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div>
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      Suspicious screen input
                    </p>
                    <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum sm:text-3xl">
                      Upload Screenshot, browse files, or take a photo.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                      Drag an image into the workspace or use one of the capture controls below. Image analysis follows the same OCR-plus-guidance flow as the original CyberCoach screenshot scan.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => browseInputRef.current?.click()} className="editorial-button px-5 py-3">
                      <span className="flex items-center gap-2">
                        <UploadIcon />
                        <span>Browse Files</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="editorial-button px-5 py-3">
                      <span className="flex items-center gap-2">
                        <CameraIcon />
                        <span>Take Photo</span>
                      </span>
                    </button>
                    {selectedFile ? (
                      <button type="button" onClick={handleClear} className="editorial-button px-5 py-3">
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {fileMetadata ? (
                    <div className="flex flex-wrap gap-3">
                      <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                        {fileMetadata.name}
                      </span>
                      <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                        {fileMetadata.size}
                      </span>
                      <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                        {fileMetadata.type}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="ghost-border min-h-[260px] overflow-hidden bg-surface-container-lowest/80">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Screenshot preview" className="h-full w-full object-cover animate-fade-up" />
                  ) : (
                    <div className="flex h-full min-h-[260px] items-center justify-center p-8 text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-secondary/30 bg-secondary/10 text-secondary">
                          <UploadIcon />
                        </div>
                        <p className="font-headline text-xl font-bold tracking-tight text-vellum">Preview panel</p>
                        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                          The selected screenshot or camera photo will appear here before analysis.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!capabilities?.screenshotAnalysisAvailable && selectedFile ? (
              <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm leading-relaxed text-[#ffdad6]">
                Screenshot analysis requires an Anthropic or OpenRouter API key. Add one to the project `.env` before running the vision scan.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!analysisReady || loading}
                className={`bg-secondary px-8 py-4 font-label text-xs font-bold uppercase tracking-[0.22em] text-on-secondary transition-all hover:opacity-90 active:scale-95 ${
                  !analysisReady || loading ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {loading ? "Analyzing..." : "Execute Scan"}
              </button>
            </div>

            <div className="ghost-border flex items-center gap-3 bg-primary-container/25 px-5 py-4 text-sm leading-relaxed text-primary">
              <LockIcon className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                {privacyMode
                  ? "Nothing is stored. Privacy Mode is active and visible personal details can be redacted before the final analysis."
                  : "Nothing is stored. Your screenshot is analyzed ephemerally during this session."}
              </span>
            </div>

            {error ? <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm text-[#ffdad6]">{error}</div> : null}
            {statusMessage ? <div className="ghost-border border-secondary/20 bg-primary-container/30 p-5 text-sm text-primary">{statusMessage}</div> : null}
          </section>

          <ScreenshotScanResults
            result={result}
            loading={loading}
            historyItems={historyItems}
            onCopyReport={handleCopyReport}
            onDownloadReport={handleDownloadReport}
            onRestoreHistory={handleRestoreHistory}
            reportBusy={reportBusy}
          />
        </div>

        <div className="col-span-12 space-y-8 xl:col-span-4 xl:self-start">
          <ScreenshotScanRightRail
            hasPreview={Boolean(previewUrl)}
            loading={loading}
            capabilities={capabilities}
            statusMessage={statusMessage}
          />
        </div>
      </main>

      <ScanFooter />
    </>
  );
}
