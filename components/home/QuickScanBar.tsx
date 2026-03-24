"use client";

import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type QuickScanBarProps = {
  initialValue?: string;
};

const STORAGE_KEY = "cybercoach:quick-scan-input";

export function QuickScanBar({ initialValue = "" }: QuickScanBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  const navigateToScan = useCallback(
    (mode?: string) => {
      const trimmed = value.trim();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, trimmed);
      }

      const params = new URLSearchParams();
      if (trimmed) {
        params.set("q", trimmed);
      }
      if (mode) {
        params.set("mode", mode);
      }

      const query = params.toString();
      router.push(query ? `/scan?${query}` : "/scan");
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
    <div className="max-w-4xl space-y-5">
      <form onSubmit={handleSubmit} className="glass-panel ghost-border p-3 shadow-atmospheric">
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
            placeholder="Paste a link or message for a quick scan..."
            className="editorial-input min-h-[70px] text-base md:text-lg"
          />
          <button type="submit" className="editorial-button editorial-button-primary min-h-[70px] px-8">
            Quick Scan
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => navigateToScan("document")}
          className="editorial-link inline-flex items-center gap-3 text-on-surface-variant transition-colors hover:text-secondary"
        >
          <span className="h-px w-8 bg-outline-variant/70" />
          Upload Document
        </button>
        <button
          type="button"
          onClick={() => navigateToScan("screenshot")}
          className="editorial-link inline-flex items-center gap-3 text-on-surface-variant transition-colors hover:text-secondary"
        >
          <span className="h-px w-8 bg-outline-variant/70" />
          Scan Screenshot
        </button>
      </div>
    </div>
  );
}
