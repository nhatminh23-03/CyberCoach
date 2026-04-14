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

const DECISION_PANEL_COPY: Record<SupportedLocale, DecisionPanelCopy> = {
  en: {
    titles: {
      decisionTrace: "AI Review Summary",
      consensusEngine: "How CyberCoach Decided",
      modelAssessments: "Model Comparison",
      crossModelReview: "AI Review",
      urlEvidence: "Link Evidence",
      domainIntelligence: "Domain Details"
    },
    labels: {
      decisionSource: "Decision source",
      comparison: "Model status",
      responsesReturned: "Responses Returned",
      decisionSummary: "What this means",
      confidenceSuffix: "confidence",
      modelsAgree: "Models agree",
      modelsDisagree: "Models disagree",
      oneModelResponded: "Only one model responded",
      heuristicsOnly: "Local review only",
      primaryUnavailable: "Primary AI review unavailable",
      secondUnavailable: "Second AI review unavailable",
      aiUnavailable: "AI review was unavailable for this scan, so CyberCoach relied on local checks.",
      primaryModel: "Primary review",
      secondModel: "Second review",
      noConfidence: "No confidence shown",
      registered: "Registered",
      tld: "TLD",
      subdomain: "Subdomain",
      subdomainCount: "Subdomain count",
      noUrls: "No links were extracted from this scan, so there are no domain details to show.",
      noConsensusMetadata: "No AI review summary was returned for this scan.",
      noSubdomain: "None",
      modelBackedDecision: "AI-informed result",
      heuristicFallback: "Local fallback",
      consensus: "Consensus",
      disagreement: "Disagreement",
      singleModel: "Single model",
      noModels: "No AI review"
    },
    sourceLabels: {
      consensus: "Two-model agreement",
      consensusOverride: "Model agreement + local caution",
      consensusDisagreement: "Two-model disagreement",
      singleModel: "Single model result",
      heuristicFallback: "Local fallback"
    }
  },
  es: {
    titles: {
      decisionTrace: "Resumen de Revision con IA",
      consensusEngine: "Como decidio CyberCoach",
      modelAssessments: "Comparacion de Modelos",
      crossModelReview: "Revision con IA",
      urlEvidence: "Evidencia del Enlace",
      domainIntelligence: "Detalles del Dominio"
    },
    labels: {
      decisionSource: "Fuente de la decision",
      comparison: "Estado del modelo",
      responsesReturned: "Respuestas recibidas",
      decisionSummary: "Lo que esto significa",
      confidenceSuffix: "de confianza",
      modelsAgree: "Los modelos coinciden",
      modelsDisagree: "Los modelos no coinciden",
      oneModelResponded: "Solo respondio un modelo",
      heuristicsOnly: "Solo revision local",
      primaryUnavailable: "Revision principal no disponible",
      secondUnavailable: "Revision secundaria no disponible",
      aiUnavailable: "La revision con IA no estuvo disponible, asi que CyberCoach uso verificaciones locales.",
      primaryModel: "Revision principal",
      secondModel: "Segunda revision",
      noConfidence: "Sin nivel de confianza",
      registered: "Registrado",
      tld: "TLD",
      subdomain: "Subdominio",
      subdomainCount: "Cantidad de subdominios",
      noUrls: "No se extrajeron enlaces, asi que no hay detalles de dominio para mostrar.",
      noConsensusMetadata: "No se devolvio un resumen de revision con IA.",
      noSubdomain: "Ninguno",
      modelBackedDecision: "Resultado con apoyo de IA",
      heuristicFallback: "Respaldo local",
      consensus: "Acuerdo",
      disagreement: "Desacuerdo",
      singleModel: "Un solo modelo",
      noModels: "Sin revision de IA"
    },
    sourceLabels: {
      consensus: "Acuerdo de dos modelos",
      consensusOverride: "Acuerdo del modelo + cautela local",
      consensusDisagreement: "Desacuerdo de dos modelos",
      singleModel: "Resultado de un modelo",
      heuristicFallback: "Respaldo local"
    }
  },
  zh: {
    titles: {
      decisionTrace: "AI 审查摘要",
      consensusEngine: "CyberCoach 如何判断",
      modelAssessments: "模型对比",
      crossModelReview: "AI 审查",
      urlEvidence: "链接证据",
      domainIntelligence: "域名详情"
    },
    labels: {
      decisionSource: "判断来源",
      comparison: "模型状态",
      responsesReturned: "返回结果数",
      decisionSummary: "这意味着什么",
      confidenceSuffix: "置信度",
      modelsAgree: "模型意见一致",
      modelsDisagree: "模型意见不一致",
      oneModelResponded: "只有一个模型返回结果",
      heuristicsOnly: "仅本地检查",
      primaryUnavailable: "主 AI 审查不可用",
      secondUnavailable: "第二个 AI 审查不可用",
      aiUnavailable: "这次扫描无法完成 AI 审查，所以 CyberCoach 使用了本地检查。",
      primaryModel: "主审查",
      secondModel: "第二审查",
      noConfidence: "没有置信度",
      registered: "注册域名",
      tld: "TLD",
      subdomain: "子域名",
      subdomainCount: "子域名数量",
      noUrls: "这次扫描没有提取到链接，因此没有域名详情可显示。",
      noConsensusMetadata: "这次扫描没有返回 AI 审查摘要。",
      noSubdomain: "无",
      modelBackedDecision: "AI 参与的结果",
      heuristicFallback: "本地回退",
      consensus: "一致",
      disagreement: "分歧",
      singleModel: "单模型",
      noModels: "没有 AI 审查"
    },
    sourceLabels: {
      consensus: "双模型一致",
      consensusOverride: "模型一致 + 本地谨慎升级",
      consensusDisagreement: "双模型分歧",
      singleModel: "单模型结果",
      heuristicFallback: "本地回退"
    }
  },
  vi: {
    titles: {
      decisionTrace: "Tom Tat Danh Gia AI",
      consensusEngine: "CyberCoach Da Quyết Dinh The Nao",
      modelAssessments: "So Sanh Mo Hinh",
      crossModelReview: "Danh Gia AI",
      urlEvidence: "Bang Chung Lien Ket",
      domainIntelligence: "Chi Tiet Ten Mien"
    },
    labels: {
      decisionSource: "Nguon quyet dinh",
      comparison: "Trang thai mo hinh",
      responsesReturned: "So Phan Hoi",
      decisionSummary: "Dieu nay co nghia gi",
      confidenceSuffix: "do tin cay",
      modelsAgree: "Hai mo hinh dong y",
      modelsDisagree: "Hai mo hinh bat dong",
      oneModelResponded: "Chi co mot mo hinh phan hoi",
      heuristicsOnly: "Chi kiem tra cuc bo",
      primaryUnavailable: "Danh gia AI chinh khong kha dung",
      secondUnavailable: "Danh gia AI thu hai khong kha dung",
      aiUnavailable: "Khong co danh gia AI cho lan quet nay, nen CyberCoach da dung kiem tra cuc bo.",
      primaryModel: "Danh gia chinh",
      secondModel: "Danh gia thu hai",
      noConfidence: "Khong co muc tin cay",
      registered: "Ten mien goc",
      tld: "TLD",
      subdomain: "Tien to mien",
      subdomainCount: "So luong subdomain",
      noUrls: "Khong trich xuat duoc lien ket nao, nen khong co chi tiet ten mien de hien thi.",
      noConsensusMetadata: "Lan quet nay khong tra ve tom tat danh gia AI.",
      noSubdomain: "Khong co",
      modelBackedDecision: "Ket qua co AI ho tro",
      heuristicFallback: "Du phong cuc bo",
      consensus: "Dong thuan",
      disagreement: "Bat dong",
      singleModel: "Mot mo hinh",
      noModels: "Khong co danh gia AI"
    },
    sourceLabels: {
      consensus: "Dong thuan hai mo hinh",
      consensusOverride: "Dong thuan + canh bao cuc bo",
      consensusDisagreement: "Bat dong giua hai mo hinh",
      singleModel: "Ket qua tu mot mo hinh",
      heuristicFallback: "Du phong cuc bo"
    }
  },
  ko: {
    titles: {
      decisionTrace: "AI 검토 요약",
      consensusEngine: "CyberCoach가 판단한 방식",
      modelAssessments: "모델 비교",
      crossModelReview: "AI 검토",
      urlEvidence: "링크 근거",
      domainIntelligence: "도메인 세부정보"
    },
    labels: {
      decisionSource: "판단 출처",
      comparison: "모델 상태",
      responsesReturned: "응답 수",
      decisionSummary: "이 결과의 의미",
      confidenceSuffix: "신뢰도",
      modelsAgree: "모델 의견 일치",
      modelsDisagree: "모델 의견 불일치",
      oneModelResponded: "한 모델만 응답",
      heuristicsOnly: "로컬 검토만",
      primaryUnavailable: "주 AI 검토 불가",
      secondUnavailable: "두 번째 AI 검토 불가",
      aiUnavailable: "이번 스캔에서는 AI 검토를 사용할 수 없어 CyberCoach가 로컬 확인을 사용했습니다.",
      primaryModel: "주 검토",
      secondModel: "보조 검토",
      noConfidence: "신뢰도 없음",
      registered: "등록 도메인",
      tld: "TLD",
      subdomain: "서브도메인",
      subdomainCount: "서브도메인 수",
      noUrls: "이 스캔에서 링크를 찾지 못해 도메인 세부정보를 표시할 수 없습니다.",
      noConsensusMetadata: "AI 검토 요약이 반환되지 않았습니다.",
      noSubdomain: "없음",
      modelBackedDecision: "AI 참고 결과",
      heuristicFallback: "로컬 대체 결과",
      consensus: "합의",
      disagreement: "불일치",
      singleModel: "단일 모델",
      noModels: "AI 검토 없음"
    },
    sourceLabels: {
      consensus: "두 모델 합의",
      consensusOverride: "모델 합의 + 로컬 주의",
      consensusDisagreement: "두 모델 불일치",
      singleModel: "단일 모델 결과",
      heuristicFallback: "로컬 대체 결과"
    }
  },
  tl: {
    titles: {
      decisionTrace: "Buod ng Review ng AI",
      consensusEngine: "Paano Nagpasya ang CyberCoach",
      modelAssessments: "Paghahambing ng Modelo",
      crossModelReview: "Review ng AI",
      urlEvidence: "Ebidensya ng Link",
      domainIntelligence: "Detalye ng Domain"
    },
    labels: {
      decisionSource: "Pinagmulan ng pasya",
      comparison: "Kalagayan ng modelo",
      responsesReturned: "Bilang ng tugon",
      decisionSummary: "Ano ang ibig sabihin nito",
      confidenceSuffix: "na kumpiyansa",
      modelsAgree: "Magkapareho ang modelo",
      modelsDisagree: "Hindi magkapareho ang modelo",
      oneModelResponded: "Isang modelo lang ang tumugon",
      heuristicsOnly: "Lokal na review lang",
      primaryUnavailable: "Hindi available ang pangunahing AI review",
      secondUnavailable: "Hindi available ang ikalawang AI review",
      aiUnavailable: "Hindi available ang AI review para sa scan na ito kaya lokal na pagsusuri ang ginamit ng CyberCoach.",
      primaryModel: "Pangunahing review",
      secondModel: "Ikalawang review",
      noConfidence: "Walang score ng kumpiyansa",
      registered: "Rehistradong domain",
      tld: "TLD",
      subdomain: "Subdomain",
      subdomainCount: "Bilang ng subdomain",
      noUrls: "Walang nakuha na link sa scan na ito kaya walang domain details na maipapakita.",
      noConsensusMetadata: "Walang naibalik na buod ng AI review.",
      noSubdomain: "Wala",
      modelBackedDecision: "Resultang may AI",
      heuristicFallback: "Lokal na fallback",
      consensus: "Pagkakasundo",
      disagreement: "Hindi pagkakasundo",
      singleModel: "Isang modelo",
      noModels: "Walang AI review"
    },
    sourceLabels: {
      consensus: "Pagkakasundo ng dalawang modelo",
      consensusOverride: "Pagkakasundo ng modelo + lokal na pag-iingat",
      consensusDisagreement: "Hindi pagkakasundo ng dalawang modelo",
      singleModel: "Resulta ng isang modelo",
      heuristicFallback: "Lokal na fallback"
    }
  },
  fr: {
    titles: {
      decisionTrace: "Resume de la Revue IA",
      consensusEngine: "Comment CyberCoach a Decide",
      modelAssessments: "Comparaison des Modeles",
      crossModelReview: "Revue IA",
      urlEvidence: "Preuves du Lien",
      domainIntelligence: "Details du Domaine"
    },
    labels: {
      decisionSource: "Source de la decision",
      comparison: "Etat des modeles",
      responsesReturned: "Reponses recues",
      decisionSummary: "Ce que cela signifie",
      confidenceSuffix: "de confiance",
      modelsAgree: "Les modeles sont d'accord",
      modelsDisagree: "Les modeles ne sont pas d'accord",
      oneModelResponded: "Un seul modele a repondu",
      heuristicsOnly: "Analyse locale seulement",
      primaryUnavailable: "Revue IA principale indisponible",
      secondUnavailable: "Deuxieme revue IA indisponible",
      aiUnavailable: "La revue IA n'etait pas disponible pour cette analyse, donc CyberCoach a utilise des verifications locales.",
      primaryModel: "Revue principale",
      secondModel: "Deuxieme revue",
      noConfidence: "Pas de score de confiance",
      registered: "Domaine enregistre",
      tld: "TLD",
      subdomain: "Sous-domaine",
      subdomainCount: "Nombre de sous-domaines",
      noUrls: "Aucun lien n'a ete extrait de cette analyse, donc aucun detail de domaine n'est disponible.",
      noConsensusMetadata: "Aucun resume de revue IA n'a ete retourne.",
      noSubdomain: "Aucun",
      modelBackedDecision: "Resultat aide par l'IA",
      heuristicFallback: "Secours local",
      consensus: "Consensus",
      disagreement: "Desaccord",
      singleModel: "Modele unique",
      noModels: "Aucune revue IA"
    },
    sourceLabels: {
      consensus: "Accord de deux modeles",
      consensusOverride: "Accord des modeles + prudence locale",
      consensusDisagreement: "Desaccord de deux modeles",
      singleModel: "Resultat d'un seul modele",
      heuristicFallback: "Secours local"
    }
  }
};

export function getDecisionPanelCopy(locale: SupportedLocale): DecisionPanelCopy {
  return DECISION_PANEL_COPY[locale] ?? DECISION_PANEL_COPY.en;
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

  if (typeof consensus.summary === "string" && consensus.summary.trim()) {
    return consensus.summary.trim();
  }

  if (result.decisionSource === "consensus_heuristic_override") {
    return "The AI reviews leaned the same way, but stronger local warning signs pushed the final result higher as a precaution.";
  }
  if (consensus.status === "disagree" || result.decisionSource === "consensus_disagreement") {
    return "The AI reviews disagreed, so CyberCoach kept the more cautious result.";
  }
  if (consensus.status === "single_model") {
    return "Only one AI review returned a usable result, so CyberCoach used that result for the final verdict.";
  }
  if (consensus.status === "heuristic_fallback" || result.decisionSource === "heuristic_fallback") {
    return copy.labels.aiUnavailable;
  }
  return "The AI reviews agreed on the final risk level.";
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
