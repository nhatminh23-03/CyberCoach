"use client";

import { useEffect, useMemo, useState } from "react";

import { LockIcon } from "@/components/home/icons";
import { DecisionSummaryPanel, ModelAssessmentsPanel, getDecisionPanelCopy } from "@/components/scan/DecisionPanels";
import { useHighlightOnFirstVisible } from "@/components/scan/useHighlightOnFirstVisible";
import { type DetailedScanHistoryItem, type MessageScanResult } from "@/lib/scan";

type VoiceScanRightRailProps = {
  result: MessageScanResult | null;
  mode: "live" | "upload";
  isListening: boolean;
  elapsedSeconds: number;
  transportMode: "websocket" | "http" | null;
  historyItems: DetailedScanHistoryItem[];
  voiceSignals: Array<{ type: string; detail: string; severity: "high" | "medium" | "low" }>;
  onRestoreHistory: (item: DetailedScanHistoryItem) => void;
  traceHighlightKey: number;
};

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function liveAiStateCopy(result: MessageScanResult | null) {
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

export function VoiceScanRightRail({
  result,
  mode,
  isListening,
  elapsedSeconds,
  transportMode,
  historyItems,
  voiceSignals,
  onRestoreHistory,
  traceHighlightKey
}: VoiceScanRightRailProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [traceAttentionActive, setTraceAttentionActive] = useState(false);
  const recentItems = historyItems.slice(0, 6);
  const activeWarnings = result?.voiceAnalysis?.liveWarnings ?? [];
  const limitations = result?.voiceAnalysis?.limitations ?? [];
  const liveAi = useMemo(() => liveAiStateCopy(result), [result]);
  const decisionCopy = result ? getDecisionPanelCopy(result.locale) : null;
  const voice = result?.voiceAnalysis;
  const shouldShowFinalDecisionPanels = Boolean(
    result &&
      voice &&
      voice.analysisState === "final" &&
      (result.modelRuns.length > 0 || voice.liveAiState === "final_ai_reviewed")
  );
  const sourceFileName = result?.voiceAnalysis?.sourceFileName ?? null;
  const sourceFileSize = result?.voiceAnalysis?.sourceFileSize ?? null;
  const transcriptSource = result?.voiceAnalysis?.transcriptionSource ?? null;
  const transcriptModel = result?.voiceAnalysis?.transcriptionModel ?? null;
  const statusTitle = mode === "live" ? "Session status" : "Upload status";
  const statusEyebrow = mode === "live" ? "Current session" : "Recording review";
  const statusLabel = mode === "live" ? (isListening ? "Listening live" : "Standing by") : sourceFileName ? "Recording ready" : "Waiting for file";
  const statusDetail =
    mode === "live"
      ? transportMode === "websocket"
        ? "Streaming updates are active."
        : transportMode === "http"
          ? "Fallback updates are active."
          : "Ready for live listening or recording upload."
      : result?.voiceAnalysis?.analysisState === "final"
        ? "Your recording review is ready."
        : sourceFileName
          ? "CyberCoach can transcribe and analyze this recording directly."
          : "Choose a saved voicemail or suspicious call recording to analyze it directly.";
  const aiTraceSessionKey = result
    ? [result.raw.metadata?.history_id ?? "", result.riskScore, result.summary, result.likelyScamPattern, "voice-ai-trace"].join("::")
    : null;
  const { ref: aiTraceRef, activeClassName: aiTraceHighlightClass } = useHighlightOnFirstVisible({
    sessionKey: aiTraceSessionKey,
    enabled: Boolean(result) && mode === "upload"
  });

  useEffect(() => {
    if (typeof window === "undefined" || traceHighlightKey === 0) {
      return;
    }

    setTraceAttentionActive(true);
    const timeout = window.setTimeout(() => {
      setTraceAttentionActive(false);
    }, 1700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [traceHighlightKey]);

  return (
    <aside className="space-y-10">
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "90ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">{statusTitle}</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            {statusEyebrow}
          </p>
        </div>

        <div className="ghost-border bg-surface-container-low p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Status</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{statusLabel}</p>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{statusDetail}</p>
            </div>
            <div
              className={`h-3 w-3 rounded-full ${
                mode === "live"
                  ? isListening
                    ? "bg-secondary shadow-[0_0_18px_rgba(229,198,146,0.7)]"
                    : "bg-outline"
                  : sourceFileName
                    ? "bg-secondary shadow-[0_0_18px_rgba(229,198,146,0.7)]"
                    : "bg-outline"
              }`}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {mode === "live" ? "Elapsed" : "Transcript"}
              </p>
              <p className="mt-2 text-xl font-bold text-vellum">
                {mode === "live" ? formatElapsed(elapsedSeconds) : `${result?.voiceAnalysis?.transcriptWordCount ?? 0} words`}
              </p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {mode === "live" ? "Warnings" : "Warnings"}
              </p>
              <p className="mt-2 text-xl font-bold text-vellum">{activeWarnings.length}</p>
            </div>
          </div>
        </div>
      </section>

      {mode === "upload" ? (
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Recording details</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            Upload context
          </p>
        </div>

        <div className="space-y-4">
          <div className="ghost-border bg-surface-container-low p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Selected file</p>
            <p className="mt-2 text-sm font-semibold text-vellum break-words [overflow-wrap:anywhere]">
              {sourceFileName ?? "Choose a recording to review it directly."}
            </p>
            {sourceFileSize ? (
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{(sourceFileSize / 1024 / 1024).toFixed(1)} MB</p>
            ) : null}
          </div>
          <div className="ghost-border bg-surface-container-low p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Transcript source</p>
            <p className="mt-2 text-sm font-semibold text-vellum">{transcriptSource ?? "Waiting for recording analysis"}</p>
            {transcriptModel ? (
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{transcriptModel}</p>
            ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {mode === "live" ? (
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Supportive audio cues</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            Extra context only
          </p>
        </div>

        <div className="space-y-4">
          {voiceSignals.length > 0 ? (
            voiceSignals.map((signal) => (
              <div key={`${signal.type}-${signal.detail}`} className="ghost-border bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {signal.type.replace(/_/g, " ")}
                  </p>
                  <p className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">{signal.severity}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{signal.detail}</p>
              </div>
            ))
          ) : (
            <div className="ghost-border bg-surface-container-low p-5 text-sm leading-relaxed text-on-surface-variant">
              No supportive voice-pattern cues have been raised yet.
            </div>
          )}
        </div>
      </section>
      ) : null}

      <section
        ref={aiTraceRef}
        className={`scan-card-highlightable hidden space-y-6 xl:block ${aiTraceHighlightClass} animate-fade-up`}
        style={{ animationDelay: "180ms" }}
      >
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">AI review summary</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            Transcript-first review
          </p>
        </div>

        <div className={`ghost-border bg-surface-container-low p-6 ${traceAttentionActive ? "voice-trace-spotlight" : ""}`}>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{liveAi.title}</p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface">{liveAi.summary}</p>

          {voice?.liveAiConfidence ? (
            <div className="mt-4 ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Confidence band</p>
              <p className="mt-2 text-sm font-semibold text-vellum">{voice.liveAiConfidence}</p>
            </div>
          ) : null}

          {voice?.liveAiReasons.length ? (
            <div className="mt-4 space-y-3">
              {voice.liveAiReasons.map((reason) => (
                <div key={reason} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                  {reason}
                </div>
              ))}
            </div>
          ) : null}

          {voice?.liveAiAction ? (
            <div className="mt-4 ghost-border bg-primary-container/25 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Suggested next step</p>
              <p className="mt-2 text-sm leading-relaxed text-on-surface">{voice.liveAiAction}</p>
            </div>
          ) : null}
        </div>

        {shouldShowFinalDecisionPanels && result && decisionCopy ? (
          <div className="space-y-4">
            <div className={`ghost-border bg-surface-container-low p-6 ${traceAttentionActive ? "voice-trace-spotlight" : ""}`}>
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
                {decisionCopy.titles.consensusEngine}
              </p>
              <h3 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum">
                {decisionCopy.titles.decisionTrace}
              </h3>
              <div className="mt-6">
                <DecisionSummaryPanel result={result} />
              </div>
            </div>

            <div className={`ghost-border bg-surface-container-low p-6 ${traceAttentionActive ? "voice-trace-spotlight" : ""}`}>
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
                {decisionCopy.titles.crossModelReview}
              </p>
              <h3 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum">
                {decisionCopy.titles.modelAssessments}
              </h3>
              <div className="mt-6">
                <ModelAssessmentsPanel result={result} />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="animate-fade-up space-y-6" style={{ animationDelay: "210ms" }}>
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Important limits</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
            What to keep in mind
          </p>
        </div>

        <div className="ghost-border bg-surface-container-low p-6">
          <div className="flex items-start gap-4">
            <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
            <p className="text-sm leading-relaxed text-on-surface">
              CyberCoach treats suspicious voice-pattern hints as supporting context only. The strongest signals still come from scam pressure, impersonation behavior, and risky requests in the transcript.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {limitations.length > 0 ? (
              limitations.map((item) => (
                <div key={item} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                  {item}
                </div>
              ))
            ) : (
              <div className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface-variant">
                Live transcript quality still depends on browser speech recognition, speakerphone volume, and room noise.
              </div>
            )}
          </div>
        </div>
      </section>

      {recentItems.length > 0 ? (
        <section className="animate-fade-up space-y-6" style={{ animationDelay: "240ms" }}>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Session history</h2>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
              Finalized call summaries
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between border border-outline-variant/30 bg-surface-container-low px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container"
            >
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                Current Session
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {historyOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            <div className={`grid overflow-hidden transition-all duration-500 ${historyOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 space-y-3">
                {recentItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onRestoreHistory(item)}
                    className="w-full border border-outline-variant/20 bg-surface-container-low px-4 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                          {item.riskLabelDisplay}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{item.snippet}</p>
                      </div>
                      <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">
                        Restore
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
