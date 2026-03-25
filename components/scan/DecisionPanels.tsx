"use client";

import { getScanLocaleCopy, type MessageScanResult, type SupportedLocale } from "@/lib/scan";

type DecisionPanelCopy = {
  titles: {
    decisionTrace: string;
    consensusEngine: string;
    modelAssessments: string;
    crossModelReview: string;
    urlEvidence: string;
    domainIntelligence: string;
  };
  labels: {
    decisionSource: string;
    comparison: string;
    responsesReturned: string;
    decisionSummary: string;
    confidenceSuffix: string;
    modelsAgree: string;
    modelsDisagree: string;
    oneModelResponded: string;
    heuristicsOnly: string;
    primaryUnavailable: string;
    secondUnavailable: string;
    aiUnavailable: string;
    primaryModel: string;
    secondModel: string;
    noConfidence: string;
    registered: string;
    tld: string;
    subdomain: string;
    subdomainCount: string;
    noUrls: string;
    noConsensusMetadata: string;
    noSubdomain: string;
    modelBackedDecision: string;
    heuristicFallback: string;
    consensus: string;
    disagreement: string;
    singleModel: string;
    noModels: string;
  };
  sourceLabels: {
    consensus: string;
    consensusOverride: string;
    consensusDisagreement: string;
    singleModel: string;
    heuristicFallback: string;
  };
};

const DECISION_PANEL_COPY: Record<"en" | "vi", DecisionPanelCopy> = {
  en: {
    titles: {
      decisionTrace: "Decision Trace",
      consensusEngine: "Consensus Engine",
      modelAssessments: "Model Assessments",
      crossModelReview: "Cross-Model Review",
      urlEvidence: "URL Evidence",
      domainIntelligence: "Domain Intelligence"
    },
    labels: {
      decisionSource: "Decision Source",
      comparison: "Comparison",
      responsesReturned: "Responses Returned",
      decisionSummary: "Decision Summary",
      confidenceSuffix: "confidence",
      modelsAgree: "Models agree",
      modelsDisagree: "Models disagree",
      oneModelResponded: "Only one model responded",
      heuristicsOnly: "Heuristics only",
      primaryUnavailable: "Primary model unavailable",
      secondUnavailable: "Second model unavailable",
      aiUnavailable: "AI model assessments were unavailable for this scan. The current verdict was produced from local heuristics only.",
      primaryModel: "Primary Model",
      secondModel: "Second Model",
      noConfidence: "No confidence score",
      registered: "Registered",
      tld: "TLD",
      subdomain: "Subdomain",
      subdomainCount: "Subdomain count",
      noUrls: "No URLs were extracted from this scan, so there is no domain evidence to display.",
      noConsensusMetadata: "No consensus metadata was returned for this scan.",
      noSubdomain: "None",
      modelBackedDecision: "Model-backed decision",
      heuristicFallback: "Heuristic fallback",
      consensus: "Consensus",
      disagreement: "Disagreement",
      singleModel: "Single model",
      noModels: "No models"
    },
    sourceLabels: {
      consensus: "Dual-model consensus",
      consensusOverride: "Consensus + heuristic override",
      consensusDisagreement: "Dual-model disagreement",
      singleModel: "Single model",
      heuristicFallback: "Heuristic fallback"
    }
  },
  vi: {
    titles: {
      decisionTrace: "Dau Vet Quyet Dinh",
      consensusEngine: "Bo May Dong Thuan",
      modelAssessments: "Danh Gia Mo Hinh",
      crossModelReview: "Doi Chieu Mo Hinh",
      urlEvidence: "Bang Chung URL",
      domainIntelligence: "Tinh Bao Ten Mien"
    },
    labels: {
      decisionSource: "Nguon Quyet Dinh",
      comparison: "So Sanh",
      responsesReturned: "So Phan Hoi",
      decisionSummary: "Tom Tat Quyet Dinh",
      confidenceSuffix: "do tin cay",
      modelsAgree: "Hai mo hinh dong y",
      modelsDisagree: "Hai mo hinh bat dong",
      oneModelResponded: "Chi co mot mo hinh phan hoi",
      heuristicsOnly: "Chi dung heuristic",
      primaryUnavailable: "Mo hinh chinh khong kha dung",
      secondUnavailable: "Mo hinh thu hai khong kha dung",
      aiUnavailable: "Khong co danh gia AI cho lan quet nay. Ket qua hien tai duoc tao tu heuristic cuc bo.",
      primaryModel: "Mo Hinh Chinh",
      secondModel: "Mo Hinh Thu Hai",
      noConfidence: "Khong co diem tin cay",
      registered: "Ten mien goc",
      tld: "TLD",
      subdomain: "Tien to mien",
      subdomainCount: "So luong subdomain",
      noUrls: "Khong trich xuat duoc URL nao tu lan quet nay, nen khong co bang chung ten mien de hien thi.",
      noConsensusMetadata: "Lan quet nay khong tra ve du lieu dong thuan.",
      noSubdomain: "Khong co",
      modelBackedDecision: "Quyet dinh co AI",
      heuristicFallback: "Du phong heuristic",
      consensus: "Dong thuan",
      disagreement: "Bat dong",
      singleModel: "Mot mo hinh",
      noModels: "Khong co AI"
    },
    sourceLabels: {
      consensus: "Dong thuan hai mo hinh",
      consensusOverride: "Dong thuan + heuristic ghi de",
      consensusDisagreement: "Bat dong giua hai mo hinh",
      singleModel: "Mot mo hinh",
      heuristicFallback: "Du phong heuristic"
    }
  }
};

export function getDecisionPanelCopy(locale: SupportedLocale): DecisionPanelCopy {
  return DECISION_PANEL_COPY[locale === "vi" ? "vi" : "en"];
}

function riskClass(riskLevel: "safe" | "suspicious" | "high_risk") {
  if (riskLevel === "high_risk") {
    return "text-[#ffb4ab]";
  }
  if (riskLevel === "suspicious") {
    return "text-secondary";
  }
  return "text-[#d6e3ff]";
}

function riskLabel(riskLevel: "safe" | "suspicious" | "high_risk", locale: SupportedLocale) {
  const riskLabels = getScanLocaleCopy(locale).riskLabels;
  if (riskLevel === "high_risk") {
    return riskLabels["High Risk"];
  }
  if (riskLevel === "suspicious") {
    return riskLabels.Suspicious;
  }
  return riskLabels.Safe;
}

function localizedDecisionSourceLabel(source: string, locale: SupportedLocale) {
  const copy = getDecisionPanelCopy(locale);
  if (source === "consensus") {
    return copy.sourceLabels.consensus;
  }
  if (source === "consensus_heuristic_override") {
    return copy.sourceLabels.consensusOverride;
  }
  if (source === "consensus_disagreement") {
    return copy.sourceLabels.consensusDisagreement;
  }
  if (source === "single_model") {
    return copy.sourceLabels.singleModel;
  }
  return copy.sourceLabels.heuristicFallback;
}

function consensusTextClass(status: string | undefined) {
  if (status === "agree") {
    return "text-secondary";
  }
  if (status === "disagree") {
    return "text-[#ffb4ab]";
  }
  return "text-vellum";
}

export function getDecisionModeBadgeLabel(decisionSource: string, locale: SupportedLocale) {
  const copy = getDecisionPanelCopy(locale);
  return decisionSource === "heuristic_fallback" ? copy.labels.heuristicFallback : copy.labels.modelBackedDecision;
}

export function getConsensusStatusLabel(status: string | undefined, locale: SupportedLocale) {
  const copy = getDecisionPanelCopy(locale);
  if (status === "agree") {
    return copy.labels.consensus;
  }
  if (status === "disagree") {
    return copy.labels.disagreement;
  }
  if (status === "single_model") {
    return copy.labels.singleModel;
  }
  return copy.labels.noModels;
}

function localizedConsensusSummary(result: MessageScanResult) {
  const consensus = result.consensus;
  const copy = getDecisionPanelCopy(result.locale);

  if (!consensus) {
    return copy.labels.noConsensusMetadata;
  }

  const firstModel = result.modelRuns[0]?.model;

  if (result.locale === "vi") {
    if (result.decisionSource === "consensus_heuristic_override") {
      return "Hai mo hinh dong thuan, nhung heuristic tim thay dau hieu manh hon nen ket qua cuoi cung duoc nang muc de phong.";
    }
    if (consensus.status === "disagree" || result.decisionSource === "consensus_disagreement") {
      return "Hai mo hinh dua ra danh gia khac nhau, nen CyberCoach giu muc canh bao than trong hon cho ket qua cuoi cung.";
    }
    if (consensus.status === "single_model") {
      return firstModel
        ? `Chi co ${firstModel} tra ve ket qua, nen CyberCoach su dung danh gia do cho ket luan cuoi cung.`
        : "Chi co mot mo hinh tra ve ket qua, nen CyberCoach su dung danh gia do cho ket luan cuoi cung.";
    }
    if (consensus.status === "heuristic_fallback" || result.decisionSource === "heuristic_fallback") {
      return "Khong co danh gia AI kha dung, nen ket qua hien tai duoc tao tu heuristic cuc bo.";
    }
    return "Hai mo hinh deu dong y ve muc rui ro cuoi cung.";
  }

  if (result.decisionSource === "consensus_heuristic_override") {
    return "Both models agreed, but stronger heuristic evidence elevated the final verdict as a precaution.";
  }
  if (consensus.status === "disagree" || result.decisionSource === "consensus_disagreement") {
    return "The two models disagreed, so CyberCoach kept the more cautious risk assessment.";
  }
  if (consensus.status === "single_model") {
    return firstModel
      ? `Only ${firstModel} returned a usable assessment, so CyberCoach used that result for the final verdict.`
      : "Only one model returned a usable assessment, so CyberCoach used that result for the final verdict.";
  }
  if (consensus.status === "heuristic_fallback" || result.decisionSource === "heuristic_fallback") {
    return "No usable AI assessment was available, so the current verdict was produced from local heuristics only.";
  }
  return "Both models agreed on the final risk level.";
}

export function DecisionSummaryPanel({ result }: { result: MessageScanResult }) {
  const consensus = result.consensus;
  const copy = getDecisionPanelCopy(result.locale);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="ghost-border flex flex-col gap-2 bg-surface-container-lowest/55 p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.labels.decisionSource}</p>
          <p className="text-sm font-semibold leading-relaxed text-vellum">{localizedDecisionSourceLabel(result.decisionSource, result.locale)}</p>
        </div>
        <div className="ghost-border flex flex-col gap-2 bg-surface-container-lowest/55 p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.labels.comparison}</p>
          <p className={`text-sm font-semibold leading-relaxed ${consensusTextClass(consensus?.status)}`}>
            {consensus?.status === "agree"
              ? copy.labels.modelsAgree
              : consensus?.status === "disagree"
                ? copy.labels.modelsDisagree
                : consensus?.status === "single_model"
                  ? copy.labels.oneModelResponded
                  : copy.labels.heuristicsOnly}
          </p>
        </div>
        <div className="ghost-border flex flex-col gap-2 bg-surface-container-lowest/55 p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.labels.responsesReturned}</p>
          <p className="text-sm font-semibold leading-relaxed text-vellum">
            {result.modelRuns.length} of {Math.max(result.modelRuns.length + result.modelErrors.length, result.modelRuns.length || 2)}
          </p>
        </div>
      </div>

      <div className="ghost-border bg-surface-container-lowest/55 p-4">
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.labels.decisionSummary}</p>
        <p className="mt-2 text-sm leading-relaxed text-on-surface">
          {localizedConsensusSummary(result)}
        </p>
      </div>

      {result.modelErrors.length > 0 ? (
        <div className="space-y-3">
          {result.modelErrors.map((item) => (
            <div key={`${item.slot}-${item.model}`} className="border border-[#ffb4ab]/30 bg-[#ffb4ab]/8 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb4ab]">
                {item.slot === "primary" ? copy.labels.primaryUnavailable : copy.labels.secondUnavailable}
              </p>
              <p className="mt-2 text-sm text-vellum">{item.model}</p>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{item.error}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ModelAssessmentsPanel({ result }: { result: MessageScanResult }) {
  const copy = getDecisionPanelCopy(result.locale);
  if (result.modelRuns.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-on-surface-variant">
        {copy.labels.aiUnavailable}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {result.modelRuns.map((run) => (
        <div key={`${run.slot}-${run.model}`} className="ghost-border bg-surface-container-lowest/55 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {run.slot === "primary" ? copy.labels.primaryModel : copy.labels.secondModel}
              </p>
              <p className="mt-2 break-words text-sm font-semibold text-vellum [overflow-wrap:anywhere]">{run.model}</p>
            </div>
            <div className="shrink-0 md:text-right">
              <p className={`font-label text-[10px] font-bold uppercase tracking-[0.16em] ${riskClass(run.risk_level)}`}>
                {riskLabel(run.risk_level, result.locale)}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {typeof run.confidence === "number" ? `${Math.round(run.confidence * 100)}% ${copy.labels.confidenceSuffix}` : copy.labels.noConfidence}
              </p>
            </div>
          </div>

          {run.explanation ? (
            <p className="mt-4 max-w-3xl break-words text-sm leading-relaxed text-on-surface [overflow-wrap:anywhere]">{run.explanation}</p>
          ) : null}

          {run.reasons.length > 0 ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {run.reasons.slice(0, 2).map((reason) => (
                <div
                  key={reason}
                  className="min-w-0 border border-outline-variant/20 bg-surface-container-low p-3 text-sm leading-relaxed text-on-surface-variant break-words [overflow-wrap:anywhere]"
                >
                  {reason}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function UrlEvidencePanel({ result }: { result: MessageScanResult }) {
  const copy = getDecisionPanelCopy(result.locale);
  if (result.urlEvidence.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-on-surface-variant">
        {copy.labels.noUrls}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {result.urlEvidence.map((item) => (
        <div key={item.normalized_url} className="ghost-border bg-surface-container-lowest/55 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
              {item.domain}
            </span>
            <span className="border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
              {copy.labels.registered}: {item.registrable_domain}
            </span>
            <span className="border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
              {copy.labels.tld} {item.tld}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {copy.labels.subdomain}: {item.subdomain || copy.labels.noSubdomain}
            </p>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {copy.labels.subdomainCount}: {item.subdomain_count}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
