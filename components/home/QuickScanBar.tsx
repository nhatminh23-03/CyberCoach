"use client";

import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type QuickScanBarProps = {
  initialValue?: string;
};

const MESSAGE_STORAGE_KEY = "cybercoach:quick-scan-input";
const URL_STORAGE_KEY = "cybercoach:url-scan-input";

function looksLikeQuickUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    // fall through to domain-like matching
  }

  if (/\s/.test(trimmed)) {
    return false;
  }

  const domainLikePattern =
    /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:[/:?#][^\s]*)?$/i;
  return domainLikePattern.test(trimmed);
}

export function QuickScanBar({ initialValue = "" }: QuickScanBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  const navigateToScan = useCallback(
    (mode?: string) => {
      const trimmed = value.trim();
      const directRoute =
        mode === "document"
          ? "/scan/document"
          : mode === "screenshot"
            ? "/scan/screenshot"
            : mode === "url"
              ? "/scan/url"
              : mode === "voice"
                ? "/scan/voice"
                : null;
      if (directRoute) {
        router.push(directRoute);
        return;
      }

      if (!trimmed) {
        router.push("/scan");
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(MESSAGE_STORAGE_KEY, trimmed);
      }

      const detectedMode = looksLikeQuickUrl(trimmed) ? "url" : "message";
      const params = new URLSearchParams();
      params.set("q", trimmed);
      params.set("autorun", "1");
      params.set("source", "home");

      if (typeof window !== "undefined" && detectedMode === "url") {
        window.sessionStorage.setItem(URL_STORAGE_KEY, trimmed);
      }

      const query = params.toString();
      router.push(detectedMode === "url" ? `/scan/url?${query}` : `/scan?${query}`);
    },
    [router, value]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      navigateToScan();
    },
    [navigateToScan]
  );

  return (
    <div className="max-w-4xl space-y-4 sm:space-y-5">
      <form onSubmit={handleSubmit} className="glass-panel ghost-border p-3 shadow-atmospheric sm:p-4">
        <label
          htmlFor="quick-scan"
          className="mb-3 block font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary"
        >
          Quick Verification
        </label>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="quick-scan"
            name="quick-scan"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Paste a suspicious message or link. CyberCoach will send it to the right scan."
            className="editorial-input min-h-[64px] text-base md:min-h-[70px] md:text-lg"
          />
          <button type="submit" className="editorial-button editorial-button-primary min-h-[64px] px-6 md:min-h-[70px] md:px-8">
            Quick Scan
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => navigateToScan("document")}
          className="editorial-link inline-flex items-center justify-between gap-3 text-on-surface-variant transition-colors hover:text-secondary sm:justify-start"
        >
          <span className="h-px w-8 bg-outline-variant/70" />
          Upload Document
        </button>
        <button
          type="button"
          onClick={() => navigateToScan("screenshot")}
          className="editorial-link inline-flex items-center justify-between gap-3 text-on-surface-variant transition-colors hover:text-secondary sm:justify-start"
        >
          <span className="h-px w-8 bg-outline-variant/70" />
          Scan Screenshot
        </button>
        <button
          type="button"
          onClick={() => navigateToScan("voice")}
          className="editorial-link inline-flex items-center justify-between gap-3 text-on-surface-variant transition-colors hover:text-secondary sm:justify-start"
        >
          <span className="h-px w-8 bg-outline-variant/70" />
          Open Call Guard
        </button>
      </div>
    </div>
  );
}
