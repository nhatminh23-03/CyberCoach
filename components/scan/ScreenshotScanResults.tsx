"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import {
  DecisionSummaryPanel,
  ModelAssessmentsPanel,
  UrlEvidencePanel,
  getConsensusStatusLabel,
  getDecisionPanelCopy
} from "@/components/scan/DecisionPanels";
import {
  DestinationInspectionCard,
  EvidenceBucketsCard,
  getUrlResultCopy
} from "@/components/scan/UrlScanResults";
import {
  getScanLocaleCopy,
  resolveSupportedLocale,
  type DetailedScanHistoryItem,
  type MessageScanResult,
  type SupportedLocale
} from "@/lib/scan";

type ScreenshotScanResultsProps = {
  result: MessageScanResult | null;
  loading: boolean;
  historyItems: DetailedScanHistoryItem[];
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  onRestoreHistory: (item: DetailedScanHistoryItem) => void;
  onRescanEditedText: (text: string) => Promise<void>;
  reportBusy: "copy" | "txt" | "md" | null;
  rescanBusy: boolean;
  rescanAvailable: boolean;
};

function getScreenshotResultCopy(locale: SupportedLocale) {
  const english = {
    summary: "Summary",
    threatBrief: "Threat Brief",
    extractedContent: "Extracted Content",
    ocrPreview: "OCR Preview",
    forwardToIt: "Forward To IT",
    sessionHistory: "Session History",
    recentScans: "Recent Scans",
    currentSession: "Current Session",
    savedSnapshots: (count: number) => `${count} saved scan snapshots are available.`,
    expand: "Expand",
    collapse: "Collapse",
    liveSession: "Live session",
    ocrDualModel: "OCR + dual model",
    dualModelReview: "Dual-model review",
    ocrAi: "OCR + AI",
    aiAssisted: "AI assisted",
    heuristicOnly: "Heuristic only",
    qrCodes: "Detected QR Codes",
    qrReview: "Decoded Payload Review",
    qrUrl: "URL payload",
    qrText: "Text payload",
    inspected: "URL inspected",
    notInspected: "Not inspected",
    ocrConfidence: "OCR Confidence",
    visionQuality: "Vision Quality",
    visualCues: "Visual Cues",
    screenshotSignals: "Screenshot-Specific Signals",
    layoutSummary: "Layout Summary",
    ocrWarnings: "OCR Warnings",
    editExtractedText: "Edit Extracted Text",
    refineAndRescan: "Refine And Rescan",
    editableHint: "Correct OCR mistakes here, then rescan while keeping the screenshot and QR context.",
    rescanEditedText: "Rescan With Edited Text",
    rescanning: "Rescanning...",
    resetText: "Reset Text",
    manualOverride: "Manual override active",
    originalOcr: "Original OCR",
    noVisualCues: "No additional screenshot-specific visual cues were detected."
  };

  if (locale === "vi") {
    return {
      ...english,
      summary: "Tom Tat",
      threatBrief: "Nhanh Ve De Doa",
      extractedContent: "Noi Dung Da Trich Xuat",
      ocrPreview: "Xem Truoc OCR",
      forwardToIt: "Chuyen Cho IT",
      sessionHistory: "Lich Su Phien",
      recentScans: "Lan Quet Gan Day",
      currentSession: "Phien Hien Tai",
      savedSnapshots: (count: number) => `${count} anh chup ket qua da duoc luu.`,
      expand: "Mo Rong",
      collapse: "Thu Gon",
      liveSession: "Phien truc tiep",
      ocrDualModel: "OCR + hai mo hinh",
      dualModelReview: "Doi chieu hai mo hinh",
      ocrAi: "OCR + AI",
      aiAssisted: "Co AI ho tro",
      heuristicOnly: "Chi dung heuristic",
      qrCodes: "Ma QR Da Phat Hien",
      qrReview: "Xem Lai Du Lieu QR Da Giai Ma",
      qrUrl: "Noi dung URL",
      qrText: "Noi dung van ban",
      inspected: "Da kiem tra dich den",
      notInspected: "Chua kiem tra",
      ocrConfidence: "Do Tin Cay OCR",
      visionQuality: "Chat Luong Nhan Dang",
      visualCues: "Dau Hieu Hinh Anh",
      screenshotSignals: "Tin Hieu Rieng Cua Anh Chup Man Hinh",
      layoutSummary: "Tom Tat Bo Cuc",
      ocrWarnings: "Canh Bao OCR",
      editExtractedText: "Chinh Sua Noi Dung Da Trich Xuat",
      refineAndRescan: "Tinh Chinh Va Quet Lai",
      editableHint: "Sua loi OCR tai day roi quet lai, van giu boi canh anh chup va ma QR.",
      rescanEditedText: "Quet Lai Bang Noi Dung Da Sua",
      rescanning: "Dang quet lai...",
      resetText: "Dat Lai Van Ban",
      manualOverride: "Dang dung noi dung sua thu cong",
      originalOcr: "OCR Goc",
      noVisualCues: "Khong phat hien them dau hieu hinh anh dang chu y."
    };
  }
  if (locale === "es") {
    return {
      ...english,
      qrCodes: "Codigos QR Detectados",
      qrReview: "Revision de Cargas QR Decodificadas",
      qrUrl: "Carga URL",
      qrText: "Carga de texto",
      inspected: "URL inspeccionada",
      notInspected: "Sin inspeccion",
      ocrConfidence: "Confianza de OCR",
      visionQuality: "Calidad Visual",
      visualCues: "Pistas Visuales",
      screenshotSignals: "Senales Especificas de la Captura",
      layoutSummary: "Resumen Visual",
      ocrWarnings: "Advertencias de OCR",
      editExtractedText: "Editar Texto Extraido",
      refineAndRescan: "Ajustar y Reescanear",
      editableHint: "Corrige aqui los errores de OCR y vuelve a analizar manteniendo el contexto de la captura y del QR.",
      rescanEditedText: "Reescanear con el Texto Editado",
      rescanning: "Reescaneando...",
      resetText: "Restablecer Texto",
      manualOverride: "Se usa una correccion manual",
      originalOcr: "OCR Original",
      noVisualCues: "No se detectaron pistas visuales adicionales en la captura."
    };
  }
  if (locale === "zh") {
    return {
      ...english,
      qrCodes: "检测到的二维码",
      qrReview: "解码内容复核",
      qrUrl: "URL 内容",
      qrText: "文本内容",
      inspected: "已检查目标地址",
      notInspected: "未检查",
      ocrConfidence: "OCR 可信度",
      visionQuality: "视觉质量",
      visualCues: "视觉线索",
      screenshotSignals: "截图专属信号",
      layoutSummary: "画面概述",
      ocrWarnings: "OCR 警告",
      editExtractedText: "编辑提取文本",
      refineAndRescan: "修正后重新扫描",
      editableHint: "可在此修正 OCR 错误，然后在保留截图和二维码上下文的情况下重新扫描。",
      rescanEditedText: "使用编辑后的文本重新扫描",
      rescanning: "正在重新扫描...",
      resetText: "重置文本",
      manualOverride: "当前使用手动修正文案",
      originalOcr: "原始 OCR",
      noVisualCues: "未检测到额外的截图视觉信号。"
    };
  }
  if (locale === "ko") {
    return {
      ...english,
      qrCodes: "감지된 QR 코드",
      qrReview: "디코딩된 QR 내용 검토",
      qrUrl: "URL 내용",
      qrText: "텍스트 내용",
      inspected: "URL 검사 완료",
      notInspected: "미검사",
      ocrConfidence: "OCR 신뢰도",
      visionQuality: "시각 품질",
      visualCues: "시각 단서",
      screenshotSignals: "스크린샷 전용 신호",
      layoutSummary: "화면 요약",
      ocrWarnings: "OCR 경고",
      editExtractedText: "추출 텍스트 수정",
      refineAndRescan: "수정 후 재스캔",
      editableHint: "여기서 OCR 오류를 고친 뒤, 스크린샷과 QR 맥락을 유지한 채 다시 분석하세요.",
      rescanEditedText: "수정한 텍스트로 재스캔",
      rescanning: "재스캔 중...",
      resetText: "텍스트 재설정",
      manualOverride: "수동 수정 텍스트 사용 중",
      originalOcr: "원본 OCR",
      noVisualCues: "추가적인 스크린샷 시각 신호는 감지되지 않았습니다."
    };
  }
  if (locale === "tl") {
    return {
      ...english,
      qrCodes: "Mga Natukoy na QR Code",
      qrReview: "Review ng Na-decode na QR Payload",
      qrUrl: "URL payload",
      qrText: "Text payload",
      inspected: "Nasuri ang URL",
      notInspected: "Hindi nasuri",
      ocrConfidence: "Kumpiyansa ng OCR",
      visionQuality: "Kalidad ng Biswal",
      visualCues: "Mga Biswal na Pahiwatig",
      screenshotSignals: "Mga Signal na Espesipiko sa Screenshot",
      layoutSummary: "Buod ng Layout",
      ocrWarnings: "Mga Babala sa OCR",
      editExtractedText: "I-edit ang Na-extract na Teksto",
      refineAndRescan: "Ayusin at I-scan Muli",
      editableHint: "Ayusin dito ang mga OCR error, pagkatapos ay i-rescan habang pinananatili ang context ng screenshot at QR.",
      rescanEditedText: "I-rescan gamit ang Inedit na Teksto",
      rescanning: "Muling nagsa-scan...",
      resetText: "I-reset ang Teksto",
      manualOverride: "May aktibong manual override",
      originalOcr: "Orihinal na OCR",
      noVisualCues: "Walang dagdag na screenshot-specific visual cues na nakita."
    };
  }
  if (locale === "fr") {
    return {
      ...english,
      qrCodes: "Codes QR Detectes",
      qrReview: "Revision des Charges QR Decodees",
      qrUrl: "Charge URL",
      qrText: "Charge texte",
      inspected: "URL inspectee",
      notInspected: "Non inspectee",
      ocrConfidence: "Confiance OCR",
      visionQuality: "Qualite Visuelle",
      visualCues: "Indices Visuels",
      screenshotSignals: "Signaux Specifiques a la Capture",
      layoutSummary: "Resume de la Mise en Page",
      ocrWarnings: "Avertissements OCR",
      editExtractedText: "Modifier le Texte Extrait",
      refineAndRescan: "Ajuster et Reanalyser",
      editableHint: "Corrigez ici les erreurs OCR puis relancez l'analyse en conservant le contexte de la capture et du QR.",
      rescanEditedText: "Reanalyser avec le Texte Modifie",
      rescanning: "Reanalyse en cours...",
      resetText: "Reinitialiser le Texte",
      manualOverride: "Correction manuelle active",
      originalOcr: "OCR Original",
      noVisualCues: "Aucun indice visuel supplementaire n'a ete detecte."
    };
  }

  return english;
}

function ResultShell({
  title,
  eyebrow,
  children,
  className = "",
  delay = 0
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`ghost-border animate-fade-up bg-surface-container-low p-8 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function LoadingResults() {
  return (
    <section className="grid grid-cols-12 gap-6 animate-fade-up">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`loading-sheen ghost-border bg-surface-container-low p-8 ${index === 0 ? "col-span-12 md:col-span-5" : "col-span-12 md:col-span-7"}`}
        >
          <div className="h-3 w-28 bg-surface-container-highest" />
          <div className="mt-5 h-8 w-3/4 bg-surface-container-highest" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-full bg-surface-container-highest" />
            <div className="h-3 w-5/6 bg-surface-container-highest" />
            <div className="h-3 w-2/3 bg-surface-container-highest" />
          </div>
        </div>
      ))}
    </section>
  );
}

function PlaceholderFeatures() {
  return (
    <section className="grid grid-cols-12 gap-6 animate-fade-up">
      <div className="col-span-12 bg-primary-container p-8 md:col-span-6">
        <ShieldCheckIcon className="h-8 w-8 text-secondary" />
        <h3 className="mt-6 font-headline text-2xl font-bold tracking-tight text-vellum">Upload or Capture</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-primary-container">
          Drag in a screenshot, browse for an image file, or take a fresh photo from your device to start the vision scan.
        </p>
      </div>
      <div className="col-span-12 bg-surface-container-high p-8 md:col-span-6">
        <CheckCircleIcon className="h-8 w-8 text-secondary" />
        <h3 className="mt-6 font-headline text-2xl font-bold tracking-tight text-vellum">Vision + Guidance</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-surface-variant">
          CyberCoach extracts visible text, runs preserved phishing heuristics, and returns the same guidance/report flow as the original app.
        </p>
      </div>
    </section>
  );
}

function RiskAccent({ label }: { label: MessageScanResult["riskLabel"] }) {
  if (label === "High Risk") {
    return "text-[#ffb4ab]";
  }
  if (label === "Suspicious") {
    return "text-secondary";
  }
  return "text-[#d6e3ff]";
}

function RecommendedActionsCard({ actions }: { actions: string[] }) {
  const [checked, setChecked] = useState<number[]>([]);

  return (
    <div className="space-y-3">
      {actions.map((action, index) => {
        const active = checked.includes(index);
        return (
          <button
            key={action}
            type="button"
            onClick={() =>
              setChecked((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))
            }
            className={`flex w-full items-start gap-4 border px-4 py-4 text-left transition-all ${
              active
                ? "border-secondary/50 bg-secondary/10"
                : "border-outline-variant/30 bg-surface-container-lowest/50 hover:border-secondary/30 hover:bg-surface-container"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border ${
                active ? "border-secondary bg-secondary text-on-secondary" : "border-outline-variant text-outline"
              }`}
            >
              {active ? "✓" : index + 1}
            </span>
            <span className="text-sm leading-relaxed text-on-surface">{action}</span>
          </button>
        );
      })}
    </div>
  );
}

function analysisModeLabel(result: MessageScanResult, locale: SupportedLocale) {
  const metadata = result.raw.metadata ?? {};
  const aiAvailable = metadata.ai_available !== false;
  const ocr = metadata.ocr as { ocr_available?: boolean; provider_used?: string | null } | undefined;
  const screenshotCopy = getScreenshotResultCopy(locale);

  if (
    result.decisionSource === "consensus" ||
    result.decisionSource === "consensus_disagreement" ||
    result.decisionSource === "consensus_heuristic_override"
  ) {
    return ocr?.ocr_available ? screenshotCopy.ocrDualModel : screenshotCopy.dualModelReview;
  }
  if (ocr?.ocr_available && aiAvailable) {
    return screenshotCopy.ocrAi;
  }
  if (aiAvailable) {
    return screenshotCopy.aiAssisted;
  }
  return screenshotCopy.heuristicOnly;
}

function formatHistoryTime(isoDate: string, locale: SupportedLocale) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return getScreenshotResultCopy(locale).liveSession;
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

function normalizePossibleUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed.toLowerCase() : `https://${trimmed.replace(/^www\./i, "www.")}`.toLowerCase();
}

function QrCodesCard({ result, locale }: { result: MessageScanResult; locale: SupportedLocale }) {
  const screenshotCopy = getScreenshotResultCopy(locale);
  const inspectedUrls = new Set(
    [
      ...result.urlInspection.map((item) => item.normalized_url),
      ...result.urlEvidence.map((item) => item.normalized_url)
    ]
      .map((item) => normalizePossibleUrl(item))
      .filter(Boolean)
  );
  const payloads = result.screenshotOcr?.qrPayloads ?? [];

  if (payloads.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {payloads.map((payload) => {
        const isUrl = looksLikeUrl(payload);
        const inspected = isUrl && inspectedUrls.has(normalizePossibleUrl(payload));

        return (
          <div key={payload} className="ghost-border bg-surface-container-lowest/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {isUrl ? screenshotCopy.qrUrl : screenshotCopy.qrText}
              </span>
              <span className="border border-outline-variant/30 bg-surface-container px-3 py-1 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
                {isUrl ? (inspected ? screenshotCopy.inspected : screenshotCopy.notInspected) : screenshotCopy.qrText}
              </span>
            </div>
            <p className="mt-3 break-all font-mono text-sm leading-relaxed text-on-surface">{payload}</p>
          </div>
        );
      })}
    </div>
  );
}

function OcrConfidenceCard({ result, locale }: { result: MessageScanResult; locale: SupportedLocale }) {
  const screenshotOcr = result.screenshotOcr;
  const screenshotCopy = getScreenshotResultCopy(locale);

  if (!screenshotOcr) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-headline text-4xl font-extrabold tracking-editorial text-vellum">
            {screenshotOcr.confidence !== null ? `${Math.round(screenshotOcr.confidence * 100)}%` : "--"}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">{screenshotOcr.confidenceDisplay}</p>
        </div>
        {screenshotOcr.overrideUsed ? (
          <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
            {screenshotCopy.manualOverride}
          </span>
        ) : null}
      </div>

      {screenshotOcr.layoutSummary ? (
        <div className="ghost-border bg-surface-container-lowest/55 p-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            {screenshotCopy.layoutSummary}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-on-surface">{screenshotOcr.layoutSummary}</p>
        </div>
      ) : null}

      {screenshotOcr.warnings.length > 0 ? (
        <div className="space-y-3">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            {screenshotCopy.ocrWarnings}
          </p>
          <div className="space-y-3">
            {screenshotOcr.warnings.map((warning) => (
              <div key={warning} className="ghost-border bg-surface-container-lowest/55 p-4 text-sm leading-relaxed text-on-surface">
                {warning}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisualSignalsCard({ result, locale }: { result: MessageScanResult; locale: SupportedLocale }) {
  const screenshotOcr = result.screenshotOcr;
  const screenshotCopy = getScreenshotResultCopy(locale);
  const localizedFindingTypes = getScanLocaleCopy(locale).findingTypes;

  if (!screenshotOcr) {
    return null;
  }

  return (
    <div className="space-y-4">
      {screenshotOcr.visualSignals.length > 0 ? (
        screenshotOcr.visualSignals.map((signal) => (
          <div key={`${signal.type}-${signal.detail}`} className="ghost-border bg-surface-container-lowest/55 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {localizedFindingTypes[signal.type] ?? signal.type.replace(/_/g, " ")}
              </span>
              <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">{signal.severity}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-on-surface">{signal.detail}</p>
          </div>
        ))
      ) : (
        <p className="text-sm leading-relaxed text-on-surface-variant">{screenshotCopy.noVisualCues}</p>
      )}
    </div>
  );
}

export function ScreenshotScanResults({
  result,
  loading,
  historyItems,
  onCopyReport,
  onDownloadReport,
  onRestoreHistory,
  onRescanEditedText,
  reportBusy,
  rescanBusy,
  rescanAvailable
}: ScreenshotScanResultsProps) {
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);
  const decisionCopy = useMemo(() => getDecisionPanelCopy(result?.locale ?? "en"), [result?.locale]);
  const screenshotCopy = useMemo(() => getScreenshotResultCopy(result?.locale ?? "en"), [result?.locale]);
  const urlCopy = useMemo(() => getUrlResultCopy(result?.locale ?? "en"), [result?.locale]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editableExtractedText, setEditableExtractedText] = useState("");
  const extractedText = result?.screenshotOcr?.analysisText ?? result?.screenshotOcr?.extractedText ?? "";

  useEffect(() => {
    setEditableExtractedText(extractedText);
  }, [extractedText, result?.raw.metadata?.history_id]);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures />;
  }

  const currentSessionItems = historyItems.slice(0, 6);
  const showHistory = currentSessionItems.length > 1;
  const locale = resolveSupportedLocale(result.raw.metadata?.language?.toString() ?? result.locale);
  const originalOcrText = result.screenshotOcr?.originalExtractedText ?? result.screenshotOcr?.extractedText ?? "";
  const canRescanEditedText = rescanAvailable && editableExtractedText.trim().length > 0 && !rescanBusy;

  return (
    <section className="grid grid-cols-12 gap-6">
      <ResultShell title={result.riskLabelDisplay} eyebrow={copy.result.riskSummary} className="col-span-12 md:col-span-5">
        <div className="space-y-5">
          <div className={`font-headline text-5xl font-extrabold tracking-editorial ${RiskAccent({ label: result.riskLabel })}`}>
            {result.riskScore}
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
              {analysisModeLabel(result, result.locale)}
            </span>
            <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-vellum">
              {copy.result.confidence} {result.confidenceDisplay}
            </span>
            {result.consensus ? (
              <span className="border border-outline-variant/30 bg-surface-container-lowest/60 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-vellum">
                {getConsensusStatusLabel(result.consensus.status, result.locale)}
              </span>
            ) : null}
          </div>
          <div className="ghost-border bg-surface-container-lowest/60 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{copy.result.likelyPattern}</p>
            <p className="mt-2 text-lg font-semibold text-vellum">{result.likelyScamPattern}</p>
          </div>
          <p className="text-base leading-relaxed text-on-surface">{result.summary}</p>
        </div>
      </ResultShell>

      <ResultShell title={copy.result.recommendedActions} eyebrow={copy.result.whatToDoNext} className="col-span-12 md:col-span-7" delay={60}>
        <RecommendedActionsCard actions={result.recommendedActions} />
      </ResultShell>

      <ResultShell title={screenshotCopy.summary} eyebrow={screenshotCopy.threatBrief} className="col-span-12 md:col-span-6" delay={120}>
        <p className="text-sm leading-relaxed text-on-surface">{result.summary}</p>
      </ResultShell>

      <ResultShell title={copy.result.keyFindings} eyebrow={copy.result.patternScan} className="col-span-12 md:col-span-6" delay={180}>
        <div className="space-y-4">
          {result.topReasons.map((reason, index) => (
            <div key={reason} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-primary-container font-label text-[10px] font-bold text-secondary">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-on-surface">{reason}</p>
            </div>
          ))}
        </div>
      </ResultShell>

      {result.technicalDetails.length > 0 ? (
        <ResultShell title={copy.result.technicalDetails} eyebrow={copy.result.triggeredRules} className="col-span-12" delay={240}>
          <div className="grid gap-4 md:grid-cols-2">
            {result.technicalDetails.map((detail) => (
              <div key={`${detail.label}-${detail.detail}`} className="ghost-border bg-surface-container-lowest/55 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {detail.label}
                  </span>
                  <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline">{detail.severity}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{detail.detail}</p>
              </div>
            ))}
          </div>
        </ResultShell>
      ) : null}

      {result.screenshotOcr?.qrPayloads.length ? (
        <ResultShell title={screenshotCopy.qrCodes} eyebrow={screenshotCopy.qrReview} className="col-span-12" delay={246}>
          <QrCodesCard result={result} locale={locale} />
        </ResultShell>
      ) : null}

      {result.screenshotOcr ? (
        <ResultShell title={screenshotCopy.ocrConfidence} eyebrow={screenshotCopy.visionQuality} className="col-span-12 md:col-span-4" delay={248}>
          <OcrConfidenceCard result={result} locale={locale} />
        </ResultShell>
      ) : null}

      {result.screenshotOcr ? (
        <ResultShell title={screenshotCopy.visualCues} eyebrow={screenshotCopy.screenshotSignals} className="col-span-12 md:col-span-8" delay={250}>
          <VisualSignalsCard result={result} locale={locale} />
        </ResultShell>
      ) : null}

      {result.evidenceBuckets.length > 0 ? (
        <ResultShell title={urlCopy.evidenceBuckets} eyebrow={urlCopy.riskLayers} className="col-span-12 2xl:col-span-4" delay={255}>
          <EvidenceBucketsCard result={result} />
        </ResultShell>
      ) : null}

      {result.urlInspection.length > 0 ? (
        <ResultShell title={urlCopy.destinationInspection} eyebrow={urlCopy.liveDestinationReview} className="col-span-12 2xl:col-span-8" delay={265}>
          <DestinationInspectionCard result={result} />
        </ResultShell>
      ) : null}

      <ResultShell title={decisionCopy.titles.decisionTrace} eyebrow={decisionCopy.titles.consensusEngine} className="col-span-12 md:col-span-4" delay={270}>
        <DecisionSummaryPanel result={result} />
      </ResultShell>

      <ResultShell title={decisionCopy.titles.modelAssessments} eyebrow={decisionCopy.titles.crossModelReview} className="col-span-12 md:col-span-8" delay={285}>
        <ModelAssessmentsPanel result={result} />
      </ResultShell>

      {result.urlEvidence.length > 0 ? (
        <ResultShell title={decisionCopy.titles.urlEvidence} eyebrow={decisionCopy.titles.domainIntelligence} className="col-span-12" delay={295}>
          <UrlEvidencePanel result={result} />
        </ResultShell>
      ) : null}

      {result.quickTip ? (
        <ResultShell title={copy.result.quickTip} eyebrow={copy.result.educationalGuidance} className="col-span-12 md:col-span-8" delay={300}>
          <p className="text-sm leading-relaxed text-on-surface">{result.quickTip}</p>
        </ResultShell>
      ) : null}

      {result.privacyNote ? (
        <ResultShell title={copy.result.privacyNoteTitle} eyebrow={copy.result.protectedReview} className="col-span-12 md:col-span-4" delay={360}>
          <div className="flex items-start gap-4">
            <LockIcon className="mt-1 h-6 w-6 shrink-0 text-secondary" />
            <p className="text-sm leading-relaxed text-on-surface">{result.privacyNote}</p>
          </div>
        </ResultShell>
      ) : null}

      {extractedText ? (
        <ResultShell title={screenshotCopy.editExtractedText} eyebrow={screenshotCopy.refineAndRescan} className="col-span-12" delay={420}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-on-surface-variant">{screenshotCopy.editableHint}</p>
            <div className="ghost-border bg-surface-container-lowest/60 p-5">
              <textarea
                value={editableExtractedText}
                onChange={(event) => setEditableExtractedText(event.target.value)}
                className="min-h-[220px] w-full resize-y bg-transparent font-mono text-sm leading-relaxed text-on-surface outline-none"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onRescanEditedText(editableExtractedText)}
                disabled={!canRescanEditedText}
                className="editorial-button justify-between px-5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{rescanBusy ? screenshotCopy.rescanning : screenshotCopy.rescanEditedText}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditableExtractedText(originalOcrText)}
                disabled={rescanBusy || editableExtractedText === originalOcrText}
                className="border border-outline-variant/30 bg-surface-container-lowest/60 px-5 py-3 font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum transition-colors hover:border-secondary/30 hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {screenshotCopy.resetText}
              </button>
            </div>
            {result.screenshotOcr?.overrideUsed && result.screenshotOcr.originalExtractedText ? (
              <div className="ghost-border bg-surface-container-lowest/45 p-4">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  {screenshotCopy.originalOcr}
                </p>
                <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-on-surface-variant">
                  {result.screenshotOcr.originalExtractedText}
                </pre>
              </div>
            ) : null}
          </div>
        </ResultShell>
      ) : null}

      <ResultShell title={copy.result.reportActions} eyebrow={screenshotCopy.forwardToIt} className="col-span-12 xl:col-span-6" delay={480}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button type="button" onClick={() => void onCopyReport()} className="editorial-button min-h-[72px] justify-between px-5 py-4">
            <span className="max-w-[14ch] text-left">{reportBusy === "copy" ? copy.result.copying : copy.result.copyReport}</span>
            <span className="text-secondary">TXT</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("txt")} className="editorial-button min-h-[72px] justify-between px-5 py-4">
            <span className="max-w-[14ch] text-left">{reportBusy === "txt" ? copy.result.preparing : copy.result.downloadTxt}</span>
            <span className="text-secondary">.txt</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("md")} className="editorial-button min-h-[72px] justify-between px-5 py-4">
            <span className="max-w-[14ch] text-left">{reportBusy === "md" ? copy.result.preparing : copy.result.downloadMd}</span>
            <span className="text-secondary">.md</span>
          </button>
        </div>
      </ResultShell>

      {showHistory ? (
        <ResultShell title={screenshotCopy.sessionHistory} eyebrow={screenshotCopy.recentScans} className="col-span-12 xl:col-span-6" delay={540}>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 border border-outline-variant/30 bg-surface-container-lowest/60 px-5 py-4 text-left transition-colors hover:border-secondary/30 hover:bg-surface-container"
            >
              <span className="min-w-0">
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                  {screenshotCopy.currentSession}
                </span>
                <p className="mt-1 text-sm text-on-surface-variant">{screenshotCopy.savedSnapshots(currentSessionItems.length)}</p>
              </span>
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-vellum">
                {historyOpen ? screenshotCopy.collapse : screenshotCopy.expand}
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
                          {item.scanType} · {formatHistoryTime(item.createdAt, result.locale)}
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
                        {getScanLocaleCopy(locale).riskLabels[item.riskLabel]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ResultShell>
      ) : null}
    </section>
  );
}
