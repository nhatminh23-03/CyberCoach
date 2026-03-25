"use client";

import { getScanLocaleCopy, type MessageScanResult, type SupportedLocale } from "@/lib/scan";

type UrlScanRightRailProps = {
  result: MessageScanResult | null;
  loading: boolean;
  onDownloadPrimaryReport: () => Promise<void>;
};

type RailCopy = {
  surfaceMap: string;
  scanDerivedTelemetry: string;
  inspectingEndpoint: string;
  telemetryReady: string;
  waitingForScan: string;
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
      scanDerivedTelemetry: "Tin hieu duoc tao tu ket qua quet hien tai",
      inspectingEndpoint: "Dang kiem tra diem den...",
      telemetryReady: "Tin hieu duoc tong hop tu URL hien tai",
      waitingForScan: "Cho ket qua quet URL",
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
      scanDerivedTelemetry: "Telemetria derivada del analisis actual",
      inspectingEndpoint: "Inspeccionando destino...",
      telemetryReady: "Senales resumidas desde esta URL",
      waitingForScan: "Esperando un analisis de URL",
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
      scanDerivedTelemetry: "基于当前扫描结果生成的遥测",
      inspectingEndpoint: "正在检查目标...",
      telemetryReady: "当前 URL 的信号摘要",
      waitingForScan: "等待 URL 扫描结果",
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
      scanDerivedTelemetry: "현재 스캔에서 계산된 신호",
      inspectingEndpoint: "대상 점검 중...",
      telemetryReady: "현재 URL에서 계산된 신호",
      waitingForScan: "URL 스캔 대기 중",
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
      scanDerivedTelemetry: "Telemetry na hango sa kasalukuyang scan",
      inspectingEndpoint: "Sinusuri ang destinasyon...",
      telemetryReady: "Mga signal mula sa kasalukuyang URL",
      waitingForScan: "Naghihintay ng URL scan",
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
      scanDerivedTelemetry: "Telemetrie derivee de l'analyse actuelle",
      inspectingEndpoint: "Inspection de la destination...",
      telemetryReady: "Signaux resumes pour cette URL",
      waitingForScan: "En attente d'une analyse URL",
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
    surfaceMap: "Threat Surface Map",
    scanDerivedTelemetry: "Scan-derived telemetry from the current result",
    inspectingEndpoint: "Inspecting destination...",
    telemetryReady: "Signals summarized from the current URL",
    waitingForScan: "Waiting for a URL scan",
    host: "Host",
    signals: "Signals",
    redFlags: "URL Red Flags",
    noRedFlags: "No strong URL red flags",
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

const SURFACE_POSITIONS = [
  { left: 18, labelLeft: "left-[12%]" },
  { left: 50, labelLeft: "left-[44%]" },
  { left: 78, labelLeft: "left-[72%]" }
];

export function UrlScanRightRail({ result, loading, onDownloadPrimaryReport }: UrlScanRightRailProps) {
  const locale = result?.locale ?? "en";
  const copy = getUrlRailCopy(locale);
  const commonCopy = getScanLocaleCopy(locale);
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

  return (
    <aside className="space-y-12">
      <section className="animate-fade-up space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-[32px] font-bold tracking-tight text-vellum">{copy.surfaceMap}</h2>
          <span className="text-secondary">
            <GlobeIcon />
          </span>
        </div>

        <div className="overflow-hidden border border-outline-variant/20 bg-surface-container-high">
          <div className="relative aspect-[1.45] bg-[radial-gradient(circle_at_20%_20%,rgba(225,194,144,0.12),transparent_24%),radial-gradient(circle_at_78%_30%,rgba(185,199,228,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-25" />
            <div className="absolute inset-x-6 top-6 flex items-center gap-2 border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
              <span className={`h-2 w-2 ${loading ? "bg-secondary" : result ? "bg-primary" : "bg-outline-variant"}`} />
              <span className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                {loading ? copy.inspectingEndpoint : result ? copy.telemetryReady : copy.waitingForScan}
              </span>
            </div>

            {mapBuckets.map((bucket, index) => {
              const position = SURFACE_POSITIONS[index] ?? SURFACE_POSITIONS[0];
              const top = Math.max(22, 72 - Math.min(bucket.score, 10) * 5);
              const label =
                bucket.key === "reputation"
                  ? copy.surfaceBuckets.reputation
                  : bucket.key === "destination"
                    ? copy.surfaceBuckets.destination
                    : copy.surfaceBuckets.structural;

              return (
                <div key={bucket.key}>
                  <div
                    className={`absolute h-2.5 w-2.5 shadow-[0_0_18px_rgba(255,255,255,0.18)] ${bucketAccent(bucket.key, bucket.score)}`}
                    style={{ left: `${position.left}%`, top: `${top}%` }}
                  />
                  <div
                    className={`absolute top-[78%] border border-outline-variant/20 bg-black/20 px-2 py-1 font-label text-[9px] font-bold uppercase tracking-[0.14em] text-vellum ${position.labelLeft}`}
                  >
                    {label}: {bucket.score}
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

      <section className="animate-fade-up space-y-6" style={{ animationDelay: "180ms" }}>
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
