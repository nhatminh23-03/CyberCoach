"use client";

import { useEffect, useRef, useState } from "react";

import type { MessageScanResult } from "@/lib/scan";

function buildResultSignature(result: MessageScanResult) {
  return [result.riskLabel, result.riskScore, result.likelyScamPattern, result.summary].join("::");
}

function buildTraceSignature(result: MessageScanResult) {
  return [
    result.decisionSource,
    result.consensus?.status ?? "",
    result.modelRuns.map((run) => `${run.slot}:${run.model}:${run.risk_level}:${run.confidence ?? ""}`).join("|"),
    result.technicalDetails.map((detail) => `${detail.label}:${detail.severity}:${detail.detail}`).join("|"),
    result.modelErrors.map((error) => `${error.model}:${error.error}`).join("|")
  ].join("::");
}

function isElementBelowFold(node: HTMLElement | null) {
  if (typeof window === "undefined" || !node) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  return rect.top > window.innerHeight - 120;
}

export function useScanResultDiscovery({
  result,
  loading
}: {
  result: MessageScanResult | null;
  loading: boolean;
}) {
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const previousResultSignatureRef = useRef<string | null>(null);
  const previousTraceSignatureRef = useRef<string | null>(null);
  const [showSeeResultsCta, setShowSeeResultsCta] = useState(false);
  const [resultsSectionInView, setResultsSectionInView] = useState(false);
  const [resultHighlightKey, setResultHighlightKey] = useState(0);
  const [resultSpotlightActive, setResultSpotlightActive] = useState(false);
  const [traceHighlightKey, setTraceHighlightKey] = useState(0);

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
  }, [result, loading]);

  useEffect(() => {
    if (loading || !result || resultsSectionInView) {
      setShowSeeResultsCta(false);
    }
  }, [loading, result, resultsSectionInView]);

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
    if (loading) {
      return;
    }

    if (!result) {
      previousResultSignatureRef.current = null;
      previousTraceSignatureRef.current = null;
      setShowSeeResultsCta(false);
      return;
    }

    const nextResultSignature = buildResultSignature(result);
    const previousResultSignature = previousResultSignatureRef.current;
    const firstResult = previousResultSignature === null;
    const resultChanged = previousResultSignature !== null && previousResultSignature !== nextResultSignature;
    previousResultSignatureRef.current = nextResultSignature;

    if (firstResult || resultChanged) {
      if (resultsSectionInView) {
        setResultHighlightKey((current) => current + 1);
      } else if (isElementBelowFold(resultsSectionRef.current)) {
        setShowSeeResultsCta(true);
      }
    }

    const nextTraceSignature = buildTraceSignature(result);
    const previousTraceSignature = previousTraceSignatureRef.current;
    if (nextTraceSignature && nextTraceSignature !== previousTraceSignature) {
      previousTraceSignatureRef.current = nextTraceSignature;
      setTraceHighlightKey((current) => current + 1);
    } else if (!nextTraceSignature) {
      previousTraceSignatureRef.current = null;
    }
  }, [loading, result, resultsSectionInView]);

  function scrollToResults() {
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setShowSeeResultsCta(false);
    setResultHighlightKey((current) => current + 1);
  }

  return {
    resultsSectionRef,
    showSeeResultsCta,
    scrollToResults,
    resultSpotlightActive: resultSpotlightActive && resultsSectionInView,
    traceHighlightKey
  };
}

export function ResultDiscoveryCta({
  eyebrow = "Analysis finished",
  label = "See Results",
  onClick
}: {
  eyebrow?: string;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="scan-see-results-cta fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-secondary/30 bg-surface-container-low/95 px-5 py-3 text-left shadow-atmospheric backdrop-blur transition-colors hover:border-secondary/45 hover:bg-surface-container"
    >
      <div>
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-vellum">{label}</p>
      </div>
      <span aria-hidden="true" className="text-lg leading-none text-secondary">
        ↓
      </span>
    </button>
  );
}
