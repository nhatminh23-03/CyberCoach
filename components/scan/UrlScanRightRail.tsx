"use client";

import type { MessageScanResult } from "@/lib/scan";

type UrlScanRightRailProps = {
  result: MessageScanResult | null;
  loading: boolean;
  onDownloadPrimaryReport: () => Promise<void>;
};

const placeholderFlags = [
  {
    title: "Homograph Trap",
    detail: "Misspelled brand names and character substitutions"
  },
  {
    title: "Non-Secure Protocol",
    detail: "Missing HTTPS or weak trust signals"
  },
  {
    title: "Phishing Database Hit",
    detail: "Known malicious destination matches"
  },
  {
    title: "Nested Subdomains",
    detail: "Excessive URL complexity and layered redirects"
  }
];

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17" />
      <path d="M3.5 15h17" />
      <path d="M12 3c2.7 2.7 4.2 5.7 4.2 9S14.7 18.3 12 21" />
      <path d="M12 3C9.3 5.7 7.8 8.7 7.8 12s1.5 6.3 4.2 9" />
    </svg>
  );
}

export function UrlScanRightRail({ result, loading, onDownloadPrimaryReport }: UrlScanRightRailProps) {
  const redFlags = result?.technicalDetails?.length ? result.technicalDetails.slice(0, 4) : [];

  return (
    <aside className="space-y-12">
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-[32px] font-bold tracking-tight text-vellum">Global Threat Map</h2>
          <span className="text-secondary">
            <GlobeIcon />
          </span>
        </div>

        <div className="overflow-hidden border border-outline-variant/20 bg-surface-container-high">
          <div className="relative aspect-[1.45] bg-[radial-gradient(circle_at_20%_20%,rgba(225,194,144,0.12),transparent_24%),radial-gradient(circle_at_78%_30%,rgba(185,199,228,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-25" />
            <div className="absolute left-[16%] top-[34%] h-2 w-2 bg-secondary shadow-[0_0_18px_rgba(225,194,144,0.5)]" />
            <div className="absolute left-[49%] top-[28%] h-2 w-2 bg-[#ffb4ab] shadow-[0_0_18px_rgba(255,180,171,0.45)]" />
            <div className="absolute left-[68%] top-[52%] h-2 w-2 bg-primary shadow-[0_0_18px_rgba(185,199,228,0.35)]" />
            <div className="absolute inset-x-6 top-6 flex items-center gap-2 border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
              <span className="h-2 w-2 bg-[#ffb4ab]" />
              <span className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                {loading ? "Inspecting endpoint..." : "Global telemetry online"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] font-label uppercase tracking-[0.18em] text-on-primary-container">
          <span>Region: NA/WEST</span>
          <span className="text-secondary">Latency: 14ms</span>
        </div>
      </section>

      <section className="animate-fade-up space-y-6" style={{ animationDelay: "180ms" }}>
        <h2 className="font-headline text-[32px] font-bold tracking-tight text-vellum">URL Red Flags</h2>

        <div className="space-y-4">
          {(redFlags.length > 0 ? redFlags : placeholderFlags).map((item) => {
            const title = "label" in item ? item.label : item.title;
            const detail = "detail" in item ? item.detail : "";
            const critical = "severity" in item ? item.severity === "high" : title === "Homograph Trap";

            return (
              <div
                key={`${title}-${detail}`}
                className={`flex items-start gap-4 border-l-2 bg-surface-container-low p-4 ${
                  critical ? "border-[#ffb4ab]" : "border-outline-variant"
                }`}
              >
                <div className={`mt-1 h-2.5 w-2.5 ${critical ? "bg-[#ffb4ab]" : "bg-secondary"}`} />
                <div>
                  <p className="font-headline text-sm font-bold tracking-tight text-vellum">{title}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void onDownloadPrimaryReport()}
          disabled={!result}
          className={`editorial-button w-full justify-center py-4 text-[10px] ${
            !result ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          Download Full Report
        </button>
      </section>
    </aside>
  );
}
