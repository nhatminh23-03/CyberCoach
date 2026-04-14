"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ResultDiscoveryCta, useScanResultDiscovery } from "@/components/scan/ResultDiscovery";
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

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

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

async function detectQrPayloads(file: File): Promise<string[]> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") {
    return [];
  }

  const detectorClass = (window as Window & typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!detectorClass) {
    return detectQrPayloadsWithJsqr(file);
  }

  let imageBitmap: ImageBitmap | null = null;
  try {
    imageBitmap = await createImageBitmap(file);
    const detector = new detectorClass({ formats: ["qr_code"] });
    const results = await detector.detect(imageBitmap);
    const decoded = results
      .map((entry) => entry.rawValue?.trim() ?? "")
      .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
    if (decoded.length > 0) {
      return decoded;
    }
    return detectQrPayloadsWithJsqr(file);
  } catch {
    return detectQrPayloadsWithJsqr(file);
  } finally {
    imageBitmap?.close();
  }
}

async function detectQrPayloadsWithJsqr(file: File): Promise<string[]> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return [];
  }

  let imageBitmap: ImageBitmap | null = null;
  try {
    imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return [];
    }

    context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { default: jsQR } = await import("jsqr");
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth"
    });
    return decoded?.data ? [decoded.data.trim()].filter(Boolean) : [];
  } catch {
    return [];
  } finally {
    imageBitmap?.close();
  }
}

export function ScreenshotScanPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rescanBusy, setRescanBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [historyItems, setHistoryItems] = useState<DetailedScanHistoryItem[]>([]);
  const [capabilities, setCapabilities] = useState<ScanCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const {
    resultsSectionRef,
    showSeeResultsCta,
    scrollToResults,
    resultSpotlightActive,
    traceHighlightKey
  } = useScanResultDiscovery({ result, loading: loading || rescanBusy });

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
    if (!cameraOpen || !cameraStream || !cameraVideoRef.current) {
      return;
    }

    cameraVideoRef.current.srcObject = cameraStream;
    void cameraVideoRef.current.play().catch(() => {
      // The user can still manually start playback if the browser blocks autoplay.
    });

    return () => {
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
      }
    };
  }, [cameraOpen, cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    let cancelled = false;

    async function loadDependencies() {
      const [nextCapabilities, nextHistory] = await Promise.all([
        fetchScanCapabilities(),
        fetchDetailedScanHistory(language)
      ]);

      if (!cancelled) {
        setCapabilities(nextCapabilities);
        setHistoryItems(nextHistory.filter((item) => item.scanType === "screenshot"));
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

  function stopCameraStream() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function handleOpenCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      stopCameraStream();
      setCameraStream(stream);
      setCameraOpen(true);
      setStatusMessage("Camera ready. Frame the suspicious screen and capture once the text is sharp.");
    } catch (cameraError) {
      const reason =
        cameraError instanceof DOMException && cameraError.name === "NotAllowedError"
          ? "Camera permission was denied. Allow browser camera access or use Browse Files instead."
          : cameraError instanceof DOMException && cameraError.name === "NotFoundError"
            ? "No camera was found on this device. Use Browse Files instead."
            : "Unable to access the browser camera. Use Browse Files instead.";
      setError(reason);
      setCameraOpen(false);
      setCameraStream(null);
    }
  }

  async function handleCapturePhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is still warming up. Wait a moment and try the capture again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture the current camera frame.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Unable to convert the captured frame into an image.");
      return;
    }

    const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopCameraStream();
    acceptFile(file, "camera");
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
      const qrPayloads = await detectQrPayloads(selectedFile);
      const payload = await executeScreenshotScan({
        file: selectedFile,
        language,
        privacyMode,
        qrPayloads,
      });

      setResult(
        adaptMessageScanResult(payload, {
          locale: language,
          privacyMode
        })
      );

      const nextHistory = await fetchDetailedScanHistory(language);
      setHistoryItems(nextHistory.filter((item) => item.scanType === "screenshot"));
      setStatusMessage(
        qrPayloads.length
          ? `Screenshot analysis complete. ${qrPayloads.length} QR payload${qrPayloads.length === 1 ? "" : "s"} were decoded and inspected.`
          : "Screenshot analysis complete. Result cards have been updated."
      );
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Screenshot scan failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRescanEditedText(editedText: string) {
    if (!selectedFile) {
      setError("Keep the screenshot selected before re-running analysis with edited text.");
      return;
    }

    if (!editedText.trim()) {
      setError("Add some extracted text before running a manual OCR rescan.");
      return;
    }

    setRescanBusy(true);
    setError(null);
    setStatusMessage("Re-running screenshot analysis with your edited OCR text and existing QR context...");

    try {
      const qrPayloads = result?.screenshotOcr?.qrPayloads?.length ? result.screenshotOcr.qrPayloads : await detectQrPayloads(selectedFile);
      const payload = await executeScreenshotScan({
        file: selectedFile,
        language,
        privacyMode,
        qrPayloads,
        ocrOverrideText: editedText,
      });

      setResult(
        adaptMessageScanResult(payload, {
          locale: language,
          privacyMode
        })
      );

      const nextHistory = await fetchDetailedScanHistory(language);
      setHistoryItems(nextHistory.filter((item) => item.scanType === "screenshot"));
      setStatusMessage("Screenshot analysis refreshed using the edited OCR text.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Screenshot rescan failed.");
    } finally {
      setRescanBusy(false);
    }
  }

  function handleClear() {
    stopCameraStream();
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

      <main className="mx-auto grid max-w-[1440px] grid-cols-12 gap-6 px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:gap-8 lg:px-8 lg:pt-24 xl:gap-12">
        <ScanSidebar activeItem="screenshot" />

        <div className="col-span-12 space-y-8 lg:space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Screenshot Review
              </span>
            </div>

            <h1 className="max-w-3xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              SCREENSHOT <span className="text-secondary">SAFETY</span> CHECK.
            </h1>

            <p className="max-w-xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Upload or capture a suspicious screen so CyberCoach can read what is visible and explain what looks risky in plain language.
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
                      Screenshot input
                    </p>
                    <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum sm:text-3xl">
                      Upload a screenshot or take a photo.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                      Drag an image here, browse for a saved screenshot, or use your camera. CyberCoach will read the visible text and review the screenshot as evidence.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => browseInputRef.current?.click()} className="editorial-button px-5 py-3">
                      <span className="flex items-center gap-2">
                        <UploadIcon />
                        <span>Browse Files</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => void handleOpenCamera()} className="editorial-button px-5 py-3">
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
                  {cameraOpen ? (
                    <div className="flex h-full min-h-[260px] flex-col">
                      <video ref={cameraVideoRef} autoPlay playsInline muted className="h-full min-h-[220px] w-full object-cover animate-fade-up" />
                      <div className="flex flex-wrap gap-3 border-t border-outline-variant/20 bg-surface-container-low px-4 py-4">
                        <button type="button" onClick={() => void handleCapturePhoto()} className="editorial-button px-5 py-3">
                          Capture Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopCameraStream();
                            setStatusMessage("Camera capture cancelled.");
                          }}
                          className="editorial-button px-5 py-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Screenshot preview" className="h-full w-full object-cover animate-fade-up" />
                  ) : (
                    <div className="flex h-full min-h-[260px] items-center justify-center p-8 text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-secondary/30 bg-secondary/10 text-secondary">
                          <UploadIcon />
                        </div>
                        <p className="font-headline text-xl font-bold tracking-tight text-vellum">Preview panel</p>
                        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                          Your screenshot or camera photo will appear here before review.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!capabilities?.screenshotAnalysisAvailable && selectedFile ? (
              <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm leading-relaxed text-[#ffdad6]">
                Screenshot analysis needs an Anthropic or OpenRouter API key. Add one to the project `.env` before running this review.
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
                {loading ? "Checking..." : "Check Screenshot"}
              </button>
            </div>

            <div className="ghost-border flex items-center gap-3 bg-primary-container/25 px-5 py-4 text-sm leading-relaxed text-primary">
              <LockIcon className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                {privacyMode
                  ? "Nothing is stored by default. Privacy Mode can redact visible personal details before the final review."
                  : "Nothing is stored by default. This screenshot is reviewed only for the current session."}
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
            <ScreenshotScanResults
              result={result}
              loading={loading}
              onCopyReport={handleCopyReport}
              onDownloadReport={handleDownloadReport}
              onRescanEditedText={handleRescanEditedText}
              reportBusy={reportBusy}
              rescanBusy={rescanBusy}
              rescanAvailable={Boolean(selectedFile)}
              decisionHighlightKey={traceHighlightKey}
            />
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:space-y-8 xl:col-span-4 xl:self-start">
          <ScreenshotScanRightRail
            hasPreview={Boolean(previewUrl)}
            loading={loading}
            capabilities={capabilities}
            statusMessage={statusMessage}
            historyItems={historyItems}
            locale={language}
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
