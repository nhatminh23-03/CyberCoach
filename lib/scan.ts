import { resolveDirectBackendApiBase } from "@/lib/runtimeConfig";

export type SupportedLocale = "en" | "es" | "zh" | "vi" | "ko" | "tl" | "fr";

export type BackendHeuristicFinding = {
  type: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type BackendModelRun = {
  slot: "primary" | "secondary";
  model: string;
  risk_level: "safe" | "suspicious" | "high_risk";
  confidence: number | null;
  reasons: string[];
  actions: string[];
  explanation: string;
};

export type BackendConsensus = {
  status: "agree" | "disagree" | "single_model" | "heuristic_fallback";
  summary: string;
  models_compared: number;
  agree: boolean;
  strategy: string;
};

export type BackendUrlEvidence = {
  normalized_url: string;
  domain: string;
  registrable_domain: string;
  subdomain: string;
  tld: string;
  subdomain_count: number;
  is_raw_ip: boolean;
  is_shortened: boolean;
};

export type BackendUrlRedirect = {
  from_url: string;
  to_url: string;
  status_code: number;
};

export type BackendUrlInspection = {
  normalized_url: string;
  domain: string;
  registrable_domain: string;
  inspection_attempted: boolean;
  inspection_succeeded: boolean;
  blocked_reason: string | null;
  error: string | null;
  final_url: string | null;
  final_domain: string | null;
  final_registrable_domain: string | null;
  status_code: number | null;
  content_type: string | null;
  redirect_chain: BackendUrlRedirect[];
  page_title: string | null;
  page_excerpt: string | null;
  form_count: number;
  password_field_count: number;
  external_form_action: boolean;
  meta_refresh_target: string | null;
  login_keywords: string[];
  truncated: boolean;
};

export type BackendEvidenceBucket = {
  key: "structural" | "reputation" | "destination";
  score: number;
  finding_count: number;
  summary: string;
  inspected?: boolean;
};

export type BackendModelError = {
  slot: "primary" | "secondary";
  model: string;
  error: string;
};

export type BackendScreenshotVisualSignal = {
  type: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type BackendOcrMetadata = {
  media_type?: string;
  provider_used?: string | null;
  model?: string | null;
  ocr_available?: boolean;
  extracted_text?: string;
  analysis_text?: string;
  original_extracted_text?: string;
  ocr_confidence?: number | null;
  ocr_quality?: "high" | "medium" | "low" | null;
  ocr_warnings?: string[];
  layout_summary?: string;
  visual_signals?: BackendScreenshotVisualSignal[];
  qr_payloads?: string[];
  qr_detected?: boolean;
  ocr_override_used?: boolean;
  ocr_override_text?: string;
  reason?: string;
};

export type BackendDocumentLink = {
  display_text?: string;
  target_url?: string;
  target_domain?: string;
  registrable_domain?: string;
  display_domain?: string | null;
  claimed_entity?: string | null;
  official_match?: boolean;
  display_target_mismatch?: boolean;
  is_call_to_action?: boolean;
  is_shortened?: boolean;
  is_raw_ip?: boolean;
  suspicious_tld?: boolean;
  subdomain_count?: number;
};

export type BackendDocumentMetadata = {
  file_name?: string;
  file_type?: string;
  media_type?: string;
  file_size?: number;
  parser?: string;
  inspectable?: boolean;
  protected?: boolean;
  partial_analysis?: boolean;
  image_based?: boolean;
  macro_enabled?: boolean;
  page_count?: number | null;
  section_count?: number | null;
  image_count?: number;
  text_truncated?: boolean;
  text_preview?: string;
  extracted_text?: string;
  ocr_text?: string;
  ocr_fallback_used?: boolean;
  ocr_pages_analyzed?: number;
  ocr_page_limit?: number;
  extracted_urls?: string[];
  link_pairs?: BackendDocumentLink[];
  qr_payloads?: string[];
  limitations?: string[];
};

export type BackendVoiceTranscriptSegment = {
  text: string;
  timestamp?: string;
};

export type BackendVoiceMetadata = {
  session_id?: string;
  analysis_state?: "live" | "final" | string;
  started_at?: string;
  updated_at?: string;
  elapsed_seconds?: number;
  transcript_text?: string;
  transcript_segments?: BackendVoiceTranscriptSegment[];
  transcript_word_count?: number;
  challenge_questions?: string[];
  live_warnings?: string[];
  voice_signals?: BackendHeuristicFinding[];
  listening_mode?: string;
  source_file_name?: string;
  source_file_size?: number;
  source_media_type?: string;
  transcription_source?: string;
  transcription_model?: string;
  limitations?: string[];
  live_ai_state?: "heuristics_live_only" | "ai_live_pending" | "ai_live_active" | "ai_live_unavailable" | "final_ai_reviewed" | string;
  live_ai_summary?: string;
  live_ai_reasons?: string[];
  live_ai_confidence?: string | null;
  live_ai_last_updated_at?: string;
  live_ai_attempted?: boolean;
  live_ai_action?: string | null;
};

export type BackendScanResponse = {
  scan_type: "message" | "url" | "screenshot" | "document" | "voice";
  risk_label: "Safe" | "Suspicious" | "High Risk";
  risk_score: number;
  confidence: "Low" | "Medium" | "High";
  likely_scam_pattern: string;
  summary: string;
  top_reasons: string[];
  recommended_actions: string[];
  signals: string[];
  original_input: string;
  redacted_input: string | null;
  provider_used: string | null;
  metadata?: {
    heuristic_findings?: BackendHeuristicFinding[];
    heuristic_score?: number;
    redaction_count?: number;
    redactions?: Array<{ type: string; original?: string }>;
    language?: string;
    history_count?: number;
    decision_source?: string;
    consensus?: BackendConsensus;
    model_runs?: BackendModelRun[];
    url_evidence?: BackendUrlEvidence[];
    url_live_inspection?: BackendUrlInspection[];
    evidence_buckets?: BackendEvidenceBucket[];
    model_errors?: BackendModelError[];
    ocr?: BackendOcrMetadata;
    document?: BackendDocumentMetadata;
    voice?: BackendVoiceMetadata;
    [key: string]: unknown;
  };
};

export type ScoreBreakdownItem = {
  label: string;
  points: number;
  severity: "high" | "medium" | "low";
  detail: string;
};

export type TechnicalDetailItem = {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type DocumentAnalysisResult = {
  fileName: string;
  fileType: string;
  mediaType: string;
  fileSize: number;
  fileSizeDisplay: string;
  parser: string;
  inspectable: boolean;
  protected: boolean;
  partialAnalysis: boolean;
  imageBased: boolean;
  macroEnabled: boolean;
  pageCount: number | null;
  sectionCount: number | null;
  imageCount: number;
  textPreview: string;
  extractedText: string;
  ocrText: string;
  ocrFallbackUsed: boolean;
  ocrPagesAnalyzed: number;
  ocrPageLimit: number;
  extractedUrls: string[];
  linkPairs: BackendDocumentLink[];
  qrPayloads: string[];
  limitations: string[];
};

export type MessageScanResult = {
  riskLabel: BackendScanResponse["risk_label"];
  riskLabelDisplay: string;
  riskScore: number;
  confidence: BackendScanResponse["confidence"];
  confidenceDisplay: string;
  likelyScamPattern: string;
  summary: string;
  topReasons: string[];
  recommendedActions: string[];
  signals: string[];
  technicalDetails: TechnicalDetailItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  privacyNote: string | null;
  quickTip: string | null;
  originalInput: string;
  redactedInput: string | null;
  providerUsed: string | null;
  providerLabel: string;
  decisionSource: string;
  consensus: BackendConsensus | null;
  modelRuns: BackendModelRun[];
  urlEvidence: BackendUrlEvidence[];
  urlInspection: BackendUrlInspection[];
  evidenceBuckets: BackendEvidenceBucket[];
  modelErrors: BackendModelError[];
  screenshotOcr: {
    available: boolean;
    extractedText: string;
    analysisText: string;
    originalExtractedText: string | null;
    confidence: number | null;
    confidenceDisplay: string;
    quality: "high" | "medium" | "low" | null;
    warnings: string[];
    layoutSummary: string | null;
    visualSignals: BackendScreenshotVisualSignal[];
    qrPayloads: string[];
    qrDetected: boolean;
    overrideUsed: boolean;
  } | null;
  documentAnalysis: DocumentAnalysisResult | null;
  voiceAnalysis: {
    sessionId: string;
    analysisState: string;
    startedAt: string | null;
    updatedAt: string | null;
    elapsedSeconds: number;
    transcriptText: string;
    transcriptSegments: BackendVoiceTranscriptSegment[];
    transcriptWordCount: number;
    challengeQuestions: string[];
    liveWarnings: string[];
    voiceSignals: BackendHeuristicFinding[];
    listeningMode: string | null;
    sourceFileName: string | null;
    sourceFileSize: number | null;
    sourceMediaType: string | null;
    transcriptionSource: string | null;
    transcriptionModel: string | null;
    limitations: string[];
    liveAiState: string;
    liveAiSummary: string;
    liveAiReasons: string[];
    liveAiConfidence: string | null;
    liveAiLastUpdatedAt: string | null;
    liveAiAttempted: boolean;
    liveAiAction: string | null;
  } | null;
  locale: SupportedLocale;
  privacyModeEnabled: boolean;
  raw: BackendScanResponse;
};

export type MessageSample = {
  id: string;
  label: string;
  text: string;
};

export type MessageSamplesResponse = {
  presets: MessageSample[];
  random_real_phish: MessageSample | null;
};

export type BackendHistoryEntry = {
  entry_id: number;
  created_at: string;
  scan_type: string;
  risk_label: "Safe" | "Suspicious" | "High Risk";
  snippet: string;
  result: BackendScanResponse;
};

export type BackendHistoryResponse = {
  items: BackendHistoryEntry[];
};

export type ScanHistoryItem = {
  id: number;
  createdAt: string;
  scanType: string;
  riskLabel: "Safe" | "Suspicious" | "High Risk";
  riskLabelDisplay: string;
  snippet: string;
};

export type DetailedScanHistoryItem = ScanHistoryItem & {
  raw: BackendScanResponse;
};

export type BackendIntelFeedItem = {
  id: string;
  title: string;
  copy: string;
  accent: "secondary" | "outline";
  category: string;
  source: string;
  publisher: string;
  reference_url: string | null;
  published_at: string;
  last_verified_at: string;
};

export type BackendIntelFeedResponse = {
  items: BackendIntelFeedItem[];
};

export type IntelFeedItem = {
  id: string;
  title: string;
  copy: string;
  accent: "secondary" | "outline";
  category: string;
  source: string;
  publisher: string;
  referenceUrl: string | null;
  publishedAt: string;
  lastVerifiedAt: string;
};

export type UrlPrecheckResponse = {
  normalized_url: string;
  domain: string;
  registrable_domain: string;
  tld: string;
  subdomain_count: number;
  is_raw_ip: boolean;
  is_shortened: boolean;
  phishtank_loaded: boolean;
  phishtank_hit: boolean;
  phishtank_count: number;
};

export type UrlPrecheck = {
  normalizedUrl: string;
  domain: string;
  registrableDomain: string;
  tld: string;
  subdomainCount: number;
  isRawIp: boolean;
  isShortened: boolean;
  phishTankLoaded: boolean;
  phishTankHit: boolean;
  phishTankCount: number;
};

export type ScanCapabilities = {
  screenshotAnalysisAvailable: boolean;
  screenshotRequiresApiKey: boolean;
  llmProvider: string | null;
  llmModel: string | null;
  scanHistoryAvailable?: boolean;
  voiceLiveBrowserMode?: boolean;
  voiceLiveStreamingAvailable?: boolean;
  voiceRecordingUploadAvailable?: boolean;
  voiceRecordingAutoTranscriptionAvailable?: boolean;
};

export type VoiceSessionBootstrap = {
  session_id: string;
  status: string;
  language: string;
  privacy_mode: boolean;
  started_at: string;
  challenge_questions: string[];
  limitations: string[];
};

export type VoiceSignalInput = {
  type: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type VoiceTranscriptSegmentInput = {
  text: string;
  timestamp: string;
};

type ScanLocaleCopy = {
  result: {
    riskSummary: string;
    heuristicScore: string;
    confidence: string;
    likelyPattern: string;
    recommendedActions: string;
    whatToDoNext: string;
    keyFindings: string;
    patternScan: string;
    technicalDetails: string;
    triggeredRules: string;
    noTriggeredRules: string;
    privacyNoteTitle: string;
    protectedReview: string;
    quickTip: string;
    educationalGuidance: string;
    riskScoreBreakdown: string;
    advancedReview: string;
    scoreDetails: string;
    scoreDetailsDescription: string;
    collapse: string;
    expand: string;
    noDetailedBreakdown: string;
    reportActions: string;
    forwardOrArchive: string;
    copyReport: string;
    copying: string;
    downloadTxt: string;
    downloadMd: string;
    preparing: string;
  };
  riskLabels: Record<BackendScanResponse["risk_label"], string>;
  confidenceLabels: Record<BackendScanResponse["confidence"], string>;
  providerLabels: {
    heuristic: string;
    openrouter: string;
    anthropic: string;
  };
  privacy: {
    redacted: (count: number) => string;
    enabledNoRedaction: string;
  };
  tips: {
    urgency: string;
    domain: string;
    credentials: string;
    direct: string;
    default: string;
  };
  findingTypes: Record<string, string>;
  report: {
    title: string;
    riskLevel: string;
    confidence: string;
    likelyPattern: string;
    summary: string;
    keyFindings: string;
    recommendedActions: string;
    privacyMode: string;
    end: string;
  };
};

const API_BASE_URL = "/api";
let scanHistoryAvailableCache: boolean | null = null;

function normalizeReportText(value: unknown, multiline = false) {
  if (value == null) {
    return "";
  }

  const normalized = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

  if (multiline) {
    return normalized
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getDirectBackendApiBase() {
  return resolveDirectBackendApiBase({
    publicApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? process.env.ENVIRONMENT,
    browserHostname: typeof window !== "undefined" ? window.location.hostname : undefined,
    browserProtocol: typeof window !== "undefined" ? window.location.protocol : undefined,
  });
}

export function getVoiceRealtimeSocketUrl() {
  const base = getDirectBackendApiBase().replace(/\/$/, "");
  return base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:") + "/scan/voice/ws";
}

async function fetchHistoryResponse() {
  if (scanHistoryAvailableCache === false) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/scan/history`, {
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 404) {
      scanHistoryAvailableCache = false;
      return null;
    }
    return null;
  }

  scanHistoryAvailableCache = true;
  return response;
}

const FALLBACK_MESSAGE_SAMPLES: MessageSamplesResponse = {
  presets: [
    {
      id: "phishing_email",
      label: "Phishing email",
      text: `From: Apple Support <security-alert@app1e-verify.xyz>
Subject: Your Apple ID has been suspended

Dear Customer,

We detected unusual activity on your Apple ID. Your account has been temporarily suspended.

To restore access, please verify your identity within 24 hours or your account will be permanently deleted.

Click here to verify: https://app1e-secure-login.xyz/verify?id=8372

If you do not take immediate action, you will lose access to all purchases and iCloud data.

Apple Support Team`
    },
    {
      id: "legit_newsletter",
      label: "Legit newsletter",
      text: `From: GitHub <noreply@github.com>
Subject: [GitHub] Your monthly developer digest

Hey there!

Here's what happened in your repositories this month:
- 23 commits pushed to main branches
- 5 pull requests merged
- 2 new stars on your projects

Check out what's trending in open source this week on our Explore page.

Happy coding!
The GitHub Team

Unsubscribe: https://github.com/settings/notifications`
    },
    {
      id: "sms_scam",
      label: "SMS scam",
      text: `USPS: Your package #US9514901185421 has a delivery problem. Update your address now to avoid return to sender: https://usps-redelivery.top/track?ref=9514901185421

Reply STOP to unsubscribe`
    }
  ],
  random_real_phish: null
};

const SCAN_COPY: Record<SupportedLocale, ScanLocaleCopy> = {
  en: {
    result: {
      riskSummary: "Risk Summary",
      heuristicScore: "Heuristic score",
      confidence: "Confidence",
      likelyPattern: "Main concern",
      recommendedActions: "Recommended Actions",
      whatToDoNext: "What To Do Next",
      keyFindings: "Key Findings",
      patternScan: "Why this was flagged",
      technicalDetails: "Scan Details",
      triggeredRules: "Technical reasons",
      noTriggeredRules: "CyberCoach did not add extra technical reasons for this result.",
      privacyNoteTitle: "Privacy Note",
      protectedReview: "Privacy First",
      quickTip: "Quick Tip",
      educationalGuidance: "Keep In Mind",
      riskScoreBreakdown: "How the score was built",
      advancedReview: "Scoring Details",
      scoreDetails: "View score details",
      scoreDetailsDescription: "See which signals added to the overall risk score.",
      collapse: "Collapse",
      expand: "Expand",
      noDetailedBreakdown: "No detailed scoring breakdown is available for this result.",
      reportActions: "Report Actions",
      forwardOrArchive: "Save Or Share",
      copyReport: "Copy Report",
      copying: "Copying...",
      downloadTxt: "Download TXT",
      downloadMd: "Download MD",
      preparing: "Preparing..."
    },
    riskLabels: { Safe: "Safe", Suspicious: "Suspicious", "High Risk": "High Risk" },
    confidenceLabels: { Low: "Low", Medium: "Medium", High: "High" },
    providerLabels: { heuristic: "Local Review", openrouter: "AI Review (OpenRouter)", anthropic: "AI Review (Anthropic)" },
    privacy: {
      redacted: (count) =>
        `${count} piece${count === 1 ? "" : "s"} of personal info ${count === 1 ? "was" : "were"} redacted before analysis and hidden from the returned result`,
      enabledNoRedaction: "Privacy mode was enabled. No personal details needed redaction, and raw input was not returned separately."
    },
    tips: {
      urgency: "Scammers create panic so you act before thinking. If a message is rushing you, slow down before you click.",
      domain: "Pause before trusting a link. The real clue is the final destination domain, not the brand name written in the message.",
      credentials: "Legitimate companies do not ask for your password, SSN, or full card details by text or email. Treat those requests as hostile.",
      direct: "When in doubt, do not use the link in the message. Open the company’s official site in a new tab and verify there.",
      default: "If a message feels emotionally loaded, urgent, or unusually personal, that is often the moment to verify it through a safer channel."
    },
    findingTypes: {
      domain_mismatch: "Brand name and link do not match",
      suspicious_tld: "Unusual website ending",
      urgency: "Pressure to act quickly",
      credential_ask: "Asks for passwords or codes",
      sender_spoof: "Sender may be impersonated",
      homoglyph: "Lookalike letters in the link",
      shortened_url: "Shortened link hides the destination",
      ip_address_url: "Link uses a raw IP address",
      excessive_subdomains: "Unusually deep subdomains",
      phishtank_match: "Known phishing link",
      cross_domain_redirect: "Redirects to another site",
      multi_hop_redirect: "Multiple redirects",
      meta_refresh_redirect: "Page tries to redirect automatically",
      external_form_action: "Form sends data to another site",
      insecure_destination: "Destination is not secure",
      login_form: "Login form on the destination page",
      page_brand_impersonation: "Destination looks like brand impersonation",
      credential_lure_page: "Destination tries to collect sign-in details",
      document_macro_enabled: "Document can run macros",
      qr_account_lure: "QR code pushes you to sign in",
      visual_mobile_message_ui: "Looks like a mobile message",
      visual_delivery_notice_ui: "Looks like a delivery notice",
      visual_payment_request_ui: "Looks like a payment request",
      visual_credential_prompt: "Looks like a sign-in prompt",
      visual_partial_login_ui: "Looks like an incomplete login screen",
      visual_system_alert_ui: "Looks like a system warning",
      visual_account_security_ui: "Looks like an account security alert",
      visual_browser_chrome_ui: "Looks like a browser or address bar",
      visual_banking_app_ui: "Looks like a banking or payment app",
      visual_notification_banner_ui: "Looks like a notification prompt",
      visual_cropped_context_ui: "Important context may be cropped out",
      destination_lookup_blocked: "Destination check was blocked",
      destination_lookup_unavailable: "Destination check was unavailable",
      destination_lookup_timeout: "Destination check timed out",
      destination_lookup_unresolved: "Destination could not be reached",
      visual_urgent_cta: "Looks like an urgent action button",
      visual_brand_impersonation: "Looks like brand impersonation",
      official_entity_impersonation: "Pretends to be a trusted organization",
      subdomain_impersonation: "Subdomain is trying to look official",
      legal_threat: "Threatens penalties or legal action",
      deadline_conflict: "Uses a suspicious deadline",
      invoice_payment_pressure: "Pressures you about payment or invoices",
      document_protected: "Document could not be fully opened",
      document_deceptive_cta: "Document uses a misleading button or prompt",
      document_link_mismatch: "Document text and link destination do not match",
      document_qr_payload: "Document includes a risky QR destination",
      document_image_only: "Document is image-based, so review is limited",
      document_partial_analysis: "Document review was only partial",
      voice_family_emergency: "Uses a family emergency story",
      voice_bank_impersonation: "Pretends to be from a bank or card issuer",
      voice_government_impersonation: "Pretends to be from a government office",
      voice_payment_request: "Asks for money or urgent payment",
      voice_otp_request: "Asks for a one-time code",
      voice_secrecy_pressure: "Tells you to keep the call secret",
      voice_call_control: "Tries to keep you on the line or control the call",
      voice_pattern_suspicious: "Voice patterns feel unusual",
      voice_audio_quality_limited: "Audio quality makes the call harder to judge",
      signal: "Signal"
    },
    report: {
      title: "CyberCoach Safety Report",
      riskLevel: "Risk Level",
      confidence: "Confidence",
      likelyPattern: "Likely Scam Pattern",
      summary: "Summary",
      keyFindings: "Key Findings",
      recommendedActions: "Recommended Actions",
      privacyMode: "Privacy Mode",
      end: "End of Report"
    }
  },
  es: {
    result: {
      riskSummary: "Resumen de Riesgo",
      heuristicScore: "Puntuacion heuristica",
      confidence: "Confianza",
      likelyPattern: "Principal preocupacion",
      recommendedActions: "Acciones Recomendadas",
      whatToDoNext: "Que Hacer Ahora",
      keyFindings: "Hallazgos Clave",
      patternScan: "Por que se marco",
      technicalDetails: "Detalles del Analisis",
      triggeredRules: "Motivos tecnicos",
      noTriggeredRules: "CyberCoach no agrego motivos tecnicos adicionales para este resultado.",
      privacyNoteTitle: "Nota de Privacidad",
      protectedReview: "Privacidad Primero",
      quickTip: "Consejo Rapido",
      educationalGuidance: "Tenlo en cuenta",
      riskScoreBreakdown: "Como se calculo el puntaje",
      advancedReview: "Detalle del Puntaje",
      scoreDetails: "Ver detalle del puntaje",
      scoreDetailsDescription: "Mira que senales elevaron el puntaje de riesgo.",
      collapse: "Ocultar",
      expand: "Expandir",
      noDetailedBreakdown: "No hay un desglose detallado del puntaje para este resultado.",
      reportActions: "Acciones del Informe",
      forwardOrArchive: "Guardar o Compartir",
      copyReport: "Copiar Informe",
      copying: "Copiando...",
      downloadTxt: "Descargar TXT",
      downloadMd: "Descargar MD",
      preparing: "Preparando..."
    },
    riskLabels: { Safe: "Seguro", Suspicious: "Sospechoso", "High Risk": "Alto Riesgo" },
    confidenceLabels: { Low: "Baja", Medium: "Media", High: "Alta" },
    providerLabels: { heuristic: "Motor Heuristico", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `Se ${count === 1 ? "redacto" : "redactaron"} ${count} dato${count === 1 ? "" : "s"} personal${count === 1 ? "" : "es"} antes del analisis`,
      enabledNoRedaction: "El modo de privacidad estaba activo. Ningun dato personal requirio redaccion antes del analisis."
    },
    tips: {
      urgency: "Los estafadores crean panico para que actues sin pensar. Si un mensaje te apura, reduce la velocidad antes de hacer clic.",
      domain: "Haz una pausa antes de confiar en un enlace. La pista real es el dominio final de destino, no la marca escrita en el mensaje.",
      credentials: "Las empresas legitimas no piden tu contrasena, SSN ni datos completos de tarjeta por texto o correo. Trata esas solicitudes como hostiles.",
      direct: "Si tienes dudas, no uses el enlace del mensaje. Abre el sitio oficial de la empresa en una nueva pestana y verifica alli.",
      default: "Si un mensaje se siente emocional, urgente o demasiado personal, ese suele ser el momento de verificar por un canal mas seguro."
    },
    findingTypes: {
      domain_mismatch: "Dominio Incongruente",
      suspicious_tld: "TLD Sospechoso",
      urgency: "Urgencia",
      credential_ask: "Solicitud de Credenciales",
      sender_spoof: "Suplantacion del Remitente",
      homoglyph: "Homoglifo",
      shortened_url: "URL Acortada",
      ip_address_url: "URL con IP",
      excessive_subdomains: "Subdominios Excesivos",
      phishtank_match: "Coincidencia con PhishTank",
      cross_domain_redirect: "Redireccion Entre Dominios",
      multi_hop_redirect: "Redireccion en Multiples Saltos",
      meta_refresh_redirect: "Redireccion Meta Refresh",
      external_form_action: "Formulario hacia Otro Dominio",
      insecure_destination: "Destino No Seguro",
      login_form: "Formulario de Inicio de Sesion",
      page_brand_impersonation: "Suplantacion de Marca en la Pagina",
      credential_lure_page: "Pagina que Busca Credenciales",
      qr_account_lure: "Señuelo de Cuenta por QR",
      visual_mobile_message_ui: "Interfaz de mensaje movil",
      visual_delivery_notice_ui: "Interfaz de aviso de entrega",
      visual_payment_request_ui: "Interfaz de solicitud de pago",
      visual_credential_prompt: "Interfaz de solicitud de credenciales",
      visual_system_alert_ui: "Interfaz de alerta del sistema",
      visual_account_security_ui: "Interfaz de seguridad de cuenta",
      visual_urgent_cta: "Interfaz de accion urgente",
      visual_brand_impersonation: "Interfaz de suplantacion de marca",
      signal: "Senal"
    },
    report: {
      title: "Informe de Seguridad de CyberCoach",
      riskLevel: "Nivel de Riesgo",
      confidence: "Confianza",
      likelyPattern: "Patron de Estafa Probable",
      summary: "Resumen",
      keyFindings: "Hallazgos Clave",
      recommendedActions: "Acciones Recomendadas",
      privacyMode: "Modo de Privacidad",
      end: "Fin del Informe"
    }
  },
  zh: {
    result: {
      riskSummary: "风险摘要",
      heuristicScore: "启发式分数",
      confidence: "置信度",
      likelyPattern: "主要顾虑",
      recommendedActions: "建议操作",
      whatToDoNext: "下一步怎么做",
      keyFindings: "关键发现",
      patternScan: "为什么会被标记",
      technicalDetails: "扫描细节",
      triggeredRules: "技术原因",
      noTriggeredRules: "CyberCoach 没有为这个结果补充额外的技术原因。",
      privacyNoteTitle: "隐私说明",
      protectedReview: "隐私优先",
      quickTip: "快速提示",
      educationalGuidance: "提醒",
      riskScoreBreakdown: "分数是如何形成的",
      advancedReview: "分数细节",
      scoreDetails: "查看分数细节",
      scoreDetailsDescription: "查看哪些信号提高了风险分数。",
      collapse: "收起",
      expand: "展开",
      noDetailedBreakdown: "此结果没有更详细的分数拆解。",
      reportActions: "报告操作",
      forwardOrArchive: "保存或分享",
      copyReport: "复制报告",
      copying: "复制中...",
      downloadTxt: "下载 TXT",
      downloadMd: "下载 MD",
      preparing: "准备中..."
    },
    riskLabels: { Safe: "安全", Suspicious: "可疑", "High Risk": "高风险" },
    confidenceLabels: { Low: "低", Medium: "中", High: "高" },
    providerLabels: { heuristic: "启发式引擎", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `在分析前已隐藏 ${count} 条个人信息`,
      enabledNoRedaction: "隐私模式已开启，分析前没有发现需要隐藏的个人信息。"
    },
    tips: {
      urgency: "诈骗者会制造恐慌，让你来不及思考就行动。如果消息在催促你，请先放慢下来再点击。",
      domain: "在相信链接前先暂停一下。真正的线索是最终目标域名，而不是消息里写出的品牌名。",
      credentials: "正规公司不会通过短信或邮件索要你的密码、社保号或完整银行卡信息。把这类请求视为危险信号。",
      direct: "如果不确定，不要点击消息中的链接。请在新标签页打开该公司的官方网站再核实。",
      default: "如果一条消息让你感到情绪化、紧迫或过于私人，那通常就是应该通过更安全渠道核实的时候。"
    },
    findingTypes: {
      domain_mismatch: "域名不匹配",
      suspicious_tld: "可疑顶级域",
      urgency: "紧迫施压",
      credential_ask: "索要凭证",
      sender_spoof: "发件人伪装",
      homoglyph: "同形字欺骗",
      shortened_url: "短链接",
      ip_address_url: "IP 地址链接",
      excessive_subdomains: "过多子域名",
      phishtank_match: "PhishTank 命中",
      cross_domain_redirect: "跨域跳转",
      multi_hop_redirect: "多跳跳转",
      meta_refresh_redirect: "Meta Refresh 跳转",
      external_form_action: "表单提交到其他域名",
      insecure_destination: "不安全目标",
      login_form: "目标页面含登录表单",
      page_brand_impersonation: "页面品牌冒充",
      credential_lure_page: "诱导凭证页面",
      qr_account_lure: "二维码账户诱导",
      visual_mobile_message_ui: "移动消息界面",
      visual_delivery_notice_ui: "投递通知界面",
      visual_payment_request_ui: "付款请求界面",
      visual_credential_prompt: "凭据输入界面",
      visual_system_alert_ui: "系统警报界面",
      visual_account_security_ui: "账户安全界面",
      visual_urgent_cta: "紧急操作界面",
      visual_brand_impersonation: "品牌仿冒界面",
      signal: "信号"
    },
    report: {
      title: "CyberCoach 安全报告",
      riskLevel: "风险级别",
      confidence: "置信度",
      likelyPattern: "可能的诈骗模式",
      summary: "摘要",
      keyFindings: "关键发现",
      recommendedActions: "建议操作",
      privacyMode: "隐私模式",
      end: "报告结束"
    }
  },
  vi: {
    result: {
      riskSummary: "Tom Tat Rui Ro",
      heuristicScore: "Diem heuristic",
      confidence: "Do tin cay",
      likelyPattern: "Moi lo chinh",
      recommendedActions: "Hanh Dong De Xuat",
      whatToDoNext: "Can Lam Gi Tiep Theo",
      keyFindings: "Phat Hien Chinh",
      patternScan: "Vi sao bi danh dau",
      technicalDetails: "Chi Tiet Ban Quet",
      triggeredRules: "Ly do ky thuat",
      noTriggeredRules: "CyberCoach khong bo sung ly do ky thuat nao cho ket qua nay.",
      privacyNoteTitle: "Ghi Chu Rieng Tu",
      protectedReview: "Uu Tien Rieng Tu",
      quickTip: "Meo Nhanh",
      educationalGuidance: "Can nho",
      riskScoreBreakdown: "Diem duoc tao ra nhu the nao",
      advancedReview: "Chi tiet diem",
      scoreDetails: "Xem chi tiet diem",
      scoreDetailsDescription: "Xem tin hieu nao da lam tang diem rui ro.",
      collapse: "Thu Gon",
      expand: "Mo Rong",
      noDetailedBreakdown: "Khong co bang giai thich diem chi tiet cho ket qua nay.",
      reportActions: "Tac Vu Bao Cao",
      forwardOrArchive: "Luu Hoac Chia Se",
      copyReport: "Sao Chep Bao Cao",
      copying: "Dang sao chep...",
      downloadTxt: "Tai TXT",
      downloadMd: "Tai MD",
      preparing: "Dang chuan bi..."
    },
    riskLabels: { Safe: "An Toan", Suspicious: "Dang Nghi", "High Risk": "Rui Ro Cao" },
    confidenceLabels: { Low: "Thap", Medium: "Trung Binh", High: "Cao" },
    providerLabels: { heuristic: "Cong Cu Heuristic", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `Da che ${count} thong tin ca nhan truoc khi phan tich`,
      enabledNoRedaction: "Che do rieng tu da duoc bat. Khong co thong tin ca nhan nao can che truoc khi phan tich."
    },
    tips: {
      urgency: "Ke lua dao tao cam giac hoang so de ban hanh dong ma khong suy nghi. Neu tin nhan thuc ep ban, hay cham lai truoc khi bam.",
      domain: "Hay dung lai truoc khi tin vao mot lien ket. Dau moi that su nam o ten mien dich den, khong phai ten thuong hieu trong tin nhan.",
      credentials: "Cong ty hop phap khong yeu cau mat khau, SSN hay day du thong tin the qua tin nhan hoac email. Hay coi cac yeu cau nay la nguy hiem.",
      direct: "Neu ban con nghi ngo, dung dung lien ket trong tin nhan. Hay mo trang web chinh thuc cua cong ty trong tab moi de xac minh.",
      default: "Neu mot tin nhan khien ban thay qua cam tinh, qua gap, hoac qua rieng tu, do thuong la luc can xac minh qua kenh an toan hon."
    },
    findingTypes: {
      domain_mismatch: "Lech Ten Mien",
      suspicious_tld: "TLD Dang Nghi",
      urgency: "Tinh Cap Bach",
      credential_ask: "Yeu Cau Thong Tin Dang Nhap",
      sender_spoof: "Gia Mao Nguoi Gui",
      homoglyph: "Ky Tu Gia Dang",
      shortened_url: "Lien Ket Rut Gon",
      ip_address_url: "Lien Ket Dia Chi IP",
      excessive_subdomains: "Qua Nhieu Subdomain",
      phishtank_match: "Trung Khop PhishTank",
      cross_domain_redirect: "Chuyen Huong Sang Ten Mien Khac",
      multi_hop_redirect: "Nhieu Buoc Chuyen Huong",
      meta_refresh_redirect: "Meta Refresh Redirect",
      external_form_action: "Form Gui Sang Ten Mien Khac",
      insecure_destination: "Dich Den Khong Bao Mat",
      login_form: "Trang Dich Co Form Dang Nhap",
      page_brand_impersonation: "Trang Dich Gia Mao Thuong Hieu",
      credential_lure_page: "Trang Nhu Nhua Moi Cung Cap Thong Tin",
      qr_account_lure: "Du Do Tai Khoan Bang QR",
      visual_mobile_message_ui: "Giao Dien Tin Nhan Di Dong",
      visual_delivery_notice_ui: "Giao Dien Thong Bao Giao Hang",
      visual_payment_request_ui: "Giao Dien Yeu Cau Thanh Toan",
      visual_credential_prompt: "Giao Dien Nhap Thong Tin Dang Nhap",
      visual_system_alert_ui: "Giao Dien Canh Bao He Thong",
      visual_account_security_ui: "Giao Dien Bao Mat Tai Khoan",
      visual_urgent_cta: "Giao Dien Hanh Dong Khan",
      visual_brand_impersonation: "Giao Dien Gia Mao Thuong Hieu",
      signal: "Tin Hieu"
    },
    report: {
      title: "Bao Cao An Toan CyberCoach",
      riskLevel: "Muc Do Rui Ro",
      confidence: "Do Tin Cay",
      likelyPattern: "Kieu Lua Dao Co Kha Nang",
      summary: "Tom Tat",
      keyFindings: "Phat Hien Chinh",
      recommendedActions: "Hanh Dong De Xuat",
      privacyMode: "Che Do Rieng Tu",
      end: "Ket Thuc Bao Cao"
    }
  },
  ko: {
    result: {
      riskSummary: "위험 요약",
      heuristicScore: "휴리스틱 점수",
      confidence: "신뢰도",
      likelyPattern: "주요 우려",
      recommendedActions: "권장 조치",
      whatToDoNext: "다음 단계",
      keyFindings: "핵심 발견",
      patternScan: "왜 표시되었는지",
      technicalDetails: "검토 세부사항",
      triggeredRules: "기술적 이유",
      noTriggeredRules: "이 결과에 대해 추가된 기술적 이유는 없습니다.",
      privacyNoteTitle: "개인정보 메모",
      protectedReview: "개인정보 우선",
      quickTip: "빠른 팁",
      educationalGuidance: "기억해 둘 점",
      riskScoreBreakdown: "점수가 만들어진 방식",
      advancedReview: "점수 세부정보",
      scoreDetails: "점수 자세히 보기",
      scoreDetailsDescription: "어떤 신호가 위험 점수를 올렸는지 확인하세요.",
      collapse: "접기",
      expand: "펼치기",
      noDetailedBreakdown: "이 결과에 대한 자세한 점수 설명은 없습니다.",
      reportActions: "보고서 작업",
      forwardOrArchive: "저장 또는 공유",
      copyReport: "보고서 복사",
      copying: "복사 중...",
      downloadTxt: "TXT 다운로드",
      downloadMd: "MD 다운로드",
      preparing: "준비 중..."
    },
    riskLabels: { Safe: "안전", Suspicious: "의심", "High Risk": "고위험" },
    confidenceLabels: { Low: "낮음", Medium: "보통", High: "높음" },
    providerLabels: { heuristic: "휴리스틱 엔진", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `분석 전에 개인 정보 ${count}건이 가려졌습니다`,
      enabledNoRedaction: "개인정보 보호 모드가 활성화되었으며, 분석 전에 가릴 개인 정보는 없었습니다."
    },
    tips: {
      urgency: "사기범은 생각할 틈 없이 행동하게 만들기 위해 공포를 조성합니다. 메시지가 당신을 재촉한다면 클릭 전에 속도를 늦추세요.",
      domain: "링크를 믿기 전에 잠시 멈추세요. 진짜 단서는 메시지에 적힌 브랜드명이 아니라 최종 목적지 도메인입니다.",
      credentials: "정상적인 회사는 문자나 이메일로 비밀번호, 주민번호, 카드 전체 정보를 요구하지 않습니다. 이런 요청은 위험 신호입니다.",
      direct: "확신이 없다면 메시지 속 링크를 사용하지 마세요. 새 탭에서 공식 사이트를 열어 직접 확인하세요.",
      default: "메시지가 지나치게 감정적이거나 급하거나 너무 개인적으로 느껴진다면, 더 안전한 채널로 확인해야 할 때일 가능성이 큽니다."
    },
    findingTypes: {
      domain_mismatch: "도메인 불일치",
      suspicious_tld: "의심스러운 TLD",
      urgency: "긴급성",
      credential_ask: "자격 증명 요구",
      sender_spoof: "발신자 위장",
      homoglyph: "동형 문자",
      shortened_url: "단축 URL",
      ip_address_url: "IP 주소 URL",
      excessive_subdomains: "과도한 서브도메인",
      phishtank_match: "PhishTank 일치",
      cross_domain_redirect: "교차 도메인 리디렉션",
      multi_hop_redirect: "다중 홉 리디렉션",
      meta_refresh_redirect: "메타 리프레시 리디렉션",
      external_form_action: "다른 도메인으로 전송하는 폼",
      insecure_destination: "안전하지 않은 목적지",
      login_form: "목적지 로그인 폼",
      page_brand_impersonation: "페이지 브랜드 사칭",
      credential_lure_page: "자격 증명 유도 페이지",
      qr_account_lure: "QR 계정 유도",
      visual_mobile_message_ui: "모바일 메시지 화면",
      visual_delivery_notice_ui: "배송 안내 화면",
      visual_payment_request_ui: "결제 요청 화면",
      visual_credential_prompt: "자격 증명 입력 화면",
      visual_system_alert_ui: "시스템 경고 화면",
      visual_account_security_ui: "계정 보안 화면",
      visual_urgent_cta: "긴급 행동 유도 화면",
      visual_brand_impersonation: "브랜드 사칭 화면",
      signal: "신호"
    },
    report: {
      title: "CyberCoach 보안 보고서",
      riskLevel: "위험 수준",
      confidence: "신뢰도",
      likelyPattern: "가능한 사기 유형",
      summary: "요약",
      keyFindings: "핵심 발견",
      recommendedActions: "권장 조치",
      privacyMode: "개인정보 보호 모드",
      end: "보고서 종료"
    }
  },
  tl: {
    result: {
      riskSummary: "Buod ng Panganib",
      heuristicScore: "Heuristic na puntos",
      confidence: "Kumpiyansa",
      likelyPattern: "Pangunahing alalahanin",
      recommendedActions: "Mga Inirerekomendang Aksyon",
      whatToDoNext: "Ano ang Susunod na Gagawin",
      keyFindings: "Mahahalagang Natuklasan",
      patternScan: "Bakit ito na-flag",
      technicalDetails: "Mga Detalye ng Scan",
      triggeredRules: "Mga teknikal na dahilan",
      noTriggeredRules: "Walang dagdag na teknikal na dahilan para sa resultang ito.",
      privacyNoteTitle: "Tala sa Privacy",
      protectedReview: "Unahin ang Privacy",
      quickTip: "Mabilis na Paalala",
      educationalGuidance: "Dapat tandaan",
      riskScoreBreakdown: "Paano nabuo ang score",
      advancedReview: "Detalye ng Score",
      scoreDetails: "Tingnan ang detalye ng score",
      scoreDetailsDescription: "Tingnan kung aling mga signal ang nagdagdag sa risk score.",
      collapse: "Isara",
      expand: "Buksan",
      noDetailedBreakdown: "Walang mas detalyadong paliwanag ng score para sa resultang ito.",
      reportActions: "Mga Aksyon sa Ulat",
      forwardOrArchive: "I-save o Ibahagi",
      copyReport: "Kopyahin ang Ulat",
      copying: "Kinokopya...",
      downloadTxt: "I-download ang TXT",
      downloadMd: "I-download ang MD",
      preparing: "Inihahanda..."
    },
    riskLabels: { Safe: "Ligtas", Suspicious: "Kahina-hinala", "High Risk": "Mataas na Panganib" },
    confidenceLabels: { Low: "Mababa", Medium: "Katamtaman", High: "Mataas" },
    providerLabels: { heuristic: "Heuristic Engine", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `${count} piraso ng personal na impormasyon ang na-redact bago ang pagsusuri`,
      enabledNoRedaction: "Naka-on ang privacy mode. Walang personal na detalye ang kinailangang i-redact bago ang pagsusuri."
    },
    tips: {
      urgency: "Gumagawa ang mga scammer ng takot para kumilos ka agad nang hindi nag-iisip. Kapag minamadali ka ng mensahe, magpabagal muna bago mag-click.",
      domain: "Huminto muna bago magtiwala sa link. Ang tunay na palatandaan ay ang huling domain na pupuntahan, hindi ang brand name sa mensahe.",
      credentials: "Ang lehitimong kumpanya ay hindi humihingi ng password, SSN, o buong detalye ng card sa text o email. Ituring itong mapanganib.",
      direct: "Kung nagdududa ka, huwag gamitin ang link sa mensahe. Buksan ang opisyal na website ng kumpanya sa bagong tab at doon mag-verify.",
      default: "Kung masyadong emosyonal, apurahan, o personal ang isang mensahe, maaaring iyon na ang oras para mag-verify gamit ang mas ligtas na channel."
    },
    findingTypes: {
      domain_mismatch: "Hindi Tugma ang Domain",
      suspicious_tld: "Kahina-hinalang TLD",
      urgency: "Pagmamadali",
      credential_ask: "Paghihingi ng Kredensyal",
      sender_spoof: "Panggagaya sa Nagpadala",
      homoglyph: "Homoglyph",
      shortened_url: "Maikling URL",
      ip_address_url: "IP Address URL",
      excessive_subdomains: "Sobrang Daming Subdomain",
      phishtank_match: "Tugma sa PhishTank",
      cross_domain_redirect: "Redirect papunta sa Ibang Domain",
      multi_hop_redirect: "Maramihang Redirect",
      meta_refresh_redirect: "Meta Refresh Redirect",
      external_form_action: "Form na Papunta sa Ibang Domain",
      insecure_destination: "Hindi Ligtas na Destinasyon",
      login_form: "May Login Form ang Destinasyon",
      page_brand_impersonation: "Panggagaya ng Brand sa Page",
      credential_lure_page: "Page na Nang-aakit ng Kredensyal",
      qr_account_lure: "QR na Pang-akit sa Account",
      visual_mobile_message_ui: "UI ng Mobile Message",
      visual_delivery_notice_ui: "UI ng Abiso sa Delivery",
      visual_payment_request_ui: "UI ng Kahilingan sa Bayad",
      visual_credential_prompt: "UI ng Paghingi ng Kredensyal",
      visual_system_alert_ui: "UI ng Babala ng System",
      visual_account_security_ui: "UI ng Seguridad ng Account",
      visual_urgent_cta: "UI ng Agarang Aksyon",
      visual_brand_impersonation: "UI ng Panggagaya ng Brand",
      signal: "Signal"
    },
    report: {
      title: "Ulat sa Kaligtasan ng CyberCoach",
      riskLevel: "Antas ng Panganib",
      confidence: "Kumpiyansa",
      likelyPattern: "Posibleng Uri ng Scam",
      summary: "Buod",
      keyFindings: "Mahahalagang Natuklasan",
      recommendedActions: "Mga Inirerekomendang Aksyon",
      privacyMode: "Privacy Mode",
      end: "Katapusan ng Ulat"
    }
  },
  fr: {
    result: {
      riskSummary: "Resume du Risque",
      heuristicScore: "Score heuristique",
      confidence: "Confiance",
      likelyPattern: "Principal point d'attention",
      recommendedActions: "Actions Recommandees",
      whatToDoNext: "Que Faire Ensuite",
      keyFindings: "Constats Cles",
      patternScan: "Pourquoi cela a ete signale",
      technicalDetails: "Details de l'Analyse",
      triggeredRules: "Raisons techniques",
      noTriggeredRules: "CyberCoach n'a pas ajoute de raison technique supplementaire pour ce resultat.",
      privacyNoteTitle: "Note de Confidentialite",
      protectedReview: "Confidentialite d'Abord",
      quickTip: "Conseil Rapide",
      educationalGuidance: "A retenir",
      riskScoreBreakdown: "Comment le score a ete calcule",
      advancedReview: "Details du score",
      scoreDetails: "Voir le detail du score",
      scoreDetailsDescription: "Voyez quels signaux ont augmente le score de risque.",
      collapse: "Reduire",
      expand: "Developper",
      noDetailedBreakdown: "Aucun detail supplementaire sur le score n'est disponible pour ce resultat.",
      reportActions: "Actions du Rapport",
      forwardOrArchive: "Enregistrer ou Partager",
      copyReport: "Copier le Rapport",
      copying: "Copie...",
      downloadTxt: "Telecharger TXT",
      downloadMd: "Telecharger MD",
      preparing: "Preparation..."
    },
    riskLabels: { Safe: "Sain", Suspicious: "Suspect", "High Risk": "Risque Eleve" },
    confidenceLabels: { Low: "Faible", Medium: "Moyenne", High: "Elevee" },
    providerLabels: { heuristic: "Moteur Heuristique", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `${count} element${count === 1 ? "" : "s"} d'information personnelle ${count === 1 ? "a ete masque" : "ont ete masques"} avant l'analyse`,
      enabledNoRedaction: "Le mode confidentialite etait actif. Aucun detail personnel n'a eu besoin d'etre masque avant l'analyse."
    },
    tips: {
      urgency: "Les escrocs creent la panique pour vous faire agir sans reflechir. Si un message vous presse, ralentissez avant de cliquer.",
      domain: "Faites une pause avant de faire confiance a un lien. Le vrai indice est le domaine final de destination, pas le nom de marque ecrit dans le message.",
      credentials: "Les entreprises legitimes ne demandent pas votre mot de passe, numero de securite sociale ou numero complet de carte par SMS ou e-mail. Traitez cela comme hostile.",
      direct: "En cas de doute, n'utilisez pas le lien du message. Ouvrez le site officiel de l'entreprise dans un nouvel onglet et verifiez la-bas.",
      default: "Si un message semble trop emotif, urgent ou personnel, c'est souvent le moment de verifier par un canal plus sur."
    },
    findingTypes: {
      domain_mismatch: "Domaine Incoherent",
      suspicious_tld: "TLD Suspect",
      urgency: "Urgence",
      credential_ask: "Demande d'Identifiants",
      sender_spoof: "Usurpation de l'Expediteur",
      homoglyph: "Homoglyphe",
      shortened_url: "URL Raccourcie",
      ip_address_url: "URL d'Adresse IP",
      excessive_subdomains: "Sous-domaines Excessifs",
      phishtank_match: "Correspondance PhishTank",
      cross_domain_redirect: "Redirection inter-domaines",
      multi_hop_redirect: "Redirection a plusieurs sauts",
      meta_refresh_redirect: "Redirection Meta Refresh",
      external_form_action: "Formulaire vers un autre domaine",
      insecure_destination: "Destination non securisee",
      login_form: "Formulaire de connexion sur la destination",
      page_brand_impersonation: "Imitation de marque sur la page",
      credential_lure_page: "Page qui attire les identifiants",
      qr_account_lure: "Leurre de compte par QR",
      visual_mobile_message_ui: "Interface de message mobile",
      visual_delivery_notice_ui: "Interface d'avis de livraison",
      visual_payment_request_ui: "Interface de demande de paiement",
      visual_credential_prompt: "Interface de demande d'identifiants",
      visual_system_alert_ui: "Interface d'alerte systeme",
      visual_account_security_ui: "Interface de securite du compte",
      visual_urgent_cta: "Interface d'action urgente",
      visual_brand_impersonation: "Interface d'usurpation de marque",
      signal: "Signal"
    },
    report: {
      title: "Rapport de Securite CyberCoach",
      riskLevel: "Niveau de Risque",
      confidence: "Confiance",
      likelyPattern: "Type d'Arnaque Probable",
      summary: "Resume",
      keyFindings: "Constats Cles",
      recommendedActions: "Actions Recommandees",
      privacyMode: "Mode Confidentialite",
      end: "Fin du Rapport"
    }
  }
};

function normalizeLocale(locale: string): SupportedLocale {
  const normalized = locale.trim().toLowerCase();
  if (normalized in SCAN_COPY) {
    return normalized as SupportedLocale;
  }

  const aliasMap: Record<string, SupportedLocale> = {
    english: "en",
    spanish: "es",
    chinese: "zh",
    vietnamese: "vi",
    korean: "ko",
    tagalog: "tl",
    french: "fr"
  };

  if (normalized in aliasMap) {
    return aliasMap[normalized];
  }
  return "en";
}

export function resolveSupportedLocale(locale: string): SupportedLocale {
  return normalizeLocale(locale);
}

export function getScanLocaleCopy(locale: string) {
  return SCAN_COPY[normalizeLocale(locale)];
}

function severityPoints(severity: TechnicalDetailItem["severity"]) {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function modelRiskLabel(riskLevel: BackendModelRun["risk_level"]): BackendScanResponse["risk_label"] {
  if (riskLevel === "high_risk") {
    return "High Risk";
  }
  if (riskLevel === "suspicious") {
    return "Suspicious";
  }
  return "Safe";
}

function localizedFindingType(type: string, locale: SupportedLocale) {
  return SCAN_COPY[locale].findingTypes[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildPrivacyNote(locale: SupportedLocale, redactionCount: number, privacyModeEnabled: boolean) {
  if (redactionCount > 0) {
    return SCAN_COPY[locale].privacy.redacted(redactionCount);
  }
  if (privacyModeEnabled) {
    return SCAN_COPY[locale].privacy.enabledNoRedaction;
  }
  return null;
}

function ocrConfidenceDisplay(locale: SupportedLocale, confidence: number | null) {
  if (confidence === null || Number.isNaN(confidence)) {
    const unknownLabels: Record<SupportedLocale, string> = {
      en: "Unknown",
      es: "Desconocida",
      zh: "未知",
      vi: "Chua ro",
      ko: "알 수 없음",
      tl: "Hindi tiyak",
      fr: "Inconnue"
    };
    return unknownLabels[locale];
  }
  if (confidence >= 0.8) {
    return SCAN_COPY[locale].confidenceLabels.High;
  }
  if (confidence >= 0.5) {
    return SCAN_COPY[locale].confidenceLabels.Medium;
  }
  return SCAN_COPY[locale].confidenceLabels.Low;
}

function classifyInspectionIssue(
  inspection: BackendUrlInspection
): { type: string; detail: string; severity: "medium" | "low" } | null {
  if (inspection.inspection_succeeded) {
    return null;
  }

  if (inspection.blocked_reason) {
    return {
      type: "destination_lookup_blocked",
      detail: `CyberCoach blocked the live destination lookup before opening the page. Technical note: ${inspection.blocked_reason}`,
      severity: "medium"
    };
  }

  const rawError = String(inspection.error ?? "").trim();
  if (!rawError) {
    return {
      type: "destination_lookup_unavailable",
      detail: "CyberCoach could not complete the live destination lookup from the current backend environment.",
      severity: "low"
    };
  }

  const normalizedError = rawError.toLowerCase();
  if (normalizedError.includes("timed out") || normalizedError.includes("timeout")) {
    return {
      type: "destination_lookup_timeout",
      detail: `CyberCoach started the live destination lookup, but it timed out before the page could be reviewed. Technical note: ${rawError}`,
      severity: "medium"
    };
  }

  if (
    normalizedError.includes("name or service not known") ||
    normalizedError.includes("temporary failure in name resolution") ||
    normalizedError.includes("nodename nor servname provided") ||
    normalizedError.includes("no address associated with hostname") ||
    normalizedError.includes("failed to resolve")
  ) {
    return {
      type: "destination_lookup_unresolved",
      detail: `CyberCoach could not resolve the destination hostname from the current backend environment. Technical note: ${rawError}`,
      severity: "medium"
    };
  }

  return {
    type: "destination_lookup_unavailable",
    detail: `CyberCoach could not complete the live destination lookup from the current backend environment. Technical note: ${rawError}`,
    severity: "low"
  };
}

function pickQuickTip(findings: BackendHeuristicFinding[], locale: SupportedLocale) {
  const types = findings.map((finding) => finding.type);
  const tips = SCAN_COPY[locale].tips;
  if (
    types.includes("official_entity_impersonation") ||
    types.includes("subdomain_impersonation") ||
    types.includes("legal_threat") ||
    types.includes("page_brand_impersonation") ||
    types.includes("cross_domain_redirect") ||
    types.includes("document_macro_enabled") ||
    types.includes("document_deceptive_cta") ||
    types.includes("document_link_mismatch")
  ) {
    return tips.direct;
  }
  if (types.includes("urgency") || types.includes("invoice_payment_pressure")) {
    return tips.urgency;
  }
  if (
    types.includes("domain_mismatch") ||
    types.includes("suspicious_tld") ||
    types.includes("shortened_url") ||
    types.includes("homoglyph") ||
    types.includes("document_qr_payload") ||
    types.includes("document_image_only")
  ) {
    return tips.domain;
  }
  if (types.includes("credential_ask") || types.includes("sender_spoof") || types.includes("document_protected")) {
    return tips.credentials;
  }
  if (types.length > 0) {
    return tips.direct;
  }
  return tips.default;
}

function providerDisplay(provider: string | null, locale: SupportedLocale) {
  const labels = SCAN_COPY[locale].providerLabels;
  if (!provider) {
    return labels.heuristic;
  }
  return provider === "openrouter" ? labels.openrouter : labels.anthropic;
}

function primaryFinding(findings: BackendHeuristicFinding[]) {
  if (findings.length === 0) {
    return null;
  }

  const priority: Record<string, number> = {
    phishtank_match: 100,
    official_entity_impersonation: 95,
    page_brand_impersonation: 94,
    document_protected: 93,
    document_macro_enabled: 93,
    document_link_mismatch: 92,
    voice_family_emergency: 91,
    subdomain_impersonation: 90,
    voice_bank_impersonation: 90,
    voice_government_impersonation: 89,
    homoglyph: 88,
    document_deceptive_cta: 87,
    voice_payment_request: 86,
    domain_mismatch: 85,
    voice_secrecy_pressure: 84,
    cross_domain_redirect: 84,
    voice_otp_request: 83,
    external_form_action: 83,
    voice_call_control: 82,
    login_form: 82,
    legal_threat: 80,
    invoice_payment_pressure: 79,
    qr_account_lure: 79,
    voice_pattern_suspicious: 78,
    credential_ask: 75,
    document_qr_payload: 74,
    meta_refresh_redirect: 73,
    suspicious_tld: 70,
    insecure_destination: 69,
    multi_hop_redirect: 68,
    credential_lure_page: 67,
    urgency: 65,
    deadline_conflict: 60,
    document_image_only: 59,
    document_partial_analysis: 58,
    visual_brand_impersonation: 58,
    visual_credential_prompt: 57,
    visual_payment_request_ui: 56,
    visual_partial_login_ui: 56,
    visual_account_security_ui: 55,
    visual_notification_banner_ui: 55,
    visual_delivery_notice_ui: 54,
    visual_system_alert_ui: 53,
    visual_browser_chrome_ui: 53,
    visual_banking_app_ui: 52,
    visual_cropped_context_ui: 52,
    visual_urgent_cta: 52,
    visual_mobile_message_ui: 51,
    voice_audio_quality_limited: 50
  };

  return findings.reduce((best, current) => {
    const bestScore = priority[best.type] ?? 0;
    const currentScore = priority[current.type] ?? 0;
    if (currentScore > bestScore) {
      return current;
    }
    if (currentScore === bestScore && severityPoints(current.severity) > severityPoints(best.severity)) {
      return current;
    }
    return best;
  });
}

export function adaptMessageScanResult(
  payload: BackendScanResponse,
  options: {
    locale: string;
    privacyMode: boolean;
  }
): MessageScanResult {
  const locale = normalizeLocale(options.locale);
  const heuristicFindings = payload.metadata?.heuristic_findings ?? [];
  const inspectionIssueDetails = (payload.metadata?.url_live_inspection ?? [])
    .map((inspection) => classifyInspectionIssue(inspection))
    .filter((item): item is NonNullable<ReturnType<typeof classifyInspectionIssue>> => Boolean(item))
    .map((item) => ({
      label: localizedFindingType(item.type, locale),
      detail: item.detail,
      severity: item.severity
    }));
  const technicalDetails = heuristicFindings.length
    ? heuristicFindings.map((finding) => ({
        label: localizedFindingType(finding.type, locale),
        detail: finding.detail,
        severity: finding.severity
      }))
    : payload.signals.map((signal) => ({
        label: localizedFindingType("signal", locale),
        detail: signal,
        severity: "medium" as const
      }));
  technicalDetails.push(...inspectionIssueDetails);

  const groupedBreakdown = new Map<string, ScoreBreakdownItem>();
  for (const finding of heuristicFindings) {
    const label = localizedFindingType(finding.type, locale);
    const current = groupedBreakdown.get(label);
    const nextPoints = severityPoints(finding.severity);
    groupedBreakdown.set(label, {
      label,
      points: (current?.points ?? 0) + nextPoints,
      severity: finding.severity,
      detail: finding.detail
    });
  }

  const scoreBreakdown = Array.from(groupedBreakdown.values()).sort((left, right) => right.points - left.points);
  const redactionCount = payload.metadata?.redaction_count ?? 0;
  const riskLabelDisplay = SCAN_COPY[locale].riskLabels[payload.risk_label];
  const confidenceDisplay = SCAN_COPY[locale].confidenceLabels[payload.confidence];
  const bestFinding = primaryFinding(heuristicFindings);
  const likelyScamPattern = bestFinding ? localizedFindingType(bestFinding.type, locale) : riskLabelDisplay;
  const modelRuns = payload.metadata?.model_runs ?? [];
  const urlEvidence = payload.metadata?.url_evidence ?? [];
  const urlInspection = payload.metadata?.url_live_inspection ?? [];
  const evidenceBuckets = payload.metadata?.evidence_buckets ?? [];
  const ocr = payload.metadata?.ocr;
  const document = payload.metadata?.document;
  const screenshotOcr =
    payload.scan_type === "screenshot"
      ? {
          available: Boolean(ocr?.ocr_available),
          extractedText: String(ocr?.extracted_text ?? ""),
          analysisText: String(ocr?.analysis_text ?? ocr?.extracted_text ?? ""),
          originalExtractedText: ocr?.original_extracted_text ? String(ocr.original_extracted_text) : null,
          confidence: typeof ocr?.ocr_confidence === "number" ? ocr.ocr_confidence : null,
          confidenceDisplay: ocrConfidenceDisplay(
            locale,
            typeof ocr?.ocr_confidence === "number" ? ocr.ocr_confidence : null
          ),
          quality:
            ocr?.ocr_quality === "high" || ocr?.ocr_quality === "medium" || ocr?.ocr_quality === "low"
              ? ocr.ocr_quality
              : null,
          warnings: Array.isArray(ocr?.ocr_warnings) ? ocr.ocr_warnings.map((item) => String(item)) : [],
          layoutSummary: ocr?.layout_summary ? String(ocr.layout_summary) : null,
          visualSignals: Array.isArray(ocr?.visual_signals)
            ? ocr.visual_signals.filter(
                (item): item is BackendScreenshotVisualSignal =>
                  Boolean(
                    item &&
                      typeof item === "object" &&
                      typeof item.type === "string" &&
                      typeof item.detail === "string" &&
                      typeof item.severity === "string"
                  )
              )
            : [],
          qrPayloads: Array.isArray(ocr?.qr_payloads) ? ocr.qr_payloads.map((item) => String(item)) : [],
          qrDetected: Boolean(ocr?.qr_detected),
          overrideUsed: Boolean(ocr?.ocr_override_used)
        }
      : null;
  const documentAnalysis =
    payload.scan_type === "document"
      ? (() => {
          const qrPayloads = Array.isArray(document?.qr_payloads) ? document.qr_payloads.map((item) => String(item)) : [];
          const limitations = Array.isArray(document?.limitations) ? document.limitations.map((item) => String(item)) : [];

          return {
          fileName: String(document?.file_name ?? "uploaded-document"),
          fileType: String(document?.file_type ?? "document").toUpperCase(),
          mediaType: String(document?.media_type ?? "application/octet-stream"),
          fileSize: typeof document?.file_size === "number" ? document.file_size : 0,
          fileSizeDisplay: formatBytes(typeof document?.file_size === "number" ? document.file_size : 0),
          parser: String(document?.parser ?? "document-parser"),
          inspectable: document?.inspectable !== false,
          protected: Boolean(document?.protected),
          partialAnalysis: Boolean(document?.partial_analysis),
          imageBased: Boolean(document?.image_based),
          macroEnabled: Boolean(document?.macro_enabled),
          pageCount: typeof document?.page_count === "number" ? document.page_count : null,
          sectionCount: typeof document?.section_count === "number" ? document.section_count : null,
          imageCount: typeof document?.image_count === "number" ? document.image_count : 0,
          textPreview: String(document?.text_preview ?? ""),
          extractedText: String(document?.extracted_text ?? ""),
          ocrText: String(document?.ocr_text ?? ""),
          ocrFallbackUsed: Boolean(document?.ocr_fallback_used),
          ocrPagesAnalyzed: typeof document?.ocr_pages_analyzed === "number" ? document.ocr_pages_analyzed : 0,
          ocrPageLimit: typeof document?.ocr_page_limit === "number" ? document.ocr_page_limit : 0,
          extractedUrls: Array.isArray(document?.extracted_urls) ? document.extracted_urls.map((item) => String(item)) : [],
          linkPairs: Array.isArray(document?.link_pairs)
            ? document.link_pairs.filter(
                (item): item is BackendDocumentLink => Boolean(item && typeof item === "object")
              )
            : [],
          qrPayloads,
          limitations: qrPayloads.length
            ? limitations.filter((item) => !item.toLowerCase().includes("qr-code inspection support is unavailable"))
            : limitations
        };
      })()
      : null;
  const voice = payload.metadata?.voice;
  const voiceAnalysis =
    payload.scan_type === "voice"
      ? {
          sessionId: String(voice?.session_id ?? "voice-session"),
          analysisState: String(voice?.analysis_state ?? "live"),
          startedAt: voice?.started_at ? String(voice.started_at) : null,
          updatedAt: voice?.updated_at ? String(voice.updated_at) : null,
          elapsedSeconds: typeof voice?.elapsed_seconds === "number" ? voice.elapsed_seconds : 0,
          transcriptText: String(voice?.transcript_text ?? payload.original_input ?? ""),
          transcriptSegments: Array.isArray(voice?.transcript_segments)
            ? voice.transcript_segments.filter(
                (item): item is BackendVoiceTranscriptSegment =>
                  Boolean(item && typeof item === "object" && typeof item.text === "string")
              )
            : [],
          transcriptWordCount: typeof voice?.transcript_word_count === "number" ? voice.transcript_word_count : 0,
          challengeQuestions: Array.isArray(voice?.challenge_questions)
            ? voice.challenge_questions.map((item) => String(item))
            : [],
          liveWarnings: Array.isArray(voice?.live_warnings) ? voice.live_warnings.map((item) => String(item)) : [],
          voiceSignals: Array.isArray(voice?.voice_signals)
            ? voice.voice_signals.filter(
                (item): item is BackendHeuristicFinding =>
                  Boolean(
                    item &&
                      typeof item === "object" &&
                      typeof item.type === "string" &&
                      typeof item.detail === "string" &&
                      typeof item.severity === "string"
                  )
              )
            : [],
          listeningMode: voice?.listening_mode ? String(voice.listening_mode) : null,
          sourceFileName: voice?.source_file_name ? String(voice.source_file_name) : null,
          sourceFileSize: typeof voice?.source_file_size === "number" ? voice.source_file_size : null,
          sourceMediaType: voice?.source_media_type ? String(voice.source_media_type) : null,
          transcriptionSource: voice?.transcription_source ? String(voice.transcription_source) : null,
          transcriptionModel: voice?.transcription_model ? String(voice.transcription_model) : null,
          limitations: Array.isArray(voice?.limitations) ? voice.limitations.map((item) => String(item)) : [],
          liveAiState: voice?.live_ai_state ? String(voice.live_ai_state) : "heuristics_live_only",
          liveAiSummary: voice?.live_ai_summary ? String(voice.live_ai_summary) : "",
          liveAiReasons: Array.isArray(voice?.live_ai_reasons) ? voice.live_ai_reasons.map((item) => String(item)) : [],
          liveAiConfidence: voice?.live_ai_confidence ? String(voice.live_ai_confidence) : null,
          liveAiLastUpdatedAt: voice?.live_ai_last_updated_at ? String(voice.live_ai_last_updated_at) : null,
          liveAiAttempted: Boolean(voice?.live_ai_attempted),
          liveAiAction: voice?.live_ai_action ? String(voice.live_ai_action) : null
        }
      : null;

  return {
    riskLabel: payload.risk_label,
    riskLabelDisplay,
    riskScore: payload.risk_score,
    confidence: payload.confidence,
    confidenceDisplay,
    likelyScamPattern,
    summary: payload.summary,
    topReasons: payload.top_reasons,
    recommendedActions: payload.recommended_actions,
    signals: payload.signals,
    technicalDetails,
    scoreBreakdown,
    privacyNote: buildPrivacyNote(locale, redactionCount, options.privacyMode),
    quickTip: pickQuickTip(heuristicFindings, locale),
    originalInput: payload.original_input,
    redactedInput: payload.redacted_input,
    providerUsed: payload.provider_used,
    providerLabel: providerDisplay(payload.provider_used, locale),
    decisionSource: payload.metadata?.decision_source ?? "heuristic_fallback",
    consensus: payload.metadata?.consensus ?? null,
    modelRuns: modelRuns.map((run) => ({
      ...run,
      reasons: run.reasons ?? [],
      actions: run.actions ?? []
    })),
    urlEvidence,
    urlInspection,
    evidenceBuckets,
    modelErrors: payload.metadata?.model_errors ?? [],
    screenshotOcr,
    documentAnalysis,
    voiceAnalysis,
    locale,
    privacyModeEnabled: options.privacyMode,
    raw: payload
  };
}

export async function executeMessageScan(input: {
  text: string;
  language: string;
  privacyMode: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/scan/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: input.text,
      language: input.language,
      privacy_mode: input.privacyMode
    })
  });

  if (!response.ok) {
    let detail = "Message scan failed.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export async function executeUrlScan(input: {
  url: string;
  language: string;
  privacyMode: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/scan/url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: input.url,
      language: input.language,
      privacy_mode: input.privacyMode
    })
  });

  if (!response.ok) {
    let detail = "URL scan failed.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export async function executeScreenshotScan(input: {
  file: File;
  language: string;
  privacyMode: boolean;
  qrPayloads?: string[];
  ocrOverrideText?: string;
}) {
  const formData = new FormData();
  formData.append("image", input.file, input.file.name);
  formData.append("language", input.language);
  formData.append("privacy_mode", String(input.privacyMode));
  if (input.qrPayloads?.length) {
    formData.append("qr_payloads", JSON.stringify(input.qrPayloads));
  }
  if (input.ocrOverrideText?.trim()) {
    formData.append("ocr_override_text", input.ocrOverrideText.trim());
  }

  const response = await fetch(`${API_BASE_URL}/scan/screenshot`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let detail = "Screenshot scan failed.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export async function executeDocumentScan(input: {
  file: File;
  language: string;
  privacyMode: boolean;
}) {
  const formData = new FormData();
  formData.append("file", input.file, input.file.name);
  formData.append("language", input.language);
  formData.append("privacy_mode", String(input.privacyMode));

  const response = await fetch(`${API_BASE_URL}/scan/document`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let detail = "Document scan failed.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export async function executeVoiceSessionStart(input: { language: string; privacyMode: boolean }) {
  const response = await fetch(`${API_BASE_URL}/scan/voice/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      language: input.language,
      privacy_mode: input.privacyMode
    })
  });

  if (!response.ok) {
    let detail = "Voice session could not be started.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as VoiceSessionBootstrap;
}

async function executeVoiceSessionMutation(
  endpoint: "update" | "finalize",
  input: {
    sessionId: string;
    transcriptText: string;
    transcriptSegments: VoiceTranscriptSegmentInput[];
    voiceSignals: VoiceSignalInput[];
    elapsedSeconds: number;
    includeAi?: boolean;
  }
) {
  const response = await fetch(`${API_BASE_URL}/scan/voice/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: input.sessionId,
      transcript_text: input.transcriptText,
      transcript_segments: input.transcriptSegments,
      voice_signals: input.voiceSignals,
      elapsed_seconds: input.elapsedSeconds,
      include_ai: Boolean(input.includeAi)
    })
  });

  if (!response.ok) {
    let detail = `Voice session ${endpoint} failed.`;
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export async function executeVoiceSessionUpdate(input: {
  sessionId: string;
  transcriptText: string;
  transcriptSegments: VoiceTranscriptSegmentInput[];
  voiceSignals: VoiceSignalInput[];
  elapsedSeconds: number;
  includeAi?: boolean;
}) {
  return executeVoiceSessionMutation("update", input);
}

export async function executeVoiceSessionFinalize(input: {
  sessionId: string;
  transcriptText: string;
  transcriptSegments: VoiceTranscriptSegmentInput[];
  voiceSignals: VoiceSignalInput[];
  elapsedSeconds: number;
  includeAi?: boolean;
}) {
  return executeVoiceSessionMutation("finalize", input);
}

export async function executeVoiceRecordingScan(input: {
  file: File;
  language: string;
  privacyMode: boolean;
  transcriptOverrideText: string;
}) {
  const formData = new FormData();
  formData.append("file", input.file, input.file.name);
  formData.append("language", input.language);
  formData.append("privacy_mode", String(input.privacyMode));
  formData.append("transcript_override_text", input.transcriptOverrideText);

  const response = await fetch(`${API_BASE_URL}/scan/voice/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let detail = "Voice recording scan failed.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore final fallback
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as BackendScanResponse;
}

export function buildPlainTextReport(result: MessageScanResult) {
  const reportCopy = SCAN_COPY[result.locale].report;
  const lines = [
    `=== ${reportCopy.title} ===`,
    `${reportCopy.riskLevel}: ${normalizeReportText(result.riskLabelDisplay)}`,
    `${reportCopy.confidence}: ${normalizeReportText(result.confidenceDisplay)}`,
    `Decision Source: ${normalizeReportText(result.decisionSource)}`,
    `${reportCopy.likelyPattern}: ${normalizeReportText(result.likelyScamPattern)}`,
    "",
    `${reportCopy.summary}: ${normalizeReportText(result.summary, true)}`,
    "",
    `${reportCopy.keyFindings}:`
  ];

  result.topReasons.forEach((reason, index) => {
    lines.push(`  ${index + 1}. ${normalizeReportText(reason)}`);
  });

  lines.push("", `${reportCopy.recommendedActions}:`);

  result.recommendedActions.forEach((action, index) => {
    lines.push(`  ${index + 1}. ${normalizeReportText(action)}`);
  });

  if (result.consensus?.summary) {
    lines.push("", `Consensus: ${normalizeReportText(result.consensus.summary, true)}`);
  }

  if (result.evidenceBuckets.length > 0) {
    lines.push("", "Evidence Buckets:");
    result.evidenceBuckets.forEach((bucket) => {
      lines.push(`  - ${bucket.key}: score ${bucket.score}, findings ${bucket.finding_count}`);
      lines.push(`    ${normalizeReportText(bucket.summary, true)}`);
    });
  }

  if (result.screenshotOcr) {
    lines.push("", "Screenshot OCR:");
    lines.push(`  - Confidence: ${result.screenshotOcr.confidenceDisplay}`);
    if (result.screenshotOcr.overrideUsed) {
      lines.push("  - Manual text override: yes");
    }
    if (result.screenshotOcr.layoutSummary) {
      lines.push(`  - Layout: ${normalizeReportText(result.screenshotOcr.layoutSummary, true)}`);
    }
    if (result.screenshotOcr.warnings.length > 0) {
      lines.push("  - OCR warnings:");
      result.screenshotOcr.warnings.forEach((warning) => {
        lines.push(`    * ${normalizeReportText(warning)}`);
      });
    }
    if (result.screenshotOcr.visualSignals.length > 0) {
      lines.push("  - Visual signals:");
      result.screenshotOcr.visualSignals.forEach((signal) => {
        lines.push(`    * [${normalizeReportText(signal.severity)}] ${normalizeReportText(signal.detail)}`);
      });
    }
    if (result.screenshotOcr.qrPayloads.length > 0) {
      lines.push("", "Detected QR Codes:");
      result.screenshotOcr.qrPayloads.forEach((payload, index) => {
        lines.push(`  ${index + 1}. ${normalizeReportText(payload)}`);
      });
    }
  }

  if (result.documentAnalysis) {
    lines.push("", "Document X-Ray:");
    lines.push(`  - File: ${normalizeReportText(result.documentAnalysis.fileName)}`);
    lines.push(`  - Type: ${normalizeReportText(result.documentAnalysis.fileType)}`);
    lines.push(`  - Size: ${normalizeReportText(result.documentAnalysis.fileSizeDisplay)}`);
    lines.push(`  - Parser: ${normalizeReportText(result.documentAnalysis.parser)}`);
    lines.push(`  - Inspectable: ${result.documentAnalysis.inspectable ? "yes" : "limited"}`);
    if (result.documentAnalysis.pageCount !== null) {
      lines.push(`  - Pages: ${result.documentAnalysis.pageCount}`);
    }
    if (result.documentAnalysis.sectionCount !== null) {
      lines.push(`  - Sections: ${result.documentAnalysis.sectionCount}`);
    }
    if (result.documentAnalysis.imageCount > 0) {
      lines.push(`  - Embedded images: ${result.documentAnalysis.imageCount}`);
    }
    if (result.documentAnalysis.protected) {
      lines.push("  - Protected or encrypted: yes");
    }
    if (result.documentAnalysis.macroEnabled) {
      lines.push("  - Macro-enabled: yes");
    }
    if (result.documentAnalysis.imageBased) {
      lines.push("  - Image-based document: yes");
    }
    if (result.documentAnalysis.ocrFallbackUsed) {
      lines.push(
        `  - OCR fallback: yes (${result.documentAnalysis.ocrPagesAnalyzed} page${result.documentAnalysis.ocrPagesAnalyzed === 1 ? "" : "s"} checked${result.documentAnalysis.ocrPageLimit ? `, limit ${result.documentAnalysis.ocrPageLimit}` : ""})`
      );
    }
    if (result.documentAnalysis.limitations.length > 0) {
      lines.push("  - Limitations:");
      result.documentAnalysis.limitations.forEach((item) => {
        lines.push(`    * ${normalizeReportText(item)}`);
      });
    }
    if (result.documentAnalysis.linkPairs.length > 0) {
      lines.push("", "Embedded Links:");
      result.documentAnalysis.linkPairs.forEach((link, index) => {
        const displayText = normalizeReportText(link.display_text) || "Link";
        const targetUrl = normalizeReportText(link.target_url) || "Unknown destination";
        lines.push(`  ${index + 1}. ${displayText} -> ${targetUrl}`);
      });
    }
    if (result.documentAnalysis.qrPayloads.length > 0) {
      lines.push("", "Document QR Payloads:");
      result.documentAnalysis.qrPayloads.forEach((payload, index) => {
        lines.push(`  ${index + 1}. ${normalizeReportText(payload)}`);
      });
    }
  }

  if (result.voiceAnalysis) {
    lines.push("", "Call Guard:");
    lines.push(`  - Session ID: ${normalizeReportText(result.voiceAnalysis.sessionId)}`);
    lines.push(`  - State: ${normalizeReportText(result.voiceAnalysis.analysisState)}`);
    lines.push(`  - Elapsed: ${result.voiceAnalysis.elapsedSeconds}s`);
    lines.push(`  - Transcript words: ${result.voiceAnalysis.transcriptWordCount}`);
    if (result.voiceAnalysis.sourceFileName) {
      lines.push(`  - Source file: ${normalizeReportText(result.voiceAnalysis.sourceFileName)}`);
    }
    if (result.voiceAnalysis.sourceMediaType) {
      lines.push(`  - Media type: ${normalizeReportText(result.voiceAnalysis.sourceMediaType)}`);
    }
    if (result.voiceAnalysis.transcriptionSource) {
      lines.push(`  - Transcript source: ${normalizeReportText(result.voiceAnalysis.transcriptionSource)}`);
    }
    if (result.voiceAnalysis.transcriptionModel) {
      lines.push(`  - Transcript model: ${normalizeReportText(result.voiceAnalysis.transcriptionModel)}`);
    }
    if (result.voiceAnalysis.liveAiState) {
      lines.push(`  - Live AI state: ${normalizeReportText(result.voiceAnalysis.liveAiState)}`);
    }
    if (result.voiceAnalysis.liveAiConfidence) {
      lines.push(`  - Live AI confidence: ${normalizeReportText(result.voiceAnalysis.liveAiConfidence)}`);
    }
    if (result.voiceAnalysis.liveAiSummary) {
      lines.push(`  - Live AI summary: ${normalizeReportText(result.voiceAnalysis.liveAiSummary, true)}`);
    }
    if (result.voiceAnalysis.liveWarnings.length > 0) {
      lines.push("  - Live warnings:");
      result.voiceAnalysis.liveWarnings.forEach((warning) => {
        lines.push(`    * ${normalizeReportText(warning)}`);
      });
    }
    if (result.voiceAnalysis.challengeQuestions.length > 0) {
      lines.push("  - Challenge questions:");
      result.voiceAnalysis.challengeQuestions.forEach((question, index) => {
        lines.push(`    ${index + 1}. ${normalizeReportText(question)}`);
      });
    }
    if (result.voiceAnalysis.voiceSignals.length > 0) {
      lines.push("  - Voice-pattern signals:");
      result.voiceAnalysis.voiceSignals.forEach((signal) => {
        lines.push(`    * [${normalizeReportText(signal.severity)}] ${normalizeReportText(signal.detail)}`);
      });
    }
    if (result.voiceAnalysis.transcriptSegments.length > 0) {
      lines.push("  - Transcript segments:");
      result.voiceAnalysis.transcriptSegments.slice(-8).forEach((segment, index) => {
        lines.push(`    ${index + 1}. ${normalizeReportText(segment.text)}`);
      });
    }
  }

  if (result.modelRuns.length > 0) {
    lines.push("", "Model Assessments:");
    result.modelRuns.forEach((run, index) => {
      lines.push(
        `  ${index + 1}. ${normalizeReportText(run.model)} -> ${SCAN_COPY[result.locale].riskLabels[modelRiskLabel(run.risk_level)]}${
          typeof run.confidence === "number" ? ` (${Math.round(run.confidence * 100)}%)` : ""
        }`
      );
      if (run.explanation) {
        lines.push(`     ${normalizeReportText(run.explanation, true)}`);
      }
    });
  }

  if (result.technicalDetails.length > 0) {
    lines.push("", "Technical Details:");
    result.technicalDetails.forEach((detail, index) => {
      lines.push(`  ${index + 1}. [${normalizeReportText(detail.severity)}] ${normalizeReportText(detail.label)}: ${normalizeReportText(detail.detail)}`);
    });
  }

  if (result.urlInspection.length > 0) {
    lines.push("", "Destination Inspection:");
    result.urlInspection.forEach((inspection, index) => {
      lines.push(`  ${index + 1}. ${normalizeReportText(inspection.normalized_url)}`);
      if (inspection.blocked_reason) {
        lines.push(`     blocked: ${normalizeReportText(inspection.blocked_reason)}`);
        return;
      }
      if (inspection.error && !inspection.inspection_succeeded) {
        lines.push(`     error: ${normalizeReportText(inspection.error)}`);
        return;
      }
      lines.push(`     final: ${normalizeReportText(inspection.final_url ?? inspection.normalized_url)}`);
      lines.push(`     redirects: ${inspection.redirect_chain.length}`);
      if (typeof inspection.status_code === "number") {
        lines.push(`     status: ${inspection.status_code}`);
      }
      if (inspection.page_title) {
        lines.push(`     title: ${normalizeReportText(inspection.page_title)}`);
      }
    });
  }

  if (result.urlEvidence.length > 0) {
    lines.push("", "URL Evidence:");
    result.urlEvidence.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${normalizeReportText(item.domain)} -> registered as ${normalizeReportText(item.registrable_domain)}`);
    });
  }

  if (result.quickTip) {
    lines.push("", `Quick Tip: ${normalizeReportText(result.quickTip, true)}`);
  }

  if (result.privacyNote) {
    lines.push("", `[${reportCopy.privacyMode}: ${normalizeReportText(result.privacyNote, true)}]`);
  }

  lines.push("", `=== ${reportCopy.end} ===`);
  return lines.join("\n");
}

export async function fetchMessageSamples() {
  try {
    const response = await fetch(`${API_BASE_URL}/scan/message-samples`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to load samples.");
    }
    return (await response.json()) as MessageSamplesResponse;
  } catch {
    return FALLBACK_MESSAGE_SAMPLES;
  }
}

export async function fetchScanHistory(locale: string) {
  const response = await fetchHistoryResponse();
  if (!response) {
    return [] as ScanHistoryItem[];
  }

  const data = (await response.json()) as BackendHistoryResponse;
  const normalizedLocale = normalizeLocale(locale);
  return data.items.map((item) => ({
    id: item.entry_id,
    createdAt: item.created_at,
    scanType: item.scan_type,
    riskLabel: item.risk_label,
    riskLabelDisplay: SCAN_COPY[normalizedLocale].riskLabels[item.risk_label],
    snippet: item.snippet
  }));
}

export async function fetchDetailedScanHistory(locale: string) {
  const response = await fetchHistoryResponse();
  if (!response) {
    return [] as DetailedScanHistoryItem[];
  }

  const data = (await response.json()) as BackendHistoryResponse;
  const normalizedLocale = normalizeLocale(locale);
  return data.items.map((item) => ({
    id: item.entry_id,
    createdAt: item.created_at,
    scanType: item.scan_type,
    riskLabel: item.risk_label,
    riskLabelDisplay: SCAN_COPY[normalizedLocale].riskLabels[item.risk_label],
    snippet: item.snippet,
    raw: item.result
  }));
}

export async function fetchIntelFeed() {
  const response = await fetch(`${API_BASE_URL}/intel/feed`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [] as IntelFeedItem[];
  }

  const data = (await response.json()) as BackendIntelFeedResponse;
  return data.items.map((item) => ({
    id: item.id,
    title: item.title,
    copy: item.copy,
    accent: item.accent,
    category: item.category,
    source: item.source,
    publisher: item.publisher,
    referenceUrl: item.reference_url,
    publishedAt: item.published_at,
    lastVerifiedAt: item.last_verified_at
  }));
}

export async function fetchUrlPrecheck(url: string) {
  const response = await fetch(`${API_BASE_URL}/scan/url-precheck?url=${encodeURIComponent(url)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    let detail = "Unable to inspect this URL.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      // ignore json parsing fallback
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as UrlPrecheckResponse;
  return {
    normalizedUrl: payload.normalized_url,
    domain: payload.domain,
    registrableDomain: payload.registrable_domain,
    tld: payload.tld,
    subdomainCount: payload.subdomain_count,
    isRawIp: payload.is_raw_ip,
    isShortened: payload.is_shortened,
    phishTankLoaded: payload.phishtank_loaded,
    phishTankHit: payload.phishtank_hit,
    phishTankCount: payload.phishtank_count
  } as UrlPrecheck;
}

export async function fetchScanCapabilities() {
  const response = await fetch(`${API_BASE_URL}/scan/capabilities`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      screenshotAnalysisAvailable: false,
      screenshotRequiresApiKey: true,
      llmProvider: null,
      llmModel: null,
      scanHistoryAvailable: false,
      voiceLiveBrowserMode: true
    } as ScanCapabilities;
  }

  const payload = (await response.json()) as {
    screenshot_analysis_available: boolean;
    screenshot_requires_api_key: boolean;
    llm_provider: string | null;
    llm_model: string | null;
    scan_history_available?: boolean;
    voice_live_browser_mode?: boolean;
    voice_live_streaming_available?: boolean;
    voice_recording_upload_available?: boolean;
    voice_recording_auto_transcription_available?: boolean;
  };

  if (typeof payload.scan_history_available === "boolean") {
    scanHistoryAvailableCache = payload.scan_history_available;
  }

  return {
    screenshotAnalysisAvailable: payload.screenshot_analysis_available,
    screenshotRequiresApiKey: payload.screenshot_requires_api_key,
    llmProvider: payload.llm_provider,
    llmModel: payload.llm_model,
    scanHistoryAvailable: payload.scan_history_available,
    voiceLiveBrowserMode: payload.voice_live_browser_mode,
    voiceLiveStreamingAvailable: payload.voice_live_streaming_available,
    voiceRecordingUploadAvailable: payload.voice_recording_upload_available,
    voiceRecordingAutoTranscriptionAvailable: payload.voice_recording_auto_transcription_available
  } as ScanCapabilities;
}

export async function downloadBackendReport(result: BackendScanResponse, format: "txt" | "md") {
  const response = await fetch(`${API_BASE_URL}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      result,
      format
    })
  });

  if (!response.ok) {
    let detail = "Unable to generate report.";
    try {
      const data = (await response.json()) as { detail?: string };
      detail = data.detail ?? detail;
    } catch {
      // ignore json parsing fallback
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `cybercoach-report-${stamp}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
