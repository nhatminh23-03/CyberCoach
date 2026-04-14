"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ResultDiscoveryCta, useScanResultDiscovery } from "@/components/scan/ResultDiscovery";
import { ScanFooter } from "@/components/scan/ScanFooter";
import { ScanResults } from "@/components/scan/ScanResults";
import { ScanRightRail } from "@/components/scan/ScanRightRail";
import { ScanSidebar } from "@/components/scan/ScanSidebar";
import {
  adaptMessageScanResult,
  buildPlainTextReport,
  downloadBackendReport,
  executeDocumentScan,
  fetchIntelFeed,
  fetchScanHistory,
  type IntelFeedItem,
  type MessageScanResult,
  type ScanHistoryItem,
  type SupportedLocale
} from "@/lib/scan";

const STORAGE_KEY = "cybercoach:document-language";
const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/vnd.ms-excel.sheet.macroEnabled.12"
]);
const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".docm", ".xlsm"];

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

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
      <path d="M7 3.5h7l4 4V20.5H7Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13.5h5" />
      <path d="M9.5 17h5" />
    </svg>
  );
}

function XrayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path d="M5 4.5h14v15H5Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
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

function isSupportedDocument(file: File) {
  const normalizedName = file.name.toLowerCase();
  return (
    ACCEPTED_DOCUMENT_TYPES.has(file.type) ||
    ACCEPTED_DOCUMENT_EXTENSIONS.some((extension) => normalizedName.endsWith(extension))
  );
}

export function DocumentScanPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([]);
  const [intelFeedItems, setIntelFeedItems] = useState<IntelFeedItem[]>([]);
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const {
    resultsSectionRef,
    showSeeResultsCta,
    scrollToResults,
    resultSpotlightActive,
    traceHighlightKey
  } = useScanResultDiscovery({ result, loading });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const savedLanguage = window.sessionStorage.getItem(STORAGE_KEY);
    if (!savedLanguage) {
      return;
    }
    const matched = languageOptions.find((option) => option.value === savedLanguage)?.value;
    if (matched) {
      setLanguage(matched as SupportedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

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

  const fileMetadata = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    const extension = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop()?.toUpperCase() ?? "FILE" : "FILE";
    return {
      name: selectedFile.name,
      size: bytesLabel(selectedFile.size),
      sizeRaw: selectedFile.size,
      type: extension,
      mediaType: selectedFile.type || "application/octet-stream"
    };
  }, [selectedFile]);

  function acceptFile(file: File | null, source: "browse" | "drop") {
    if (!file) {
      return;
    }

    if (!isSupportedDocument(file)) {
      setError("Please upload a PDF, DOCX, DOCM, or XLSM file for document phishing analysis.");
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setError(null);
    setStatusMessage(
      source === "drop"
        ? "Document dropped into the x-ray workspace and ready for phishing analysis."
        : "Document loaded. CyberCoach is ready to inspect links, fake actions, and risky language."
    );
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setError("Upload a suspicious PDF, DOCX, DOCM, or XLSM file before running analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Extracting document text, auditing embedded actions, and preparing plain-language guidance...");

    try {
      const payload = await executeDocumentScan({
        file: selectedFile,
        language,
        privacyMode
      });

      const adapted = adaptMessageScanResult(payload, {
        locale: language,
        privacyMode
      });
      setResult(adapted);

      const [nextHistory, nextIntel] = await Promise.all([fetchScanHistory(language), fetchIntelFeed()]);
      setHistoryItems(nextHistory);
      setIntelFeedItems(nextIntel);

      if (adapted.documentAnalysis?.protected) {
        setStatusMessage("Document analysis completed with limits. The file appears protected, so CyberCoach returned the safest guidance it could.");
      } else if (adapted.documentAnalysis?.macroEnabled) {
        setStatusMessage(
          "Document analysis completed with limited macro-aware inspection. CyberCoach reviewed visible text and destinations, but it did not execute macros."
        );
      } else if (adapted.documentAnalysis?.ocrFallbackUsed) {
        setStatusMessage(
          `Document analysis complete. CyberCoach used OCR fallback on ${adapted.documentAnalysis.ocrPagesAnalyzed} rendered page${adapted.documentAnalysis.ocrPagesAnalyzed === 1 ? "" : "s"} to deepen the x-ray.`
        );
      } else if (adapted.documentAnalysis?.imageBased) {
        setStatusMessage("Document analysis completed with partial coverage. This file looks image-based, so some text may need a follow-up screenshot scan.");
      } else if (adapted.documentAnalysis?.limitations.length) {
        setStatusMessage("Document analysis completed. CyberCoach also noted a few inspection limits in the technical evidence section.");
      } else {
        setStatusMessage("Document analysis complete. The x-ray findings, risk summary, and next-step guidance have been refreshed.");
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Document scan failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setStatusMessage("Document selection cleared.");
    if (browseInputRef.current) {
      browseInputRef.current.value = "";
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
      setStatusMessage("Clipboard access failed. Try the TXT or MD download instead.");
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
        <ScanSidebar activeItem="document" />

        <div className="col-span-12 space-y-8 lg:space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Document Review
              </span>
            </div>

            <h1 className="max-w-3xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              DOCUMENT <span className="text-secondary">SAFETY</span> CHECK.
            </h1>

            <p className="max-w-2xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Upload a suspicious file to check for deceptive buttons, phishing links, login prompts, invoice pressure, QR traps, and brand impersonation in one clear review.
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
                acceptFile(event.dataTransfer.files?.[0] ?? null, "drop");
              }}
              className={`ghost-border relative overflow-hidden border border-dashed p-5 transition-all sm:p-6 lg:p-8 ${
                dragActive ? "border-secondary bg-primary-container/25" : "border-outline-variant/30 bg-surface-container-low"
              }`}
            >
              <input
                ref={browseInputRef}
                type="file"
                accept=".pdf,.docx,.docm,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-word.document.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0] ?? null, "browse")}
              />

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
                <div className="min-w-0 space-y-6">
                  <div>
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      Suspicious file review
                    </p>
                    <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum sm:text-3xl">
                      Upload a document for a closer look.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                      CyberCoach reviews visible text, embedded links, fake action prompts, payment pressure, credential requests, QR payloads, and macro-related warning signs without turning this into a technical lab.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => browseInputRef.current?.click()} className="editorial-button px-5 py-3">
                      <span className="flex items-center gap-2">
                        <UploadIcon />
                        <span>Browse Files</span>
                      </span>
                    </button>
                    {selectedFile ? (
                      <button type="button" onClick={handleClear} className="editorial-button px-5 py-3">
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="ghost-border bg-surface-container-lowest/60 p-4">
                      <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">Accepted files</p>
                      <p className="mt-2 text-sm text-on-surface">PDF, DOCX, DOCM, and XLSM</p>
                    </div>
                    <div className="ghost-border bg-surface-container-lowest/60 p-4">
                      <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">Checks for</p>
                      <p className="mt-2 text-sm text-on-surface">Phishing links, QR traps, fake buttons, and macro risk</p>
                    </div>
                    <div className="ghost-border bg-surface-container-lowest/60 p-4 sm:col-span-2">
                      <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">You get</p>
                      <p className="mt-2 text-sm text-on-surface">A risk label, key findings, and safer next steps</p>
                    </div>
                  </div>

                  {fileMetadata ? (
                    <div className="flex flex-wrap gap-3">
                      <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                        {fileMetadata.name}
                      </span>
                      <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                        {fileMetadata.type}
                      </span>
                      <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                        {fileMetadata.size}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="ghost-border min-h-[320px] overflow-hidden bg-surface-container-lowest/80 xl:min-h-[360px]">
                  <div className="flex h-full min-h-[320px] flex-col">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4">
                      <div>
                        <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">Document X-Ray</p>
                        <p className="mt-1 text-xs text-on-surface-variant">A quick preview of what CyberCoach can inspect</p>
                      </div>
                      <XrayIcon />
                    </div>

                    <div className="flex-1 p-5">
                      {result?.documentAnalysis ? (
                        <div className="space-y-5 animate-fade-up">
                          <div className="grid gap-3 xl:grid-cols-2">
                            <div className="min-w-0 border border-outline-variant/20 bg-surface-container-low p-4">
                              <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-outline">File</p>
                              <p className="mt-2 text-sm font-semibold text-vellum break-words [overflow-wrap:anywhere]">
                                {result.documentAnalysis.fileName}
                              </p>
                            </div>
                            <div className="min-w-0 border border-outline-variant/20 bg-surface-container-low p-4">
                              <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-outline">Reader</p>
                              <p className="mt-2 text-sm font-semibold text-vellum">{result.documentAnalysis.parser}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                              {result.documentAnalysis.fileType}
                            </span>
                            <span className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                              {result.documentAnalysis.fileSizeDisplay}
                            </span>
                            {result.documentAnalysis.pageCount !== null ? (
                              <span className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                                {result.documentAnalysis.pageCount} Page{result.documentAnalysis.pageCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                            {result.documentAnalysis.protected ? (
                              <span className="border border-[#ffb4ab]/30 bg-[#93000a]/15 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-[#ffdad6]">
                                Protected
                              </span>
                            ) : null}
                            {result.documentAnalysis.imageBased ? (
                              <span className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                                Image-Based
                              </span>
                            ) : null}
                            {result.documentAnalysis.ocrFallbackUsed ? (
                              <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                                OCR Fallback
                              </span>
                            ) : null}
                            {result.documentAnalysis.macroEnabled ? (
                              <span className="border border-[#ffb4ab]/30 bg-[#93000a]/15 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-[#ffdad6]">
                                Macro-Enabled
                              </span>
                            ) : null}
                          </div>

                          <div className="ghost-border bg-primary-container/20 p-4">
                            <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">Text preview</p>
                            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                              {result.documentAnalysis.textPreview || "No extractable text preview was available for this document."}
                            </p>
                          </div>
                        </div>
                      ) : fileMetadata ? (
                        <div className="space-y-5 animate-fade-up">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-secondary/30 bg-secondary/10 text-secondary">
                            <DocumentIcon />
                          </div>
                          <div className="space-y-2 text-center">
                            <p className="font-headline text-xl font-bold tracking-tight text-vellum break-words [overflow-wrap:anywhere]">
                              {fileMetadata.name}
                            </p>
                            <p className="text-sm leading-relaxed text-on-surface-variant">
                              CyberCoach will inspect this file for deceptive links, fake buttons, urgency cues, credential requests, suspicious destinations, and macro-related warning signs when relevant.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="border border-outline-variant/20 bg-surface-container-low p-4 text-center">
                              <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-outline">Type</p>
                              <p className="mt-2 text-sm font-semibold text-vellum">{fileMetadata.type}</p>
                            </div>
                            <div className="border border-outline-variant/20 bg-surface-container-low p-4 text-center">
                              <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-outline">Size</p>
                              <p className="mt-2 text-sm font-semibold text-vellum">{fileMetadata.size}</p>
                            </div>
                            <div className="border border-outline-variant/20 bg-surface-container-low p-4 text-center">
                              <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-outline">Review</p>
                              <p className="mt-2 text-sm font-semibold text-vellum">Clear evidence view</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[240px] items-center justify-center p-8 text-center">
                          <div>
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-secondary/30 bg-secondary/10 text-secondary">
                              <DocumentIcon />
                            </div>
                            <p className="font-headline text-xl font-bold tracking-tight text-vellum">Awaiting attachment</p>
                            <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
                              The x-ray panel will summarize file details, extracted text, suspicious actions, and any inspection limits once a document is loaded.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!selectedFile || loading}
                className={`bg-secondary px-8 py-4 font-label text-xs font-bold uppercase tracking-[0.22em] text-on-secondary transition-all hover:opacity-90 active:scale-95 ${
                  !selectedFile || loading ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {loading ? "Checking..." : "Check Document"}
              </button>
            </div>

            <div className="ghost-border flex items-center gap-3 bg-primary-container/25 px-5 py-4 text-sm leading-relaxed text-primary">
              <LockIcon className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                {privacyMode
                  ? "Nothing is stored by default. Privacy Mode can redact sensitive details before the final review."
                  : "Nothing is stored by default. This document is reviewed only for the current session."}
              </span>
            </div>

            {error ? <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm text-[#ffdad6]">{error}</div> : null}
            {statusMessage ? <div className="ghost-border border-secondary/20 bg-primary-container/30 p-5 text-sm text-primary">{statusMessage}</div> : null}
          </section>

          <div
            ref={resultsSectionRef}
            className={`scroll-mt-28 border border-transparent transition-all duration-500 ${
              resultSpotlightActive ? "scan-results-spotlight" : ""
            }`}
          >
            {loading || result ? (
              <ScanResults
                result={result}
                loading={loading}
                onCopyReport={handleCopyReport}
                onDownloadReport={handleDownloadReport}
                reportBusy={reportBusy}
                notice={null}
                decisionHighlightKey={traceHighlightKey}
              />
            ) : null}
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:space-y-8 xl:col-span-4 xl:self-start">
          <ScanRightRail historyItems={historyItems} intelFeedItems={intelFeedItems} locale={language} />
        </div>
      </main>

      {showSeeResultsCta && result ? (
        <ResultDiscoveryCta onClick={scrollToResults} />
      ) : null}

      <ScanFooter />
    </>
  );
}
