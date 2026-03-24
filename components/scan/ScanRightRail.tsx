import type { IntelFeedItem, ScanHistoryItem, SupportedLocale } from "@/lib/scan";

type ScanRightRailProps = {
  historyItems: ScanHistoryItem[];
  intelFeedItems: IntelFeedItem[];
  locale: SupportedLocale;
};

function RadarIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-28 w-28 text-outline-variant">
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="8" />
      <circle cx="60" cy="60" r="24" stroke="currentColor" strokeWidth="8" />
      <path d="M60 16a44 44 0 0 1 44 44" stroke="currentColor" strokeWidth="8" />
      <path d="M60 52a8 8 0 1 1 0 16" stroke="currentColor" strokeWidth="8" />
    </svg>
  );
}

function relativeTimeLabel(isoDate: string, locale: SupportedLocale) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return locale === "en" ? "Live session" : "Live session";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return locale === "en" ? "Just now" : "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function scanTypeLabel(scanType: string) {
  if (scanType === "message") {
    return "Message Scan";
  }
  if (scanType === "url") {
    return "URL Scan";
  }
  if (scanType === "screenshot") {
    return "Screenshot Scan";
  }
  return "Analysis";
}

export function ScanRightRail({ historyItems, intelFeedItems, locale }: ScanRightRailProps) {
  const recentItems = historyItems.slice(0, 3);

  return (
    <aside className="space-y-12">
      <section className="space-y-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-end justify-between border-b border-outline-variant/20 pb-4">
          <h2 className="font-headline text-lg font-bold uppercase tracking-tight">Recent Analysis</h2>
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-secondary">View All</span>
        </div>

        <div className="space-y-4">
          {recentItems.length > 0 ? (
            recentItems.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer border-l-2 border-transparent bg-surface-container-low p-4 transition-colors hover:border-secondary hover:bg-surface-container-high"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                    {scanTypeLabel(item.scanType)}
                  </span>
                  <span
                    className={`font-label text-[10px] font-bold uppercase ${
                      item.riskLabel === "High Risk"
                        ? "text-[#ffb4ab]"
                        : item.riskLabel === "Suspicious"
                          ? "text-secondary"
                          : "text-[#d6e3ff]"
                    }`}
                  >
                    {item.riskLabelDisplay}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-on-surface/80">"{item.snippet}"</p>
                <div className="mt-3 font-label text-[9px] uppercase tracking-wider text-outline">
                  {relativeTimeLabel(item.createdAt, locale)} • Live session
                </div>
              </div>
            ))
          ) : (
            <div className="ghost-border bg-surface-container-low p-5">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Awaiting First Scan</p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                Recent analyses will appear here after your first live message scan in this backend session.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        className="animate-fade-up relative overflow-hidden bg-primary-container/40 p-8 space-y-8"
        style={{ animationDelay: "140ms" }}
      >
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <RadarIcon />
        </div>

        <div className="space-y-2">
          <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-secondary">Global Intel Feed</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
            Real-time Node Monitoring
          </p>
        </div>

        <div className="space-y-6">
          {intelFeedItems.length > 0 ? (
            intelFeedItems.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className={`h-12 w-1 ${item.accent === "secondary" ? "bg-secondary" : "bg-outline-variant"}`} />
                <div>
                  <span className="font-label text-[10px] font-bold uppercase text-on-primary-container">{item.title}</span>
                  <p className="mt-1 text-sm font-medium leading-tight text-on-surface">{item.copy}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex gap-4">
              <div className="h-12 w-1 bg-outline-variant" />
              <div>
                <span className="font-label text-[10px] font-bold uppercase text-on-primary-container">Intel Offline</span>
                <p className="mt-1 text-sm font-medium leading-tight text-on-surface">
                  The global feed is temporarily unavailable. Curated and live telemetry entries will appear here when the backend is reachable.
                </p>
              </div>
            </div>
          )}
        </div>

        <button className="editorial-button w-full py-3 text-[10px]">Full Threat Report</button>
      </section>
    </aside>
  );
}
