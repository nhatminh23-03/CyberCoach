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
  if (scanType === "document") {
    return "Document Scan";
  }
  if (scanType === "voice") {
    return "Call Guard";
  }
  return "Analysis";
}

function intelSourceLabel(source: string) {
  if (source === "session") {
    return "Session telemetry";
  }
  if (source === "official") {
    return "Official public feed";
  }
  if (source === "curated") {
    return "Curated local feed";
  }
  return "Internal source";
}

function intelSectionTitle(source: string) {
  if (source === "session") {
    return "Live Session";
  }
  if (source === "official") {
    return "Official Sources";
  }
  if (source === "curated") {
    return "Curated Advisories";
  }
  return "Other Signals";
}

function intelAccentClasses(accent: IntelFeedItem["accent"]) {
  if (accent === "secondary") {
    return {
      rail: "bg-secondary",
      badge: "border-secondary/30 bg-secondary/10 text-secondary"
    };
  }

  return {
    rail: "bg-outline-variant",
    badge: "border-outline-variant/30 bg-surface-container-lowest/60 text-on-primary-container"
  };
}

function groupIntelFeed(items: IntelFeedItem[]) {
  return {
    session: items.filter((item) => item.source === "session"),
    official: items.filter((item) => item.source === "official"),
    curated: items.filter((item) => item.source === "curated"),
    other: items.filter((item) => item.source !== "session" && item.source !== "official" && item.source !== "curated")
  };
}

function referenceDomain(referenceUrl: string | null) {
  if (!referenceUrl) {
    return null;
  }
  try {
    return new URL(referenceUrl).hostname;
  } catch {
    return null;
  }
}

export function ScanRightRail({ historyItems, intelFeedItems, locale }: ScanRightRailProps) {
  const recentItems = historyItems.slice(0, 3);
  const groupedFeed = groupIntelFeed(intelFeedItems);
  const feedSections = [
    { key: "session", label: intelSectionTitle("session"), items: groupedFeed.session },
    { key: "official", label: intelSectionTitle("official"), items: groupedFeed.official },
    { key: "curated", label: intelSectionTitle("curated"), items: groupedFeed.curated },
    { key: "other", label: intelSectionTitle("other"), items: groupedFeed.other }
  ].filter((section) => section.items.length > 0);

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
                Recent analyses will appear here after your first live scan in this backend session.
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
          <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-secondary">Threat Intel Feed</h2>
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
            Curated Advisories + Live Session Telemetry
          </p>
        </div>

        <div className="border border-outline-variant/20 bg-surface-container-lowest/45 p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Feed Context</p>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            This panel blends official public advisories, local curated notes, and signals from your current backend session. Source labels, verification times, and references are shown when available.
          </p>
        </div>

        <div className="space-y-6">
          {feedSections.length > 0 ? (
            feedSections.map((section) => (
              <div key={section.key} className="space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{section.label}</p>
                  <span className="font-label text-[9px] uppercase tracking-[0.14em] text-outline">
                    {section.items.length} item{section.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-4">
                  {section.items.map((item) => {
                    const accent = intelAccentClasses(item.accent);
                    const domain = referenceDomain(item.referenceUrl);
                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className={`w-1 shrink-0 self-stretch ${accent.rail}`} />
                        <div className="min-w-0 flex-1 space-y-3 border border-outline-variant/20 bg-surface-container-lowest/45 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-on-primary-container">{item.title}</span>
                              <p className="font-label text-[10px] uppercase tracking-[0.14em] text-outline">
                                {item.category} • {relativeTimeLabel(item.publishedAt, locale)}
                              </p>
                            </div>
                            <span className={`border px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] ${accent.badge}`}>
                              {intelSourceLabel(item.source)}
                            </span>
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-on-surface break-words [overflow-wrap:anywhere]">{item.copy}</p>
                          <div className="space-y-2 border-t border-outline-variant/15 pt-3">
                            <p className="font-label text-[10px] uppercase tracking-[0.14em] text-outline">
                              Publisher: {item.publisher}
                            </p>
                            {domain ? (
                              <p className="font-label text-[10px] uppercase tracking-[0.14em] text-outline">
                                Source domain: {domain}
                              </p>
                            ) : null}
                            <p className="font-label text-[10px] uppercase tracking-[0.14em] text-outline">
                              Last verified: {relativeTimeLabel(item.lastVerifiedAt, locale)}
                            </p>
                            {item.referenceUrl ? (
                              <a
                                href={item.referenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs font-semibold text-secondary transition-colors hover:text-vellum"
                              >
                                Reference source
                              </a>
                            ) : (
                              <p className="font-label text-[10px] uppercase tracking-[0.14em] text-outline">No external reference</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex gap-4">
              <div className="h-12 w-1 bg-outline-variant" />
              <div className="border border-outline-variant/20 bg-surface-container-lowest/45 p-4">
                <span className="font-label text-[10px] font-bold uppercase text-on-primary-container">Intel Offline</span>
                <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface">
                  The intel feed is temporarily unavailable. Curated local entries and session telemetry will appear here when the backend responds.
                </p>
              </div>
            </div>
          )}
        </div>

        <button className="editorial-button w-full py-3 text-[10px]">View Full Feed Context</button>
      </section>
    </aside>
  );
}
