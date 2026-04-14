"use client";

import { useEffect, useMemo, useState } from "react";

import { LockIcon, ShieldCheckIcon } from "@/components/home/icons";

type HomeCapabilitiesResponse = {
  screenshot_analysis_available?: boolean;
  voice_live_browser_mode?: boolean;
  voice_recording_upload_available?: boolean;
};

type HomeHistoryResponse = {
  items?: unknown[];
};

type StatusState = {
  loading: boolean;
  backendReachable: boolean;
  readyModes: number;
  historyCount: number;
};

const TOTAL_MODES = 5;

export function HomeStatusCard() {
  const [status, setStatus] = useState<StatusState>({
    loading: true,
    backendReachable: false,
    readyModes: 0,
    historyCount: 0
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const [capabilitiesResponse, historyResponse] = await Promise.all([
          fetch("/api/scan/capabilities", { cache: "no-store" }),
          fetch("/api/scan/history", { cache: "no-store" })
        ]);

        let readyModes = 0;
        if (capabilitiesResponse.ok) {
          const capabilities = (await capabilitiesResponse.json()) as HomeCapabilitiesResponse;
          const screenshotReady = Boolean(capabilities.screenshot_analysis_available);
          const voiceReady = Boolean(
            capabilities.voice_live_browser_mode || capabilities.voice_recording_upload_available
          );

          readyModes = 3;
          if (screenshotReady) {
            readyModes += 1;
          }
          if (voiceReady) {
            readyModes += 1;
          }
        }

        let historyCount = 0;
        if (historyResponse.ok) {
          const history = (await historyResponse.json()) as HomeHistoryResponse;
          historyCount = Array.isArray(history.items) ? history.items.length : 0;
        }

        if (!cancelled) {
          setStatus({
            loading: false,
            backendReachable: capabilitiesResponse.ok,
            readyModes: capabilitiesResponse.ok ? readyModes : 0,
            historyCount
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            loading: false,
            backendReachable: false,
            readyModes: 0,
            historyCount: 0
          });
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (status.loading) {
      return "CHECKING";
    }
    if (!status.backendReachable) {
      return "OFFLINE";
    }
    return status.readyModes >= 4 ? "READY" : "LIMITED";
  }, [status]);

  const statusDetail = status.backendReachable ? "Backend connected" : "Backend unavailable";
  const progressWidth = status.loading ? "36%" : `${Math.max(0, Math.min(100, (status.readyModes / TOTAL_MODES) * 100))}%`;
  const privacyCopy =
    status.historyCount > 0
      ? `New scans start with Privacy Mode on. This session currently has ${status.historyCount} recent result${status.historyCount === 1 ? "" : "s"} available to reopen.`
      : "New scans start with Privacy Mode on. Recent results stay available only for this backend session.";

  return (
    <div className="glass-panel ghost-border relative w-full max-w-none space-y-6 p-6 shadow-atmospheric transition-transform duration-500 hover:-translate-y-1 sm:max-w-sm sm:space-y-8 sm:p-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">
            Scan readiness
          </p>
          <p className="font-headline text-2xl font-bold tracking-tight text-vellum">{statusLabel}</p>
        </div>
        <ShieldCheckIcon className="h-8 w-8 text-secondary sm:h-9 sm:w-9" />
      </div>

      <div className="space-y-5 border-t border-outline-variant/30 pt-6 sm:space-y-6 sm:pt-8">
        <div className="flex items-center gap-4">
          <div
            className={`h-2 w-2 ${status.backendReachable ? "bg-secondary" : "bg-outline"} ${
              status.backendReachable ? "animate-pulse" : ""
            }`}
          />
          <span className="font-label text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            {status.loading ? "Checking services" : statusDetail}
          </span>
        </div>

        <div className="space-y-2">
          <div className="h-1 w-full bg-surface-container-highest">
            <div className="h-full bg-secondary transition-all duration-500" style={{ width: progressWidth }} />
          </div>
          <div className="flex justify-between font-label text-[9px] uppercase tracking-[0.16em] text-outline">
            <span>Modes available</span>
            <span>{status.loading ? "Checking..." : `${status.readyModes} of ${TOTAL_MODES} ready`}</span>
          </div>
        </div>
      </div>

      <div className="ghost-border bg-primary-container/80 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <LockIcon className="h-5 w-5 text-secondary" />
          <div>
            <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
              Privacy defaults
            </p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">{privacyCopy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
