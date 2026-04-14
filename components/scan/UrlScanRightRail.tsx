"use client";

import { useState } from "react";

import { useHighlightOnFirstVisible } from "@/components/scan/useHighlightOnFirstVisible";
import { getScanLocaleCopy, type DetailedScanHistoryItem, type MessageScanResult, type SupportedLocale } from "@/lib/scan";

type UrlScanRightRailProps = {
  result: MessageScanResult | null;
  loading: boolean;
  onDownloadPrimaryReport: () => Promise<void>;
  historyItems: DetailedScanHistoryItem[];
  onRestoreHistory: (item: DetailedScanHistoryItem) => void;
};

type RailCopy = {
  surfaceMap: string;
  plainLanguageSummary: string;
  scanDerivedTelemetry: string;
  inspectingEndpoint: string;
  telemetryReady: string;
  waitingForScan: string;
  strongestSignal: string;
  strongestSignalIdle: string;
  strongestSignalPrefix: string;
  structuralMeaning: string;
  reputationMeaning: string;
  destinationMeaning: string;
  host: string;
  signals: string;
  redFlags: string;
  noRedFlags: string;
  noRedFlagsDetail: string;
  reportButton: string;
  surfaceBuckets: {
    structural: string;
    reputation: string;
    destination: string;
  };
};

function getUrlRailCopy(locale: SupportedLocale): RailCopy {
  if (locale === "vi") {
    return {
      surfaceMap: "Ban Do Be Mat Rui Ro",
      plainLanguageSummary: "Noi URL hien tai co ve rui ro",
      scanDerivedTelemetry: "Tin hieu duoc tao tu ket qua quet hien tai",
      inspectingEndpoint: "Dang kiem tra diem den...",
      telemetryReady: "Tin hieu duoc tong hop tu URL hien tai",
      waitingForScan: "Cho ket qua quet URL",
      strongestSignal: "Tin hieu manh nhat",
      strongestSignalIdle: "Thuc hien quet de xem lop rui ro nao noi bat nhat.",
      strongestSignalPrefix: "Phan lon rui ro hien tai den tu",
      structuralMeaning: "Ban than lien ket co dau hieu bat thuong hoac giau y do lua dao.",
      reputationMeaning: "Tin hieu tu danh tieng ben ngoai va co so du lieu phishing.",
      destinationMeaning: "Dieu gi xay ra tren trang dich neu mo lien ket.",
      host: "Ten mien",
      signals: "Tin hieu",
      redFlags: "Dau Hieu URL",
      noRedFlags: "Chua co dau hieu URL manh",
      noRedFlagsDetail: "Lan quet nay khong kich hoat quy tac heuristic URL nao. Trang dich van nen duoc xac minh bang ngu canh ban nhan duoc lien ket nay.",
      reportButton: "Tai Bao Cao Day Du",
      surfaceBuckets: {
        structural: "Cau Truc",
        reputation: "Danh Tieng",
        destination: "Trang Dich"
      }
    };
  }

  if (locale === "es") {
    return {
      surfaceMap: "Mapa de Superficie de Riesgo",
      plainLanguageSummary: "Donde esta URL parece riesgosa",
      scanDerivedTelemetry: "Telemetria derivada del analisis actual",
      inspectingEndpoint: "Inspeccionando destino...",
      telemetryReady: "Senales resumidas desde esta URL",
      waitingForScan: "Esperando un analisis de URL",
      strongestSignal: "Senal mas fuerte",
      strongestSignalIdle: "Ejecuta un analisis para ver que capa destaca mas.",
      strongestSignalPrefix: "La mayor parte del riesgo actual proviene de",
      structuralMeaning: "El enlace en si parece inusual o enganoso.",
      reputationMeaning: "Senales externas de confianza y bases de phishing.",
      destinationMeaning: "Lo que hace la pagina de destino si se abre.",
      host: "Host",
      signals: "Senales",
      redFlags: "Alertas de URL",
      noRedFlags: "Sin alertas fuertes de URL",
      noRedFlagsDetail: "Este analisis no activo reglas heuristicas fuertes para la URL. Aun asi, valida el contexto antes de abrir un enlace inesperado.",
      reportButton: "Descargar Informe Completo",
      surfaceBuckets: {
        structural: "Estructural",
        reputation: "Reputacion",
        destination: "Destino"
      }
    };
  }

  if (locale === "zh") {
    return {
      surfaceMap: "风险表面图",
      plainLanguageSummary: "当前 URL 的风险主要来自哪里",
      scanDerivedTelemetry: "基于当前扫描结果生成的遥测",
      inspectingEndpoint: "正在检查目标...",
      telemetryReady: "当前 URL 的信号摘要",
      waitingForScan: "等待 URL 扫描结果",
      strongestSignal: "最强信号",
      strongestSignalIdle: "运行扫描后即可看到最突出的风险层。",
      strongestSignalPrefix: "当前大部分风险来自",
      structuralMeaning: "链接本身看起来异常或具有欺骗性。",
      reputationMeaning: "外部信誉与钓鱼数据库信号。",
      destinationMeaning: "如果打开链接，目标页面会做什么。",
      host: "主机",
      signals: "信号",
      redFlags: "URL 风险信号",
      noRedFlags: "未触发强烈 URL 风险信号",
      noRedFlagsDetail: "这次扫描没有触发明显的 URL 启发式规则，但在打开意外链接前仍应核实收到它的原因。",
      reportButton: "下载完整报告",
      surfaceBuckets: {
        structural: "结构",
        reputation: "信誉",
        destination: "目标页面"
      }
    };
  }

  if (locale === "ko") {
    return {
      surfaceMap: "위험 표면 맵",
      plainLanguageSummary: "현재 URL에서 위험해 보이는 부분",
      scanDerivedTelemetry: "현재 스캔에서 계산된 신호",
      inspectingEndpoint: "대상 점검 중...",
      telemetryReady: "현재 URL에서 계산된 신호",
      waitingForScan: "URL 스캔 대기 중",
      strongestSignal: "가장 강한 신호",
      strongestSignalIdle: "스캔을 실행하면 가장 두드러진 위험 레이어를 볼 수 있습니다.",
      strongestSignalPrefix: "현재 위험의 중심은",
      structuralMeaning: "링크 자체가 비정상적이거나 속이려는 형태입니다.",
      reputationMeaning: "외부 평판과 피싱 데이터베이스 신호입니다.",
      destinationMeaning: "링크를 열었을 때 도착 페이지가 하는 행동입니다.",
      host: "호스트",
      signals: "신호",
      redFlags: "URL 위험 신호",
      noRedFlags: "강한 URL 경고 없음",
      noRedFlagsDetail: "이번 스캔에서는 강한 URL 휴리스틱이 트리거되지 않았습니다. 그래도 예상치 못한 링크는 맥락을 먼저 확인하세요.",
      reportButton: "전체 보고서 다운로드",
      surfaceBuckets: {
        structural: "구조",
        reputation: "평판",
        destination: "목적지"
      }
    };
  }

  if (locale === "tl") {
    return {
      surfaceMap: "Mapa ng Surface ng Panganib",
      plainLanguageSummary: "Kung saan mukhang mapanganib ang URL na ito",
      scanDerivedTelemetry: "Telemetry na hango sa kasalukuyang scan",
      inspectingEndpoint: "Sinusuri ang destinasyon...",
      telemetryReady: "Mga signal mula sa kasalukuyang URL",
      waitingForScan: "Naghihintay ng URL scan",
      strongestSignal: "Pinakamalakas na signal",
      strongestSignalIdle: "Magpatakbo ng scan para makita kung aling risk layer ang pinaka kapansin-pansin.",
      strongestSignalPrefix: "Karamihan ng kasalukuyang panganib ay galing sa",
      structuralMeaning: "Ang mismong link ay mukhang kakaiba o mapanlinlang.",
      reputationMeaning: "Panlabas na trust at phishing-database signals.",
      destinationMeaning: "Kung ano ang ginagawa ng destination page kapag binuksan.",
      host: "Host",
      signals: "Mga signal",
      redFlags: "Mga Red Flag ng URL",
      noRedFlags: "Walang malalakas na red flag ng URL",
      noRedFlagsDetail: "Walang malalakas na heuristic rule na na-trigger para sa URL na ito, pero mabuting i-verify pa rin kung bakit mo natanggap ang link.",
      reportButton: "I-download ang Buong Ulat",
      surfaceBuckets: {
        structural: "Istruktura",
        reputation: "Reputasyon",
        destination: "Destinasyon"
      }
    };
  }

  if (locale === "fr") {
    return {
      surfaceMap: "Carte de Surface du Risque",
      plainLanguageSummary: "Ou cette URL semble risquee",
      scanDerivedTelemetry: "Telemetrie derivee de l'analyse actuelle",
      inspectingEndpoint: "Inspection de la destination...",
      telemetryReady: "Signaux resumes pour cette URL",
      waitingForScan: "En attente d'une analyse URL",
      strongestSignal: "Signal le plus fort",
      strongestSignalIdle: "Lancez une analyse pour voir quelle couche de risque ressort le plus.",
      strongestSignalPrefix: "La plus grande part du risque actuel vient de",
      structuralMeaning: "Le lien lui-meme parait inhabituel ou trompeur.",
      reputationMeaning: "Signaux de confiance externes et base de phishing.",
      destinationMeaning: "Ce que fait la page de destination si elle est ouverte.",
      host: "Hote",
      signals: "Signaux",
      redFlags: "Signaux d'Alerte URL",
      noRedFlags: "Aucun signal URL fort",
      noRedFlagsDetail: "Cette analyse n'a pas declenche de regles heuristiques URL fortes, mais il reste prudent de verifier pourquoi vous avez recu ce lien.",
      reportButton: "Telecharger le Rapport Complet",
      surfaceBuckets: {
        structural: "Structure",
        reputation: "Reputation",
        destination: "Destination"
      }
    };
  }

  return {
    surfaceMap: "Link Risk Overview",
    plainLanguageSummary: "Where this link looks risky",
    scanDerivedTelemetry: "Scan-derived telemetry from the current result",
    inspectingEndpoint: "Inspecting destination...",
    telemetryReady: "Risk signals summarized from this link",
    waitingForScan: "Waiting for a URL scan",
    strongestSignal: "Strongest signal",
    strongestSignalIdle: "Run a scan to see which risk layer stands out most.",
    strongestSignalPrefix: "Most of the current concern comes from",
    structuralMeaning: "The link itself looks unusual or deceptive.",
    reputationMeaning: "External trust and phishing-database signals.",
    destinationMeaning: "What the destination page does if opened.",
    host: "Host",
    signals: "Signals",
    redFlags: "What stands out",
    noRedFlags: "No strong link red flags",
    noRedFlagsDetail: "This scan did not trigger strong URL heuristics, but you should still verify why you received this link before opening it from an unexpected message.",
    reportButton: "Download Full Report",
    surfaceBuckets: {
      structural: "Structural",
      reputation: "Reputation",
      destination: "Destination"
    }
  };
}

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

function severityRank(severity: "high" | "medium" | "low") {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

function bucketAccent(key: "structural" | "reputation" | "destination", score: number) {
  if (score >= 6) {
    return "bg-[#ffb4ab]";
  }
  if (key === "reputation") {
    return "bg-secondary";
  }
  if (key === "destination") {
    return "bg-primary";
  }
  return "bg-[#d6e3ff]";
}

export function UrlScanRightRail({ result, loading, onDownloadPrimaryReport, historyItems, onRestoreHistory }: UrlScanRightRailProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const locale = result?.locale ?? "en";
  const copy = getUrlRailCopy(locale);
  const commonCopy = getScanLocaleCopy(locale);
  const currentSessionItems = historyItems.slice(0, 6);
  const heuristicFindings = result?.raw.metadata?.heuristic_findings ?? [];
  const signalCount = heuristicFindings.length;
  const host =
    result?.urlInspection[0]?.final_domain ??
    result?.urlEvidence[0]?.registrable_domain ??
    result?.urlEvidence[0]?.domain ??
    "—";

  const redFlags = heuristicFindings.length
    ? [...(result?.technicalDetails ?? [])]
        .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
        .slice(0, 4)
    : [];

  const mapBuckets = (result?.evidenceBuckets.length ? result.evidenceBuckets : [
    { key: "structural", score: 0, finding_count: 0 },
    { key: "reputation", score: 0, finding_count: 0 },
    { key: "destination", score: 0, finding_count: 0 }
  ]) as Array<{ key: "structural" | "reputation" | "destination"; score: number; finding_count: number }>;
  const highestBucket = [...mapBuckets].sort((left, right) => right.score - left.score)[0] ?? null;
  const highestBucketLabel = highestBucket
    ? highestBucket.key === "reputation"
      ? copy.surfaceBuckets.reputation
      : highestBucket.key === "destination"
        ? copy.surfaceBuckets.destination
        : copy.surfaceBuckets.structural
    : null;
  const bucketSummary = (bucket: (typeof mapBuckets)[number]) => {
    if (bucket.key === "reputation") {
      return copy.reputationMeaning;
    }
    if (bucket.key === "destination") {
      return copy.destinationMeaning;
    }
    return copy.structuralMeaning;
  };
  const maxBucketScore = Math.max(...mapBuckets.map((bucket) => bucket.score), 1);
  const redFlagsSessionKey = result
    ? [result.raw.metadata?.history_id ?? "", result.riskScore, result.summary, result.likelyScamPattern, "redflags"].join("::")
    : null;
  const { ref: redFlagsRef, activeClassName: redFlagsHighlightClass } = useHighlightOnFirstVisible({
    sessionKey: redFlagsSessionKey,
    enabled: Boolean(result)
  });

  return (
    <aside className="space-y-12">
      {currentSessionItems.length > 1 ? (
        <section className="animate-fade-up space-y-6" style={{ animationDelay: "90ms" }}>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-vellum">Session History</h2>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
              Current session snapshots
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 border border-outline-variant/30 bg-surface-container-low px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container-high"
            >
              <span className="min-w-0">
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  Current Session
                </span>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {currentSessionItems.length} saved URL scan snapshot{currentSessionItems.length === 1 ? "" : "s"} are available.
                </p>
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {historyOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            <div className={`grid overflow-hidden transition-all duration-500 ${historyOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0">
                <div className="max-h-80 space-y-3 overflow-y-auto pt-2 pr-1">
                  {currentSessionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onRestoreHistory(item)}
                      className="grid w-full gap-3 border border-outline-variant/20 bg-surface-container-low p-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container-high sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                          {item.scanType} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{item.snippet}</p>
                      </div>
                      <span
                        className={`font-label text-[10px] font-bold uppercase ${
                          item.riskLabel === "High Risk"
                            ? "text-[#ffb4ab]"
                            : item.riskLabel === "Suspicious"
                              ? "text-secondary"
                              : "text-[#d6e3ff]"
                        }`}
                      >
                        {commonCopy.riskLabels[item.riskLabel]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-[32px] font-bold tracking-tight text-vellum">{copy.surfaceMap}</h2>
          <span className="text-secondary">
            <GlobeIcon />
          </span>
        </div>

        <div className="space-y-4 overflow-hidden border border-outline-variant/20 bg-surface-container-high p-5">
          <div className="ghost-border bg-surface-container-lowest/65 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.plainLanguageSummary}</p>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              {loading
                ? copy.inspectingEndpoint
                : result && highestBucketLabel
                  ? `${copy.strongestSignalPrefix} ${highestBucketLabel.toLowerCase()}.`
                  : copy.strongestSignalIdle}
            </p>
          </div>

          <div className="space-y-3">
            {mapBuckets.map((bucket) => {
              const label =
                bucket.key === "reputation"
                  ? copy.surfaceBuckets.reputation
                  : bucket.key === "destination"
                    ? copy.surfaceBuckets.destination
                    : copy.surfaceBuckets.structural;
              const width = `${Math.max(10, Math.round((bucket.score / maxBucketScore) * 100))}%`;

              return (
                <div key={bucket.key} className="ghost-border bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-3 w-3 shrink-0 ${bucketAccent(bucket.key, bucket.score)}`} />
                      <div className="min-w-0">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{bucketSummary(bucket)}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-headline text-2xl font-bold text-vellum">{bucket.score}</p>
                      <p className="font-label text-[9px] uppercase tracking-[0.14em] text-outline">
                        {bucket.finding_count} finding{bucket.finding_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden bg-surface-container-highest">
                    <div className={`${bucketAccent(bucket.key, bucket.score)} h-full transition-all duration-500`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 text-[10px] font-label uppercase tracking-[0.18em] text-on-primary-container md:grid-cols-2">
          <div className="ghost-border bg-surface-container-low p-3">
            <span>{copy.host}</span>
            <p className="mt-2 break-words text-sm normal-case tracking-normal text-vellum [overflow-wrap:anywhere]">{host}</p>
          </div>
          <div className="ghost-border bg-surface-container-low p-3">
            <span>{copy.signals}</span>
            <p className="mt-2 text-sm normal-case tracking-normal text-vellum">{signalCount}</p>
          </div>
        </div>
      </section>

      <section
        ref={redFlagsRef}
        className={`scan-card-highlightable animate-fade-up space-y-6 ${redFlagsHighlightClass}`}
        style={{ animationDelay: "180ms" }}
      >
        <h2 className="font-headline text-[32px] font-bold tracking-tight text-vellum">{copy.redFlags}</h2>

        {redFlags.length > 0 ? (
          <div className="space-y-4">
            {redFlags.map((item) => {
              const critical = item.severity === "high";

              return (
                <div
                  key={`${item.label}-${item.detail}`}
                  className={`flex items-start gap-4 border-l-2 bg-surface-container-low p-4 ${
                    critical ? "border-[#ffb4ab]" : "border-outline-variant"
                  }`}
                >
                  <div className={`mt-1 h-2.5 w-2.5 ${critical ? "bg-[#ffb4ab]" : "bg-secondary"}`} />
                  <div className="min-w-0">
                    <p className="font-headline text-sm font-bold tracking-tight text-vellum">{item.label}</p>
                    <p className="mt-2 break-words text-[11px] uppercase tracking-[0.14em] text-on-surface-variant [overflow-wrap:anywhere]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-l-2 border-outline-variant bg-surface-container-low p-5">
            <p className="font-headline text-base font-bold tracking-tight text-vellum">{copy.noRedFlags}</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{copy.noRedFlagsDetail}</p>
            {result ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-outline">
                {commonCopy.result.heuristicScore}: {result.riskScore}
              </p>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => void onDownloadPrimaryReport()}
          disabled={!result}
          className={`editorial-button w-full justify-center py-4 text-[10px] ${
            !result ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          {copy.reportButton}
        </button>
      </section>
    </aside>
  );
}
