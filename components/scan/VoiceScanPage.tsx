"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { PhoneCallIcon } from "@/components/home/icons";
import { Header } from "@/components/home/Header";
import { ScanFooter } from "@/components/scan/ScanFooter";
import { ScanResults } from "@/components/scan/ScanResults";
import { ScanSidebar } from "@/components/scan/ScanSidebar";
import { VoiceScanRightRail } from "@/components/scan/VoiceScanRightRail";
import {
  adaptMessageScanResult,
  buildPlainTextReport,
  downloadBackendReport,
  executeVoiceRecordingScan,
  executeVoiceSessionFinalize,
  executeVoiceSessionStart,
  executeVoiceSessionUpdate,
  fetchDetailedScanHistory,
  getVoiceRealtimeSocketUrl,
  resolveSupportedLocale,
  type BackendScanResponse,
  type DetailedScanHistoryItem,
  type MessageScanResult,
  type SupportedLocale,
  type VoiceSignalInput,
  type VoiceTranscriptSegmentInput
} from "@/lib/scan";

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type VoiceSocketMessage =
  | {
      type: "ready" | "pong";
      request_id?: string;
    }
  | {
      type: "analysis";
      state: "live" | "final";
      request_id?: string;
      result: BackendScanResponse;
    }
  | {
      type: "error";
      detail: string;
      request_id?: string;
    };

const languageOptions: Array<{ value: SupportedLocale; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "vi", label: "Vietnamese" },
  { value: "ko", label: "Korean" },
  { value: "tl", label: "Tagalog" },
  { value: "fr", label: "French" }
];

const speechLocaleMap: Record<SupportedLocale, string> = {
  en: "en-US",
  es: "es-ES",
  zh: "zh-CN",
  vi: "vi-VN",
  ko: "ko-KR",
  tl: "fil-PH",
  fr: "fr-FR"
};

const LIVE_UPDATE_DEBOUNCE_MS = 650;

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mergeVoiceSignals(current: VoiceSignalInput[], additions: VoiceSignalInput[]) {
  const next: VoiceSignalInput[] = [];
  const seen = new Set<string>();

  [...current, ...additions].forEach((signal) => {
    const type = signal.type.trim();
    const detail = signal.detail.trim();
    const severity = signal.severity;
    if (!type || !detail) {
      return;
    }
    const key = `${type}:${detail}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    next.push({ type, detail, severity });
  });

  return next.slice(0, 8);
}

function sameVoiceSignals(left: VoiceSignalInput[], right: VoiceSignalInput[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((signal, index) => {
    const candidate = right[index];
    return (
      candidate?.type === signal.type &&
      candidate?.detail === signal.detail &&
      candidate?.severity === signal.severity
    );
  });
}

function MicrophoneMeter({ level }: { level: number }) {
  const bars = Array.from({ length: 18 }, (_, index) => index);
  const activeBars = Math.max(1, Math.round(level * bars.length));

  return (
    <div className="flex h-16 items-end gap-1">
      {bars.map((bar) => (
        <span
          key={bar}
          className={`w-2 transition-all duration-150 ${bar < activeBars ? "bg-secondary" : "bg-surface-container-highest"}`}
          style={{ height: `${18 + ((bar % 6) + 1) * 7}px`, opacity: bar < activeBars ? 1 : 0.45 }}
        />
      ))}
    </div>
  );
}

function VoicePendingState({ mode }: { mode: "live" | "upload" }) {
  const eyebrow = mode === "upload" ? "Analyzing Recording" : "Live Risk Summary";
  const title = mode === "upload" ? "Call review is loading" : "Call Guard is warming up";
  const copy =
    mode === "upload"
      ? "CyberCoach is transcribing the recording, checking scam pressure, and preparing a plain-language result."
      : "CyberCoach is collecting transcript, checking live warning signals, and preparing the first call guidance cards.";

  return (
    <section className="ghost-border animate-fade-up bg-surface-container-low p-8">
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl font-bold text-vellum">{title}</h3>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{copy}</p>

      <div className="mt-8 grid grid-cols-12 gap-6">
        <div className="loading-sheen ghost-border col-span-12 bg-surface-container-lowest/60 p-6 md:col-span-7">
          <div className="h-3 w-32 bg-surface-container-highest" />
          <div className="mt-5 h-8 w-3/4 bg-surface-container-highest" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-full bg-surface-container-highest" />
            <div className="h-3 w-5/6 bg-surface-container-highest" />
            <div className="h-3 w-2/3 bg-surface-container-highest" />
          </div>
        </div>
        <div className="loading-sheen ghost-border col-span-12 bg-surface-container-lowest/60 p-6 md:col-span-5">
          <div className="h-3 w-28 bg-surface-container-highest" />
          <div className="mt-5 h-16 w-2/3 bg-surface-container-highest" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-full bg-surface-container-highest" />
            <div className="h-3 w-4/5 bg-surface-container-highest" />
          </div>
        </div>
      </div>
    </section>
  );
}

function buildVoiceResultAttentionSignature(result: MessageScanResult) {
  const voice = result.voiceAnalysis;
  return [
    result.riskLabel,
    result.riskScore,
    result.likelyScamPattern,
    voice?.analysisState ?? ""
  ].join("::");
}

function buildVoiceTraceAttentionSignature(result: MessageScanResult) {
  const voice = result.voiceAnalysis;
  if (!voice) {
    return "";
  }

  return [
    voice.liveAiState,
    voice.liveAiLastUpdatedAt ?? "",
    voice.liveAiSummary,
    voice.liveAiReasons.join("|"),
    voice.liveAiConfidence ?? "",
    voice.liveAiAction ?? "",
    result.modelRuns.length,
    voice.analysisState
  ].join("::");
}

function isElementBelowFold(node: HTMLElement | null) {
  if (typeof window === "undefined" || !node) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  return rect.top > window.innerHeight - 120;
}

function getVoiceAiReviewCopy(result: MessageScanResult | null) {
  const voice = result?.voiceAnalysis;
  const state = voice?.liveAiState ?? "heuristics_live_only";

  if (state === "ai_live_pending") {
    return {
      title: "AI review is warming up",
      summary:
        voice?.liveAiSummary ||
        "CyberCoach is gathering enough transcript before it starts a live AI review."
    };
  }

  if (state === "ai_live_active") {
    return {
      title: "Live AI review",
      summary:
        voice?.liveAiSummary ||
        "CyberCoach is running a rolling AI review on the transcript while the call continues."
    };
  }

  if (state === "ai_live_unavailable") {
    return {
      title: "AI review unavailable",
      summary:
        voice?.liveAiSummary ||
        "Live AI review is unavailable for this session, so CyberCoach is using transcript heuristics for the live warnings."
    };
  }

  if (state === "final_ai_reviewed") {
    return {
      title: "Final AI review",
      summary:
        voice?.liveAiSummary ||
        "CyberCoach completed a final AI review after the call ended."
    };
  }

  return {
    title: "Live local review",
    summary:
      voice?.liveAiSummary ||
      "Live AI review is off for this session, so CyberCoach is using transcript heuristics for low-latency warnings."
  };
}

export function VoiceScanPage() {
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<"live" | "upload">("live");
  const [browserSupported, setBrowserSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [transportMode, setTransportMode] = useState<"websocket" | "http" | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<VoiceTranscriptSegmentInput[]>([]);
  const [voiceSignals, setVoiceSignals] = useState<VoiceSignalInput[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [currentRms, setCurrentRms] = useState(0);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [lastSpeechDetectedAt, setLastSpeechDetectedAt] = useState<number | null>(null);
  const [lastTranscriptActivityAt, setLastTranscriptActivityAt] = useState<number | null>(null);
  const [calibrationState, setCalibrationState] = useState<"idle" | "calibrating" | "ready">("idle");
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [ambientFloor, setAmbientFloor] = useState(0.012);
  const [speechThreshold, setSpeechThreshold] = useState(0.018);
  const [result, setResult] = useState<MessageScanResult | null>(null);
  const [historyItems, setHistoryItems] = useState<DetailedScanHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState<"copy" | "txt" | "md" | null>(null);
  const [voiceRecordingFile, setVoiceRecordingFile] = useState<File | null>(null);
  const [voiceRecordingTranscriptOverride, setVoiceRecordingTranscriptOverride] = useState("");
  const [showSeeResultsCta, setShowSeeResultsCta] = useState(false);
  const [resultsSectionInView, setResultsSectionInView] = useState(false);
  const [resultHighlightKey, setResultHighlightKey] = useState(0);
  const [resultSpotlightActive, setResultSpotlightActive] = useState(false);
  const [traceHighlightKey, setTraceHighlightKey] = useState(0);
  const speakerphoneBoost = true;

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceRecordingInputRef = useRef<HTMLInputElement | null>(null);
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const shouldRestartRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterIntervalRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);
  const liveUpdateTimerRef = useRef<number | null>(null);
  const lastQueuedLivePayloadKeyRef = useRef<string | null>(null);
  const pendingHttpLiveUpdateRef = useRef<{
    payloadKey: string;
      input: {
        sessionId: string;
        transcriptText: string;
        transcriptSegments: VoiceTranscriptSegmentInput[];
        voiceSignals: VoiceSignalInput[];
        elapsedSeconds: number;
        includeAi: boolean;
      };
      language: SupportedLocale;
      privacyMode: boolean;
  } | null>(null);
  const httpLiveUpdateInFlightRef = useRef(false);
  const calibrationSamplesRef = useRef<number[]>([]);
  const lowAudioThresholdRef = useRef(0.014);
  const speechThresholdRef = useRef(0.018);
  const calibrationCompleteRef = useRef(false);
  const rmsHistoryRef = useRef<number[]>([]);
  const cadenceHistoryRef = useRef<number[]>([]);
  const lastFinalTimestampRef = useRef<number | null>(null);
  const finalizeResolveRef = useRef<((payload: BackendScanResponse) => void) | null>(null);
  const finalizeRejectRef = useRef<((error: Error) => void) | null>(null);
  const transportModeRef = useRef<"websocket" | "http" | null>(null);
  const localeRef = useRef<SupportedLocale>("en");
  const privacyModeRef = useRef(true);
  const elapsedSecondsRef = useRef(0);
  const previousResultAttentionSignatureRef = useRef<string | null>(null);
  const previousTraceAttentionSignatureRef = useRef<string | null>(null);

  const transcriptText = useMemo(() => transcriptSegments.map((item) => item.text).join(" ").trim(), [transcriptSegments]);
  const listeningState = listening ? "Live speakerphone listener is active." : "Call Guard is standing by.";
  const transcriptSignature = useMemo(
    () => transcriptSegments.map((item) => `${item.timestamp ?? ""}:${item.text}`).join("|"),
    [transcriptSegments]
  );
  const transcriptStatusLabel = updating
    ? "Refreshing"
    : uploadingRecording
      ? "Analyzing"
    : stopping
      ? "Finalizing"
    : listening
      ? transportMode === "websocket"
        ? "Streaming"
        : transportMode === "http"
          ? "Fallback"
          : "Listening"
      : "";
  const voiceInputMode = result?.voiceAnalysis?.listeningMode ?? (listening ? "speakerphone_listener" : analysisMode === "upload" ? "uploaded_voicemail" : null);
  const isUploadSurface = voiceInputMode === "uploaded_voicemail";
  const evidenceEyebrow = isUploadSurface ? "Uploaded Transcript" : "Rolling Transcript";
  const evidenceTitle = isUploadSurface ? "Voicemail Evidence" : "Live Call Evidence";
  const listenerModeLabel =
    listening
      ? transportMode === "websocket"
        ? "Live streaming"
        : transportMode === "http"
          ? "Fallback review"
          : "Listening"
      : "Standby";
  const calibrationSummary =
    calibrationState === "calibrating"
      ? `Calibrating room noise ${Math.round(calibrationProgress * 100)}%`
      : calibrationState === "ready"
        ? `Ready. Ambient floor ${ambientFloor.toFixed(3)}`
        : "Standby";
  const now = Date.now();
  const recentSpeech = Boolean(lastSpeechDetectedAt && now - lastSpeechDetectedAt < 2400);
  const recentTranscript = Boolean(lastTranscriptActivityAt && now - lastTranscriptActivityAt < 7000);
  const roomNoiseTone =
    ambientFloor < 0.012 ? "Quiet room" : ambientFloor < 0.022 ? "Moderate background" : "Noisy room";
  const roomNoiseAccent =
    ambientFloor < 0.012 ? "text-[#8fd9a8]" : ambientFloor < 0.022 ? "text-secondary" : "text-[#ffb4ab]";
  const speechStatusLabel =
    !listening
      ? "Standby"
      : calibrationState === "calibrating"
        ? "Measuring room"
        : speechDetected || recentSpeech
          ? "Speech detected"
          : "Low signal";
  const speechStatusAccent =
    speechDetected || recentSpeech
      ? "text-[#8fd9a8]"
      : calibrationState === "calibrating"
        ? "text-secondary"
        : "text-[#ffb4ab]";
  const transcriptHealthLabel =
    !listening
      ? "Standby"
      : transcriptSegments.length > 0
        ? recentTranscript
          ? "Capturing phrases"
          : "Waiting on next phrase"
        : interimTranscript
          ? "Hearing speech"
          : calibrationState === "calibrating"
            ? "Warming up"
            : "Very light transcript";
  const transcriptHealthAccent =
    transcriptSegments.length > 0
      ? recentTranscript
        ? "text-[#8fd9a8]"
        : "text-secondary"
      : interimTranscript
        ? "text-secondary"
        : calibrationState === "calibrating"
          ? "text-secondary"
          : "text-[#ffb4ab]";
  const showLiveModePanels = analysisMode === "live" || listening;
  const showUploadModePanels = analysisMode === "upload" && !listening;
  const modeSummary =
    analysisMode === "live"
      ? "Listen through speakerphone for rolling transcript and live warning updates."
      : "Upload a saved voicemail or call recording for direct review.";
  const resultsCtaEyebrow = analysisMode === "upload" ? "Analysis finished" : "Updated live results";

  useEffect(() => {
    const node = resultsSectionRef.current;
    if (typeof window === "undefined" || !node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setResultsSectionInView(entry.isIntersecting);
      },
      {
        threshold: 0.16,
        rootMargin: "-72px 0px -18% 0px"
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [result, analysisMode, listening, starting, stopping, uploadingRecording]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setBrowserSupported(Boolean(getSpeechRecognitionConstructor() && navigator.mediaDevices?.getUserMedia));
  }, []);

  useEffect(() => {
    transportModeRef.current = transportMode;
  }, [transportMode]);

  useEffect(() => {
    localeRef.current = language;
  }, [language]);

  useEffect(() => {
    privacyModeRef.current = privacyMode;
  }, [privacyMode]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!interimTranscript && transcriptSegments.length === 0) {
      return;
    }
    setLastTranscriptActivityAt(Date.now());
  }, [interimTranscript, transcriptSegments]);

  useEffect(() => {
    if (!result || resultsSectionInView) {
      setShowSeeResultsCta(false);
    }
  }, [result, resultsSectionInView]);

  useEffect(() => {
    if (typeof window === "undefined" || resultHighlightKey === 0) {
      return;
    }

    setResultSpotlightActive(true);
    const timeout = window.setTimeout(() => {
      setResultSpotlightActive(false);
    }, 1600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [resultHighlightKey]);

  useEffect(() => {
    if (!result) {
      previousResultAttentionSignatureRef.current = null;
      previousTraceAttentionSignatureRef.current = null;
      setShowSeeResultsCta(false);
      return;
    }

    const nextResultSignature = buildVoiceResultAttentionSignature(result);
    const previousResultSignature = previousResultAttentionSignatureRef.current;
    const resultChanged = previousResultSignature !== null && previousResultSignature !== nextResultSignature;
    const firstResult = previousResultSignature === null;
    previousResultAttentionSignatureRef.current = nextResultSignature;

    if (firstResult || resultChanged) {
      if (resultsSectionInView) {
        setResultHighlightKey((current) => current + 1);
      } else if (isElementBelowFold(resultsSectionRef.current)) {
        setShowSeeResultsCta(true);
      }
    }

    const nextTraceSignature = buildVoiceTraceAttentionSignature(result);
    const previousTraceSignature = previousTraceAttentionSignatureRef.current;
    if (nextTraceSignature && nextTraceSignature !== previousTraceSignature) {
      previousTraceAttentionSignatureRef.current = nextTraceSignature;
      setTraceHighlightKey((current) => current + 1);
    } else if (!nextTraceSignature) {
      previousTraceAttentionSignatureRef.current = null;
    }
  }, [result, resultsSectionInView]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const items = await fetchDetailedScanHistory(language);
      if (!cancelled) {
        setHistoryItems(items.filter((item) => item.scanType === "voice"));
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [language]);

  function clearDisplayedVoiceResult() {
    setResult(null);
    setTranscriptSegments([]);
    setVoiceSignals([]);
    setInterimTranscript("");
    setElapsedSeconds(0);
  }

  function handleAnalysisModeChange(nextMode: "live" | "upload") {
    setAnalysisMode(nextMode);
    setError(null);
    setStatusMessage(null);
    clearDisplayedVoiceResult();
  }

  async function flushPendingHttpLiveUpdate() {
    const pending = pendingHttpLiveUpdateRef.current;
    if (!pending || httpLiveUpdateInFlightRef.current) {
      return;
    }

    httpLiveUpdateInFlightRef.current = true;
    setUpdating(true);

    try {
      const payload = await executeVoiceSessionUpdate(pending.input);
      setResult(
        adaptMessageScanResult(payload, {
          locale: pending.language,
          privacyMode: pending.privacyMode
        })
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Live call update failed.");
    } finally {
      httpLiveUpdateInFlightRef.current = false;

      const latestPending = pendingHttpLiveUpdateRef.current;
      if (latestPending && latestPending.payloadKey !== pending.payloadKey && shouldRestartRef.current) {
        void flushPendingHttpLiveUpdate();
        return;
      }

      setUpdating(false);
    }
  }

  useEffect(() => {
    if (!sessionId || !listening || !transcriptText) {
      lastQueuedLivePayloadKeyRef.current = null;
      pendingHttpLiveUpdateRef.current = null;
      return;
    }

    const payloadKey = `${sessionId}:${transcriptSignature}:${language}:${privacyMode ? "private" : "standard"}`;
    if (lastQueuedLivePayloadKeyRef.current === payloadKey) {
      return;
    }
    lastQueuedLivePayloadKeyRef.current = payloadKey;
    pendingHttpLiveUpdateRef.current = {
      payloadKey,
        input: {
          sessionId,
          transcriptText,
          transcriptSegments,
          voiceSignals,
          elapsedSeconds: elapsedSecondsRef.current,
          includeAi: true
        },
      language,
      privacyMode
    };

    if (liveUpdateTimerRef.current !== null) {
      window.clearTimeout(liveUpdateTimerRef.current);
    }

    liveUpdateTimerRef.current = window.setTimeout(async () => {
      try {
        setUpdating(true);
        if (transportMode === "websocket" && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "update",
              session_id: sessionId,
              transcript_text: transcriptText,
              transcript_segments: transcriptSegments,
              voice_signals: voiceSignals,
              elapsed_seconds: elapsedSecondsRef.current,
              include_ai: true
            })
          );
          return;
        }

        await flushPendingHttpLiveUpdate();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Live call update failed.");
      } finally {
        if (transportMode !== "websocket" && !httpLiveUpdateInFlightRef.current) {
          setUpdating(false);
        }
      }
    }, LIVE_UPDATE_DEBOUNCE_MS);

    return () => {
      if (liveUpdateTimerRef.current !== null) {
        window.clearTimeout(liveUpdateTimerRef.current);
        liveUpdateTimerRef.current = null;
      }
    };
  }, [
    sessionId,
    listening,
    transcriptText,
    transcriptSegments,
    transcriptSignature,
    language,
    privacyMode,
    transportMode
  ]);

  useEffect(() => {
    return () => {
      shutdownLiveRuntime(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addVoiceSignals(signals: VoiceSignalInput[]) {
    if (signals.length === 0) {
      return;
    }
    setVoiceSignals((current) => {
      const next = mergeVoiceSignals(current, signals);
      return sameVoiceSignals(current, next) ? current : next;
    });
  }

  function clearPendingFinalize(error?: Error) {
    if (error && finalizeRejectRef.current) {
      finalizeRejectRef.current(error);
    }
    finalizeResolveRef.current = null;
    finalizeRejectRef.current = null;
  }

  function resetAudioCalibration(options?: { preserveStatus?: boolean }) {
    calibrationSamplesRef.current = [];
    calibrationCompleteRef.current = false;
    lowAudioThresholdRef.current = speakerphoneBoost ? 0.01 : 0.014;
    speechThresholdRef.current = speakerphoneBoost ? 0.016 : 0.02;
    setCalibrationState("idle");
    setCalibrationProgress(0);
    setAmbientFloor(lowAudioThresholdRef.current);
    setSpeechThreshold(speechThresholdRef.current);
    if (!options?.preserveStatus) {
      setStatusMessage(null);
    }
  }

  function beginAudioCalibration() {
    calibrationSamplesRef.current = [];
    calibrationCompleteRef.current = false;
    setCalibrationState("calibrating");
    setCalibrationProgress(0);
    setStatusMessage(
      speakerphoneBoost
        ? "CyberCoach is calibrating for speakerphone playback. Keep the phone where you plan to use it for the call."
        : "CyberCoach is calibrating the room noise before listening closely to the call."
    );
  }

  function finalizeAudioCalibration() {
    const samples = calibrationSamplesRef.current.slice().sort((left, right) => left - right);
    if (samples.length === 0) {
      return;
    }

    const floorSampleCount = Math.max(3, Math.ceil(samples.length * 0.6));
    const floorSlice = samples.slice(0, floorSampleCount);
    const baseline = floorSlice.reduce((total, value) => total + value, 0) / floorSlice.length;
    const nextAmbientFloor = clamp(baseline, 0.006, 0.035);
    const nextLowAudioThreshold = clamp(
      nextAmbientFloor * (speakerphoneBoost ? 1.35 : 1.55) + (speakerphoneBoost ? 0.003 : 0.004),
      speakerphoneBoost ? 0.008 : 0.011,
      0.05
    );
    const nextSpeechThreshold = clamp(
      nextAmbientFloor * (speakerphoneBoost ? 2.4 : 2.8) + (speakerphoneBoost ? 0.006 : 0.008),
      speakerphoneBoost ? 0.014 : 0.018,
      0.09
    );

    lowAudioThresholdRef.current = nextLowAudioThreshold;
    speechThresholdRef.current = nextSpeechThreshold;
    calibrationCompleteRef.current = true;
    setAmbientFloor(nextAmbientFloor);
    setSpeechThreshold(nextSpeechThreshold);
    setCalibrationState("ready");
    setCalibrationProgress(1);
    setStatusMessage(
      speakerphoneBoost
        ? "Call Guard is calibrated for speakerphone playback and is listening with a more sensitive audio floor."
        : "Microphone calibration is ready. CyberCoach is listening with the current room-noise baseline."
    );
  }

  function closeVoiceSocket() {
    const activeSocket = socketRef.current;
    socketRef.current = null;
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.close();
      return;
    }
    if (activeSocket && activeSocket.readyState === WebSocket.CONNECTING) {
      activeSocket.close();
    }
  }

  function handleVoiceSocketMessage(message: VoiceSocketMessage) {
    if (message.type === "ready" || message.type === "pong") {
      return;
    }

    if (message.type === "error") {
      setUpdating(false);
      setError(message.detail || "Live stream analysis failed.");
      if (transportMode === "websocket" && shouldRestartRef.current) {
        setTransportMode("http");
        setStatusMessage("Live stream had a problem, so CyberCoach switched to fallback updates for the rest of this call.");
      }
      clearPendingFinalize(new Error(message.detail || "Live stream analysis failed."));
      return;
    }

    if (message.type !== "analysis") {
      return;
    }

    setResult(
      adaptMessageScanResult(message.result, {
        locale: localeRef.current,
        privacyMode: privacyModeRef.current
      })
    );
    setUpdating(false);

    if (message.state === "final" && finalizeResolveRef.current) {
      finalizeResolveRef.current(message.result);
      clearPendingFinalize();
    }
  }

  async function openVoiceSocket(): Promise<boolean> {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      const socket = new WebSocket(getVoiceRealtimeSocketUrl());
      let settled = false;

      const finish = (connected: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        resolve(connected);
      };

      const timeout = window.setTimeout(() => {
        closeVoiceSocket();
        finish(false);
      }, 1800);

      socket.onopen = () => {
        socketRef.current = socket;
        setTransportMode("websocket");
        finish(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as VoiceSocketMessage;
          handleVoiceSocketMessage(payload);
        } catch {
          setUpdating(false);
          setError("Live stream returned an unreadable response.");
        }
      };

      socket.onerror = () => {
        finish(false);
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (shouldRestartRef.current && transportModeRef.current === "websocket") {
          setTransportMode("http");
          setStatusMessage("Live stream connection dropped. CyberCoach is continuing in fallback mode.");
        } else if (!shouldRestartRef.current) {
          setTransportMode(null);
        }

        if (finalizeRejectRef.current) {
          clearPendingFinalize(new Error("Live stream closed before finalization completed."));
        }
        finish(false);
      };
    });
  }

  async function finalizeViaWebSocket(input: {
    sessionId: string;
    transcriptText: string;
    transcriptSegments: VoiceTranscriptSegmentInput[];
    voiceSignals: VoiceSignalInput[];
    elapsedSeconds: number;
  }) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Live stream is not connected.");
    }

    return await new Promise<BackendScanResponse>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        clearPendingFinalize(new Error("Timed out waiting for the final call analysis."));
      }, 12000);

      finalizeResolveRef.current = (payload) => {
        window.clearTimeout(timeout);
        resolve(payload);
      };
      finalizeRejectRef.current = (error) => {
        window.clearTimeout(timeout);
        reject(error);
      };

      socket.send(
        JSON.stringify({
          type: "finalize",
          session_id: input.sessionId,
          transcript_text: input.transcriptText,
          transcript_segments: input.transcriptSegments,
          voice_signals: input.voiceSignals,
          elapsed_seconds: input.elapsedSeconds,
          include_ai: true
        })
      );
    });
  }

  function shutdownLiveRuntime(stopTracks: boolean) {
    shouldRestartRef.current = false;
    lastQueuedLivePayloadKeyRef.current = null;
    pendingHttpLiveUpdateRef.current = null;
    httpLiveUpdateInFlightRef.current = false;

    if (liveUpdateTimerRef.current !== null) {
      window.clearTimeout(liveUpdateTimerRef.current);
      liveUpdateTimerRef.current = null;
    }
    if (meterIntervalRef.current !== null) {
      window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    closeVoiceSocket();
    clearPendingFinalize();

    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    if (stopTracks && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    rmsHistoryRef.current = [];
    cadenceHistoryRef.current = [];
    calibrationSamplesRef.current = [];
    calibrationCompleteRef.current = false;
    lastFinalTimestampRef.current = null;
    setMicLevel(0);
    setCurrentRms(0);
    setSpeechDetected(false);
    setLastSpeechDetectedAt(null);
    setLastTranscriptActivityAt(null);
    setTransportMode(null);
    setCalibrationState("idle");
    setCalibrationProgress(0);
  }

  function stopLocalListeningCapture() {
    shouldRestartRef.current = false;
    lastQueuedLivePayloadKeyRef.current = null;
    pendingHttpLiveUpdateRef.current = null;

    if (liveUpdateTimerRef.current !== null) {
      window.clearTimeout(liveUpdateTimerRef.current);
      liveUpdateTimerRef.current = null;
    }
    if (meterIntervalRef.current !== null) {
      window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      activeRecognition.onend = null;
      activeRecognition.onerror = null;
      activeRecognition.onresult = null;
      try {
        activeRecognition.stop();
      } catch {
        // ignore stop races
      }
      activeRecognition.abort?.();
    }
    recognitionRef.current = null;

    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    rmsHistoryRef.current = [];
    cadenceHistoryRef.current = [];
    calibrationSamplesRef.current = [];
    calibrationCompleteRef.current = false;
    lastFinalTimestampRef.current = null;
    setListening(false);
    setInterimTranscript("");
    setMicLevel(0);
    setCurrentRms(0);
    setSpeechDetected(false);
    setLastSpeechDetectedAt(null);
    setLastTranscriptActivityAt(null);
    setCalibrationState("idle");
    setCalibrationProgress(0);
  }

  function startAudioMonitoring(stream: MediaStream) {
    if (typeof window === "undefined") {
      return;
    }

    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = speakerphoneBoost ? 0.76 : 0.68;

    const source = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = speakerphoneBoost ? 2.2 : 1.3;
    source.connect(gainNode);
    gainNode.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    beginAudioCalibration();

    meterIntervalRef.current = window.setInterval(() => {
      const activeAnalyser = analyserRef.current;
      if (!activeAnalyser) {
        return;
      }

      const buffer = new Float32Array(activeAnalyser.fftSize);
      activeAnalyser.getFloatTimeDomainData(buffer);

      let sumSquares = 0;
      let peak = 0;
      for (const sample of buffer) {
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      const effectiveRms = clamp(rms * (speakerphoneBoost ? 1.55 : 1.1), 0, 1);
      setCurrentRms(effectiveRms);
      setMicLevel(Math.max(0.06, Math.min(1, effectiveRms * (speakerphoneBoost ? 10.5 : 8.5))));

      if (!calibrationCompleteRef.current) {
        const nextCalibrationSamples = [...calibrationSamplesRef.current, effectiveRms].slice(-10);
        calibrationSamplesRef.current = nextCalibrationSamples;
        setCalibrationProgress(Math.min(1, nextCalibrationSamples.length / 8));
        if (nextCalibrationSamples.length >= 8) {
          finalizeAudioCalibration();
        }
      }

      const nextHistory = [...rmsHistoryRef.current.slice(-11), effectiveRms];
      rmsHistoryRef.current = nextHistory;
      const liveSpeechThreshold = calibrationCompleteRef.current
        ? speechThresholdRef.current
        : lowAudioThresholdRef.current * 1.22;
      const nextSpeechDetected = effectiveRms > liveSpeechThreshold;
      setSpeechDetected(nextSpeechDetected);
      if (nextSpeechDetected) {
        setLastSpeechDetectedAt(Date.now());
      }

      if (
        calibrationCompleteRef.current &&
        nextHistory.length >= 6 &&
        nextHistory.slice(-6).every((value) => value < lowAudioThresholdRef.current)
      ) {
        addVoiceSignals([
          {
            type: "voice_audio_quality_limited",
            detail: speakerphoneBoost
              ? "CyberCoach is still hearing very little speakerphone audio. Move the phone closer to this device or raise the speaker volume if you can."
              : "CyberCoach is hearing very little call audio, so the live transcript may miss words or phrases.",
            severity: "low"
          }
        ]);
      }

      if (calibrationCompleteRef.current && nextHistory.length >= 8) {
        const recent = nextHistory.slice(-8);
        const mean = recent.reduce((total, value) => total + value, 0) / recent.length;
        const variance = recent.reduce((total, value) => total + (value - mean) ** 2, 0) / recent.length;
        if (mean > speechThresholdRef.current && variance < 0.00003) {
          addVoiceSignals([
            {
              type: "voice_pattern_suspicious",
              detail: "The call audio has stayed unusually flat and uniform for several seconds, which can happen with heavily processed or synthetic-sounding audio.",
              severity: "low"
            }
          ]);
        }
      }

      if (peak > 0.98) {
        addVoiceSignals([
          {
            type: "voice_audio_quality_limited",
            detail: "The call audio is clipping or distorting, which limits how confidently CyberCoach can judge voice patterns.",
            severity: "low"
          }
        ]);
      }
    }, 320);
  }

  function trackSpeechCadence(text: string) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const now = Date.now();
    const previous = lastFinalTimestampRef.current;
    lastFinalTimestampRef.current = now;

    if (!previous || words === 0) {
      return;
    }

    const seconds = Math.max(0.6, (now - previous) / 1000);
    const wordsPerSecond = words / seconds;
    const nextCadence = [...cadenceHistoryRef.current.slice(-5), wordsPerSecond];
    cadenceHistoryRef.current = nextCadence;

    if (nextCadence.length >= 4) {
      const mean = nextCadence.reduce((total, value) => total + value, 0) / nextCadence.length;
      const variance = nextCadence.reduce((total, value) => total + (value - mean) ** 2, 0) / nextCadence.length;
      if (mean > 1.4 && variance < 0.18) {
        addVoiceSignals([
          {
            type: "voice_pattern_suspicious",
            detail: "The caller's speaking pace has stayed unusually even across several phrases, so CyberCoach is treating voice cadence as mildly suspicious.",
            severity: "low"
          }
        ]);
      }
    }
  }

  function createRecognition() {
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      throw new Error("Live transcript mode currently needs Chrome or Edge with browser speech recognition available.");
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = speechLocaleMap[language];

    recognition.onresult = (event) => {
      const finalChunks: string[] = [];
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const item = event.results[index];
        const transcript = item?.[0]?.transcript?.trim() ?? "";
        if (!transcript) {
          continue;
        }
        if (item.isFinal) {
          finalChunks.push(transcript);
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }

      setInterimTranscript(interim);

      if (finalChunks.length > 0) {
        const timestamp = new Date().toISOString();
        setTranscriptSegments((current) => {
          const next = [...current];
          finalChunks.forEach((chunk) => {
            if (next[next.length - 1]?.text !== chunk) {
              next.push({ text: chunk, timestamp });
            }
            trackSpeechCadence(chunk);
          });
          return next.slice(-20);
        });
        setStatusMessage("Live transcript updated. CyberCoach is refreshing the risk estimate.");
      }
    };

    recognition.onerror = (event) => {
      const reason = event.error ?? event.message ?? "unknown";
      const normalizedReason = reason.toLowerCase();
      const recoverableReasons = new Set(["no-speech", "aborted", "network"]);

      if (recoverableReasons.has(normalizedReason)) {
        if (shouldRestartRef.current) {
          setError(null);
          setStatusMessage(
            normalizedReason === "no-speech"
              ? "The browser transcript paused because it did not hear a clear phrase. CyberCoach is still listening and will resume automatically."
              : "The browser transcript briefly dropped out. CyberCoach is still listening and will resume automatically."
          );
          return;
        }
        return;
      }

      setError(`Live transcript error: ${reason}.`);
      setStatusMessage("CyberCoach stopped listening because the browser transcript service reported a problem.");
      shouldRestartRef.current = false;
      setListening(false);
      setSessionId(null);
      shutdownLiveRuntime(true);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Browser may reject rapid restart attempts; the next user action can retry.
          }
        }, 240);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function handleStartListening() {
    if (!browserSupported) {
      setError("This browser does not expose live speech recognition. Try the feature in Chrome or Edge.");
      return;
    }

    setStarting(true);
    setError(null);
    setStatusMessage(null);

    try {
      setAnalysisMode("live");
      shutdownLiveRuntime(true);
      setResult(null);
      setTranscriptSegments([]);
      setVoiceSignals([]);
      setInterimTranscript("");
      setElapsedSeconds(0);
      lastQueuedLivePayloadKeyRef.current = null;

      const session = await executeVoiceSessionStart({
        language,
        privacyMode
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Preserve speakerphone-style audio instead of aggressively canceling it out.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      shouldRestartRef.current = true;
      const streamingConnected = await openVoiceSocket();
      setSessionId(session.session_id);
      startAudioMonitoring(stream);
      createRecognition();

      elapsedIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => current + 1);
      }, 1000);

      setListening(true);
      setStatusMessage(
        streamingConnected
          ? speakerphoneBoost
            ? "Call Guard is listening now with live streaming updates and calibrating around the phone's current position."
            : "Call Guard is listening now with live streaming updates. CyberCoach is calibrating the room before it judges low audio."
          : speakerphoneBoost
            ? "Call Guard is listening now in fallback mode and calibrating around the phone's current position."
            : "Call Guard is listening now. Live streaming was unavailable, so CyberCoach is calibrating the room and using fallback updates for this call."
      );
    } catch (startError) {
      shutdownLiveRuntime(true);
      setSessionId(null);
      setListening(false);
      setError(startError instanceof Error ? startError.message : "Call Guard could not start listening.");
    } finally {
      setStarting(false);
    }
  }

  async function handleStopListening() {
    if (!sessionId) {
      return;
    }

    const finalizeInput = {
      sessionId,
      transcriptText,
      transcriptSegments,
      voiceSignals,
      elapsedSeconds,
      includeAi: true as const
    };

    setStopping(true);
    setError(null);
    setStatusMessage("Listener stopped. CyberCoach is finalizing the transcript you already captured and preparing the final call report.");
    stopLocalListeningCapture();
    closeVoiceSocket();
    setTransportMode(null);

    try {
      const payload = await executeVoiceSessionFinalize(finalizeInput);

      const adapted = adaptMessageScanResult(payload, {
        locale: language,
        privacyMode
      });
      setResult(adapted);
      setTranscriptSegments(
        adapted.voiceAnalysis?.transcriptSegments.map((segment) => ({
          text: segment.text,
          timestamp: segment.timestamp ?? ""
        })) ?? []
      );
      setVoiceSignals(
        adapted.voiceAnalysis?.voiceSignals.map((signal) => ({
          type: signal.type,
          detail: signal.detail,
          severity: signal.severity
        })) ?? []
      );
      setElapsedSeconds(adapted.voiceAnalysis?.elapsedSeconds ?? 0);
      const nextHistory = await fetchDetailedScanHistory(language);
      setHistoryItems(nextHistory.filter((item) => item.scanType === "voice"));
      setStatusMessage("Live call review finalized. CyberCoach saved the session summary for this backend session.");
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Call Guard could not finalize this call.");
    } finally {
      shutdownLiveRuntime(false);
      setSessionId(null);
      setStopping(false);
    }
  }

  function handleSelectVoiceRecording(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setAnalysisMode("upload");
      setError(null);
      clearDisplayedVoiceResult();
    }
    setVoiceRecordingFile(file);
    if (file) {
      setStatusMessage(`Selected ${file.name} for voicemail analysis.`);
    }
  }

  function handleClearVoiceRecording() {
    setVoiceRecordingFile(null);
    setVoiceRecordingTranscriptOverride("");
    if (voiceRecordingInputRef.current) {
      voiceRecordingInputRef.current.value = "";
    }
    setStatusMessage("Cleared the uploaded voicemail selection.");
  }

  async function handleAnalyzeVoiceRecording() {
    if (!voiceRecordingFile) {
      setError("Choose an audio or video voicemail file before starting the upload analysis.");
      return;
    }

    setUploadingRecording(true);
    setError(null);
    setStatusMessage("CyberCoach is transcribing the recording and preparing the call-risk summary.");

    try {
      setAnalysisMode("upload");
      shutdownLiveRuntime(true);
      setListening(false);
      setSessionId(null);
      clearDisplayedVoiceResult();

      const payload = await executeVoiceRecordingScan({
        file: voiceRecordingFile,
        language,
        privacyMode,
        transcriptOverrideText: voiceRecordingTranscriptOverride
      });
      const adapted = adaptMessageScanResult(payload, {
        locale: language,
        privacyMode
      });

      setResult(adapted);
      setTranscriptSegments(
        adapted.voiceAnalysis?.transcriptSegments.map((segment) => ({
          text: segment.text,
          timestamp: segment.timestamp ?? ""
        })) ?? []
      );
      setVoiceSignals(
        adapted.voiceAnalysis?.voiceSignals.map((signal) => ({
          type: signal.type,
          detail: signal.detail,
          severity: signal.severity
        })) ?? []
      );
      setElapsedSeconds(adapted.voiceAnalysis?.elapsedSeconds ?? 0);

      const nextHistory = await fetchDetailedScanHistory(language);
      setHistoryItems(nextHistory.filter((item) => item.scanType === "voice"));
      setStatusMessage("Uploaded voicemail analyzed. CyberCoach generated a saved call-risk report from the recording.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Voice recording analysis failed.");
    } finally {
      setUploadingRecording(false);
    }
  }

  function handleRestoreHistory(item: DetailedScanHistoryItem) {
    shutdownLiveRuntime(true);
    setListening(false);
    setSessionId(null);
    setInterimTranscript("");
    const historyLocale = resolveSupportedLocale(item.raw.metadata?.language?.toString() ?? language);
    setLanguage(historyLocale);
    const adapted = adaptMessageScanResult(item.raw, {
      locale: historyLocale,
      privacyMode: Boolean(item.raw.redacted_input || (item.raw.metadata?.redaction_count ?? 0))
    });
    setAnalysisMode(adapted.voiceAnalysis?.listeningMode === "uploaded_voicemail" ? "upload" : "live");
    setResult(adapted);
    setTranscriptSegments(
      adapted.voiceAnalysis?.transcriptSegments.map((segment) => ({
        text: segment.text,
        timestamp: segment.timestamp ?? ""
      })) ?? []
    );
    setVoiceSignals(
      adapted.voiceAnalysis?.voiceSignals.map((signal) => ({
        type: signal.type,
        detail: signal.detail,
        severity: signal.severity
      })) ?? []
    );
    setElapsedSeconds(adapted.voiceAnalysis?.elapsedSeconds ?? 0);
    setStatusMessage("Restored a finalized Call Guard session from the current backend history.");
  }

  function handleScrollToResults() {
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setShowSeeResultsCta(false);
    setResultHighlightKey((current) => current + 1);
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
      setStatusMessage("Clipboard access failed. Try a file download instead.");
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

  const liveWarnings = result?.voiceAnalysis?.liveWarnings ?? [];
  const challengeQuestions = result?.voiceAnalysis?.challengeQuestions ?? [];
  const renderedTranscript = transcriptSegments.length > 0 ? transcriptSegments : result?.voiceAnalysis?.transcriptSegments ?? [];
  const railVoiceSignals = voiceSignals.length > 0 ? voiceSignals : result?.voiceAnalysis?.voiceSignals ?? [];
  const voiceAiReview = useMemo(() => getVoiceAiReviewCopy(result), [result]);
  const showLoadingResultShell = !result && (uploadingRecording || starting || listening || stopping);

  return (
    <>
      <Header active="Scans" />

      <main className="mx-auto grid max-w-[1440px] grid-cols-12 gap-6 px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:gap-8 lg:px-8 lg:pt-24 xl:gap-12">
        <ScanSidebar activeItem="voice" />

        <div className="col-span-12 space-y-8 lg:space-y-10 xl:col-span-6 xl:space-y-12">
          <section className="animate-fade-up space-y-4">
            <div className="flex items-center space-x-3">
              <span className="h-px w-12 bg-secondary" />
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                Call Guard
              </span>
            </div>

            <h1 className="max-w-3xl font-headline text-4xl font-extrabold leading-none tracking-editorial text-on-surface sm:text-5xl lg:text-6xl">
              CALL <span className="text-secondary">SAFETY</span> CHECK.
            </h1>

            <p className="max-w-2xl pt-2 text-base leading-relaxed text-on-surface-variant sm:pt-4 sm:text-lg">
              Put the caller on speakerphone or upload a recording so CyberCoach can help you slow down, see what sounds risky, and verify the story more safely.
            </p>
          </section>

          <section className="space-y-6 animate-fade-up sm:space-y-8" style={{ animationDelay: "80ms" }}>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
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
                  <span className="mb-1 block font-label text-[10px] uppercase tracking-widest text-on-primary-container">Review Language</span>
                  <span className="font-headline font-bold text-on-surface">Language</span>
                </div>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(resolveSupportedLocale(event.target.value))}
                    disabled={listening}
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

            <section className="border-t border-outline-variant/20 pt-3">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:items-center lg:gap-8">
                <div className="space-y-2 pr-0 lg:pr-4">
                  <span className="block font-label text-[10px] uppercase tracking-widest text-on-primary-container">
                  Review Mode
                  </span>
                  <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">{modeSummary}</p>
                </div>

                <div className="justify-self-start lg:justify-self-end">
                  <div className="inline-flex w-full max-w-[28rem] overflow-hidden border border-outline-variant/24 bg-surface-container-lowest/75 p-1.5 sm:max-w-[30rem] lg:w-auto">
                    {[
                      { id: "live", label: "Listen Live" },
                      { id: "upload", label: "Upload Recording" }
                    ].map((option) => {
                      const active = analysisMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={listening || starting || stopping || uploadingRecording}
                          onClick={() => handleAnalysisModeChange(option.id as "live" | "upload")}
                          className={`min-w-0 flex-1 px-4 py-3 text-center transition-all duration-200 sm:min-w-[11rem] sm:px-6 ${
                            active
                              ? "bg-surface-container-low text-vellum shadow-[inset_0_0_0_1px_rgba(225,194,144,0.24)]"
                              : "text-on-surface-variant hover:bg-surface-container-low/70 hover:text-vellum"
                          }`}
                        >
                          <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em]">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {showLiveModePanels ? (
            <div className="ghost-border bg-surface-container-low p-5 sm:p-6 lg:p-8">
              <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                <div className="space-y-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                    Live call review
                  </p>
                  <h2 className="font-headline text-2xl font-bold text-vellum sm:text-3xl">Listen live. Slow the scam down.</h2>
                  <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant">
                    CyberCoach uses your browser microphone to build a rolling transcript, surface scam pressure, and suggest safer ways to verify the caller while the conversation is still happening.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void (listening ? handleStopListening() : handleStartListening())}
                    disabled={starting || stopping || uploadingRecording || !browserSupported}
                    className={`editorial-button w-full justify-between px-5 ${listening ? "" : "editorial-button-primary"}`}
                  >
                    <span>
                      {starting ? "Starting..." : stopping ? "Finalizing..." : listening ? "Stop And Finalize" : "Start Listening"}
                    </span>
                    <PhoneCallIcon className="h-5 w-5 text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetAudioCalibration({ preserveStatus: true });
                      setStatusMessage(
                        listening
                          ? "Calibration was reset. Stop and restart listening to measure the room again from the phone's current position."
                          : "Calibration reset. Start listening when the phone is in place so CyberCoach can measure the room again."
                      );
                    }}
                    disabled={starting || stopping || uploadingRecording}
                    className="editorial-button w-full justify-between px-5"
                  >
                    <span>Reset Calibration</span>
                    <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary">Tune</span>
                  </button>
                  {!browserSupported ? (
                    <p className="text-xs leading-relaxed text-[#ffb4ab]">
                      Live call review needs browser speech recognition support, which is most reliable in Chrome or Edge on desktop.
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Place the caller on speaker near this device. Audio stays ephemeral unless you export the final report.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:mt-8 lg:gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
                <div className="ghost-border bg-surface-container-lowest/55 p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Mic Activity</p>
                      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                        {listeningState} {transportMode === "websocket" ? "Streaming live." : transportMode === "http" ? "Fallback mode active." : ""}
                      </p>
                    </div>
                    <div className={`h-3 w-3 rounded-full ${listening ? "bg-secondary shadow-[0_0_18px_rgba(229,198,146,0.7)]" : "bg-outline"}`} />
                  </div>
                  <div className="mt-4 ghost-border bg-surface-container-low p-4 lg:mt-5 lg:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Live Input</p>
                        <p className="mt-2 max-w-xl text-xs leading-relaxed text-on-surface-variant">
                          Checking speaker volume, speech clarity, and transcript flow.
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Mic Level</p>
                        <p className="mt-1 font-headline text-xl font-bold text-vellum">{Math.round(micLevel * 100)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <MicrophoneMeter level={micLevel} />
                    </div>
                    <div className="mt-4 grid gap-3 lg:mt-5">
                      <div className="ghost-border bg-surface-container-lowest/55 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Room Noise</p>
                            <p className={`mt-2 text-base font-semibold leading-snug ${roomNoiseAccent}`}>{roomNoiseTone}</p>
                            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                              Floor {ambientFloor.toFixed(3)} • Live {currentRms.toFixed(3)}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs font-medium text-on-surface-variant sm:text-right">
                            {currentRms >= ambientFloor ? "Signal active" : "Room is quiet"}
                          </div>
                        </div>
                      </div>
                      <div className="ghost-border bg-surface-container-lowest/55 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Speech Detection</p>
                            <p className={`mt-2 text-base font-semibold leading-snug ${speechStatusAccent}`}>{speechStatusLabel}</p>
                            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                              Threshold {speechThreshold.toFixed(3)}{speakerphoneBoost ? " with boost" : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs font-medium text-on-surface-variant sm:text-right">
                            {listenerModeLabel}
                          </div>
                        </div>
                      </div>
                      <div className="ghost-border bg-surface-container-lowest/55 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Transcript Capture</p>
                            <p className={`mt-2 text-base font-semibold leading-snug ${transcriptHealthAccent}`}>{transcriptHealthLabel}</p>
                            <p className="mt-1 max-w-[28rem] text-xs leading-relaxed text-on-surface-variant">
                              {transcriptSegments.length > 0
                                ? `${transcriptSegments.length} saved phrase${transcriptSegments.length === 1 ? "" : "s"}`
                                : interimTranscript
                                  ? "Interim speech is arriving"
                                  : "Waiting for clearer phrases"}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs font-medium text-on-surface-variant sm:text-right">
                            {transcriptSegments.length > 0 ? "Recording" : interimTranscript ? "Listening" : "Standby"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 sm:p-5">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Elapsed</p>
                    <p className="mt-2 font-headline text-3xl font-bold text-vellum">{formatElapsed(elapsedSeconds)}</p>
                  </div>
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 sm:p-5">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Voice Signals</p>
                    <p className="mt-2 font-headline text-3xl font-bold text-vellum">{voiceSignals.length}</p>
                  </div>
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 sm:p-5">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Session Mode</p>
                    <p className="mt-2 text-sm font-semibold text-vellum">{listenerModeLabel}</p>
                  </div>
                  <div className="ghost-border bg-surface-container-lowest/55 p-4 sm:p-5">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Calibration</p>
                    <p className="mt-2 text-sm font-semibold text-vellum">{calibrationSummary}</p>
                    <div className="mt-3 h-2 w-full overflow-hidden bg-surface-container-highest">
                      <div
                        className="h-full bg-secondary transition-all"
                        style={{ width: `${Math.max(6, Math.round(calibrationProgress * 100))}%`, opacity: calibrationState === "idle" ? 0.4 : 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {showUploadModePanels ? (
            <div className="ghost-border bg-surface-container-low p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                    Recording upload
                  </p>
                  <h2 className="font-headline text-2xl font-bold text-vellum sm:text-3xl">Analyze a saved call or voicemail.</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                    Upload an audio or video recording of the suspicious call. CyberCoach will transcribe it when possible, or use your corrected transcript if you already know what was said.
                  </p>
                </div>

                <div className="min-w-0 space-y-3 sm:min-w-[15rem]">
                  <input
                    ref={voiceRecordingInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleSelectVoiceRecording}
                  />
                  <button
                    type="button"
                    onClick={() => voiceRecordingInputRef.current?.click()}
                    disabled={listening || uploadingRecording}
                    className="editorial-button editorial-button-primary w-full justify-between px-5"
                  >
                    <span>{voiceRecordingFile ? "Replace Recording" : "Choose Recording"}</span>
                    <PhoneCallIcon className="h-5 w-5 text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAnalyzeVoiceRecording()}
                    disabled={!voiceRecordingFile || listening || uploadingRecording}
                    className="editorial-button w-full justify-between px-5"
                  >
                    <span>{uploadingRecording ? "Analyzing..." : "Analyze Recording"}</span>
                    <PhoneCallIcon className="h-5 w-5 text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearVoiceRecording}
                    disabled={uploadingRecording || (!voiceRecordingFile && !voiceRecordingTranscriptOverride)}
                    className="editorial-button w-full justify-between px-5"
                  >
                    <span>Clear Recording</span>
                    <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary">Reset</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:mt-8 lg:gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="ghost-border bg-surface-container-lowest/55 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Accepted</span>
                    <span className="border border-outline-variant/25 px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em] text-on-surface">MP3</span>
                    <span className="border border-outline-variant/25 px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em] text-on-surface">WAV</span>
                    <span className="border border-outline-variant/25 px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em] text-on-surface">M4A</span>
                    <span className="border border-outline-variant/25 px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em] text-on-surface">MP4</span>
                    <span className="border border-outline-variant/25 px-3 py-2 font-label text-[10px] uppercase tracking-[0.12em] text-on-surface">WEBM</span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Transcript correction</p>
                    <textarea
                      value={voiceRecordingTranscriptOverride}
                      onChange={(event) => setVoiceRecordingTranscriptOverride(event.target.value)}
                      disabled={listening || uploadingRecording}
                      placeholder="Optional: paste or correct the transcript here if the recording is hard to hear or automatic transcription is unavailable."
                      className="min-h-[180px] w-full resize-none border border-outline-variant/25 bg-surface-container-low px-4 py-4 text-sm leading-relaxed text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary"
                    />
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      This gives you a direct fallback for saved voicemail files, even if live browser listening is unreliable.
                    </p>
                  </div>
                </div>

                <div className="ghost-border bg-surface-container-lowest/55 p-5 sm:p-6">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Selected recording</p>
                  {voiceRecordingFile ? (
                    <div className="mt-5 space-y-4">
                      <div className="ghost-border bg-surface-container-low p-4">
                        <p className="break-all text-sm font-semibold leading-relaxed text-on-surface">{voiceRecordingFile.name}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="ghost-border bg-surface-container-low p-4">
                          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Type</p>
                          <p className="mt-2 text-sm text-on-surface">{voiceRecordingFile.type || "Unknown"}</p>
                        </div>
                        <div className="ghost-border bg-surface-container-low p-4">
                          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Size</p>
                          <p className="mt-2 text-sm text-on-surface">{formatFileSize(voiceRecordingFile.size)}</p>
                        </div>
                        <div className="ghost-border bg-surface-container-low p-4">
                              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Transcript mode</p>
                          <p className="mt-2 text-sm text-on-surface">
                            {voiceRecordingTranscriptOverride.trim() ? "Manual transcript ready" : "Automatic transcription if available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 ghost-border bg-surface-container-low p-5 text-sm leading-relaxed text-on-surface-variant">
                      Choose an audio or video recording to analyze it directly instead of replaying it through speakerphone.
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : null}

            {statusMessage ? (
              <div className="ghost-border border-secondary/30 bg-secondary/10 p-5 text-sm leading-relaxed text-secondary">
                {statusMessage}
              </div>
            ) : null}

            {error ? (
              <div className="ghost-border border-[#ffb4ab]/30 bg-[#93000a]/15 p-5 text-sm leading-relaxed text-[#ffdad6]">
                {error}
              </div>
            ) : null}
          </section>

          <section className="grid gap-5 animate-fade-up lg:gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]" style={{ animationDelay: "120ms" }}>
            <div className="ghost-border bg-surface-container-low p-5 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{evidenceEyebrow}</p>
                  <h2 className="mt-3 font-headline text-2xl font-bold text-vellum">{evidenceTitle}</h2>
                  {result?.voiceAnalysis?.sourceFileName ? (
                    <p className="mt-3 max-w-xl break-all text-xs leading-relaxed text-on-surface-variant">
                      {result.voiceAnalysis.sourceFileName}
                      {result.voiceAnalysis.sourceFileSize ? ` • ${formatFileSize(result.voiceAnalysis.sourceFileSize)}` : ""}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`min-w-[5.5rem] text-right font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary transition-opacity sm:min-w-[6.5rem] ${
                    transcriptStatusLabel ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {transcriptStatusLabel || "Standby"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {renderedTranscript.length > 0 ? (
                  renderedTranscript.map((segment, index) => (
                    <div key={`${segment.timestamp ?? "segment"}-${index}`} className="ghost-border bg-surface-container-lowest/55 p-4">
                      <p className="text-sm leading-relaxed text-on-surface">{segment.text}</p>
                    </div>
                  ))
                ) : interimTranscript ? (
                  <div className="border border-dashed border-secondary/35 bg-primary-container/20 p-4">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Listening Now</p>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{interimTranscript}</p>
                  </div>
                ) : (
                  <div className="ghost-border bg-surface-container-lowest/55 p-5 text-sm leading-relaxed text-on-surface-variant">
                    {voiceInputMode === "uploaded_voicemail"
                      ? "Transcript segments from the uploaded voicemail will appear here after CyberCoach finishes the recording analysis."
                      : "Finalized speech segments will appear here once the browser starts recognizing the call."}
                  </div>
                )}

                {interimTranscript && renderedTranscript.length > 0 ? (
                  <div className="border border-dashed border-secondary/35 bg-primary-container/20 p-4">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Listening Now</p>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{interimTranscript}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <section className="ghost-border bg-surface-container-low p-5 sm:p-6">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Immediate warnings</p>
                <h3 className="mt-3 font-headline text-2xl font-bold text-vellum">What feels off right now</h3>
                <div className="mt-5 space-y-3">
                  {liveWarnings.length > 0 ? (
                    liveWarnings.map((warning) => (
                      <div key={warning} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface">
                        {warning}
                      </div>
                    ))
                  ) : (
                    <div className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                      Once CyberCoach has enough transcript, this panel will surface the most important live warning signs first.
                    </div>
                  )}
                </div>
              </section>

              <section className="ghost-border bg-primary-container/35 p-5 sm:p-6">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Challenge Questions</p>
                <h3 className="mt-3 font-headline text-2xl font-bold text-vellum">Use these to verify the caller</h3>
                <div className="mt-5 space-y-3">
                  {(challengeQuestions.length > 0 ? challengeQuestions : [
                    "Ask them to wait while you call back using a number you already trust.",
                    "Ask for one detail only the real person or institution should know."
                  ]).map((question) => (
                    <div key={question} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface">
                      {question}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <div
            ref={resultsSectionRef}
            className={`scroll-mt-28 border border-transparent transition-all duration-500 ${resultSpotlightActive && resultsSectionInView ? "scan-results-spotlight" : ""}`}
          >
            {result ? (
              <ScanResults
                result={result}
                loading={stopping}
                onCopyReport={handleCopyReport}
                onDownloadReport={handleDownloadReport}
                reportBusy={reportBusy}
                notice={listening ? "Live call guidance is updating while the listener runs. Finalize the session when you want a saved report." : null}
                showDecisionPanels={false}
              />
            ) : showLoadingResultShell ? (
              <VoicePendingState mode={analysisMode === "upload" ? "upload" : "live"} />
            ) : (
              <section className="ghost-border animate-fade-up bg-surface-container-low p-5 sm:p-6 lg:p-8" style={{ animationDelay: "200ms" }}>
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Pending risk summary</p>
                <h3 className="mt-3 font-headline text-2xl font-bold text-vellum">Call results will appear here</h3>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
                  As finalized speech arrives, or once an uploaded recording finishes transcription, CyberCoach will turn the call into a plain-language risk summary, safer next steps, key findings, technical evidence, and report actions.
                </p>
              </section>
            )}
          </div>

          {result ? (
            <section className="ghost-border bg-surface-container-low p-5 sm:p-6 xl:hidden">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                Transcript-first review
              </p>
              <h3 className="mt-3 font-headline text-2xl font-bold text-vellum">AI review summary</h3>
              <div className="mt-5 space-y-4">
                <div className="ghost-border bg-surface-container-lowest/55 p-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {voiceAiReview.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface">{voiceAiReview.summary}</p>
                </div>

                {result.voiceAnalysis?.liveAiConfidence ? (
                  <div className="ghost-border bg-surface-container-lowest/55 p-4">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Confidence band</p>
                    <p className="mt-2 text-sm font-semibold text-vellum">{result.voiceAnalysis.liveAiConfidence}</p>
                  </div>
                ) : null}

                {result.voiceAnalysis?.liveAiReasons.length ? (
                  <div className="space-y-3">
                    {result.voiceAnalysis.liveAiReasons.map((reason) => (
                      <div key={reason} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                        {reason}
                      </div>
                    ))}
                  </div>
                ) : null}

                {result.voiceAnalysis?.liveAiAction ? (
                  <div className="ghost-border bg-primary-container/25 p-4">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Suggested next step</p>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface">{result.voiceAnalysis.liveAiAction}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className="col-span-12 space-y-6 lg:space-y-8 xl:col-span-4">
          <VoiceScanRightRail
            result={result}
            mode={analysisMode}
            isListening={listening}
            elapsedSeconds={elapsedSeconds}
            transportMode={transportMode}
            historyItems={historyItems}
            voiceSignals={railVoiceSignals}
            onRestoreHistory={handleRestoreHistory}
            traceHighlightKey={traceHighlightKey}
          />
        </div>
      </main>

      {showSeeResultsCta && result ? (
        <button
          type="button"
          onClick={handleScrollToResults}
          className="voice-see-results-cta fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-secondary/30 bg-surface-container-low/95 px-5 py-3 text-left shadow-atmospheric backdrop-blur transition-colors hover:border-secondary/45 hover:bg-surface-container"
        >
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{resultsCtaEyebrow}</p>
            <p className="mt-1 text-sm font-semibold text-vellum">See Results</p>
          </div>
          <span aria-hidden="true" className="text-lg leading-none text-secondary">
            ↓
          </span>
        </button>
      ) : null}

      <ScanFooter />
    </>
  );
}
