export type SupportedLocale = "en" | "es" | "zh" | "vi" | "ko" | "tl" | "fr";

export type BackendHeuristicFinding = {
  type: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type BackendScanResponse = {
  scan_type: "message" | "url" | "screenshot";
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
  published_at: string;
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
  publishedAt: string;
};

export type UrlPrecheckResponse = {
  normalized_url: string;
  domain: string;
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
      likelyPattern: "Likely Pattern",
      recommendedActions: "Recommended Actions",
      whatToDoNext: "What To Do Next",
      keyFindings: "Key Findings",
      patternScan: "Pattern Scan",
      technicalDetails: "Technical Details",
      triggeredRules: "Triggered Rules",
      noTriggeredRules: "No triggered technical rules were returned for this message.",
      privacyNoteTitle: "Privacy Note",
      protectedReview: "Protected Review",
      quickTip: "Quick Tip",
      educationalGuidance: "Educational Guidance",
      riskScoreBreakdown: "Risk Score Breakdown",
      advancedReview: "Advanced Review",
      scoreDetails: "Score Details",
      scoreDetailsDescription: "Review how the local heuristics contributed to the overall risk score.",
      collapse: "Collapse",
      expand: "Expand",
      noDetailedBreakdown: "No detailed heuristic breakdown is available for this result.",
      reportActions: "Report Actions",
      forwardOrArchive: "Forward Or Archive",
      copyReport: "Copy Report",
      copying: "Copying...",
      downloadTxt: "Download TXT",
      downloadMd: "Download MD",
      preparing: "Preparing..."
    },
    riskLabels: { Safe: "Safe", Suspicious: "Suspicious", "High Risk": "High Risk" },
    confidenceLabels: { Low: "Low", Medium: "Medium", High: "High" },
    providerLabels: { heuristic: "Heuristic Engine", openrouter: "OpenRouter", anthropic: "Anthropic" },
    privacy: {
      redacted: (count) => `${count} piece${count === 1 ? "" : "s"} of personal info ${count === 1 ? "was" : "were"} redacted before analysis`,
      enabledNoRedaction: "Privacy mode was enabled. No personal details needed redaction before analysis."
    },
    tips: {
      urgency: "Scammers create panic so you act before thinking. If a message is rushing you, slow down before you click.",
      domain: "Pause before trusting a link. The real clue is the final destination domain, not the brand name written in the message.",
      credentials: "Legitimate companies do not ask for your password, SSN, or full card details by text or email. Treat those requests as hostile.",
      direct: "When in doubt, do not use the link in the message. Open the company’s official site in a new tab and verify there.",
      default: "If a message feels emotionally loaded, urgent, or unusually personal, that is often the moment to verify it through a safer channel."
    },
    findingTypes: {
      domain_mismatch: "Domain Mismatch",
      suspicious_tld: "Suspicious TLD",
      urgency: "Urgency",
      credential_ask: "Credential Ask",
      sender_spoof: "Sender Spoof",
      homoglyph: "Homoglyph",
      shortened_url: "Shortened URL",
      ip_address_url: "IP Address URL",
      excessive_subdomains: "Excessive Subdomains",
      phishtank_match: "PhishTank Match",
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
      likelyPattern: "Patron Probable",
      recommendedActions: "Acciones Recomendadas",
      whatToDoNext: "Que Hacer Ahora",
      keyFindings: "Hallazgos Clave",
      patternScan: "Escaneo de Patrones",
      technicalDetails: "Detalles Tecnicos",
      triggeredRules: "Reglas Activadas",
      noTriggeredRules: "No se devolvieron reglas tecnicas activadas para este mensaje.",
      privacyNoteTitle: "Nota de Privacidad",
      protectedReview: "Revision Protegida",
      quickTip: "Consejo Rapido",
      educationalGuidance: "Guia Educativa",
      riskScoreBreakdown: "Desglose del Puntaje de Riesgo",
      advancedReview: "Revision Avanzada",
      scoreDetails: "Detalles del Puntaje",
      scoreDetailsDescription: "Revisa como las heuristicas locales aportaron al puntaje total de riesgo.",
      collapse: "Ocultar",
      expand: "Expandir",
      noDetailedBreakdown: "No hay un desglose heuristico detallado disponible para este resultado.",
      reportActions: "Acciones del Informe",
      forwardOrArchive: "Compartir o Archivar",
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
      likelyPattern: "可能模式",
      recommendedActions: "建议操作",
      whatToDoNext: "下一步怎么做",
      keyFindings: "关键发现",
      patternScan: "模式扫描",
      technicalDetails: "技术细节",
      triggeredRules: "触发规则",
      noTriggeredRules: "此消息没有返回任何触发的技术规则。",
      privacyNoteTitle: "隐私说明",
      protectedReview: "受保护审查",
      quickTip: "快速提示",
      educationalGuidance: "教育指导",
      riskScoreBreakdown: "风险分数明细",
      advancedReview: "高级审查",
      scoreDetails: "分数详情",
      scoreDetailsDescription: "查看本地启发式规则如何影响总体风险分数。",
      collapse: "收起",
      expand: "展开",
      noDetailedBreakdown: "此结果没有可用的详细启发式分数明细。",
      reportActions: "报告操作",
      forwardOrArchive: "转发或归档",
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
      likelyPattern: "Kieu co kha nang",
      recommendedActions: "Hanh Dong De Xuat",
      whatToDoNext: "Can Lam Gi Tiep Theo",
      keyFindings: "Phat Hien Chinh",
      patternScan: "Quet Mau",
      technicalDetails: "Chi Tiet Ky Thuat",
      triggeredRules: "Quy Tac Da Kich Hoat",
      noTriggeredRules: "Khong co quy tac ky thuat nao duoc kich hoat cho tin nhan nay.",
      privacyNoteTitle: "Ghi Chu Rieng Tu",
      protectedReview: "Danh Gia Duoc Bao Ve",
      quickTip: "Meo Nhanh",
      educationalGuidance: "Huong Dan Giao Duc",
      riskScoreBreakdown: "Phan Tich Diem Rui Ro",
      advancedReview: "Danh Gia Nang Cao",
      scoreDetails: "Chi Tiet Diem",
      scoreDetailsDescription: "Xem cac heuristic cuc bo da dong gop vao tong diem rui ro nhu the nao.",
      collapse: "Thu Gon",
      expand: "Mo Rong",
      noDetailedBreakdown: "Khong co phan tich heuristic chi tiet cho ket qua nay.",
      reportActions: "Tac Vu Bao Cao",
      forwardOrArchive: "Chuyen Tiep Hoac Luu Tru",
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
      likelyPattern: "가능한 유형",
      recommendedActions: "권장 조치",
      whatToDoNext: "다음 단계",
      keyFindings: "핵심 발견",
      patternScan: "패턴 스캔",
      technicalDetails: "기술 세부사항",
      triggeredRules: "트리거된 규칙",
      noTriggeredRules: "이 메시지에 대해 반환된 기술 규칙이 없습니다.",
      privacyNoteTitle: "개인정보 메모",
      protectedReview: "보호된 검토",
      quickTip: "빠른 팁",
      educationalGuidance: "안내 정보",
      riskScoreBreakdown: "위험 점수 분석",
      advancedReview: "고급 검토",
      scoreDetails: "점수 세부정보",
      scoreDetailsDescription: "로컬 휴리스틱이 전체 위험 점수에 어떻게 기여했는지 확인하세요.",
      collapse: "접기",
      expand: "펼치기",
      noDetailedBreakdown: "이 결과에 사용할 수 있는 상세 휴리스틱 분석이 없습니다.",
      reportActions: "보고서 작업",
      forwardOrArchive: "전달 또는 보관",
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
      likelyPattern: "Posibleng Uri",
      recommendedActions: "Mga Inirerekomendang Aksyon",
      whatToDoNext: "Ano ang Susunod na Gagawin",
      keyFindings: "Mahahalagang Natuklasan",
      patternScan: "Pattern Scan",
      technicalDetails: "Teknikal na Detalye",
      triggeredRules: "Mga Na-trigger na Rule",
      noTriggeredRules: "Walang naibalik na teknikal na rule para sa mensaheng ito.",
      privacyNoteTitle: "Tala sa Privacy",
      protectedReview: "Protektadong Pagsusuri",
      quickTip: "Mabilis na Paalala",
      educationalGuidance: "Gabay Pang-edukasyon",
      riskScoreBreakdown: "Pagkakahati ng Risk Score",
      advancedReview: "Mas Malalim na Pagsusuri",
      scoreDetails: "Detalye ng Score",
      scoreDetailsDescription: "Tingnan kung paano nakaambag ang mga lokal na heuristic sa kabuuang risk score.",
      collapse: "Isara",
      expand: "Buksan",
      noDetailedBreakdown: "Walang detalyadong heuristic breakdown para sa resultang ito.",
      reportActions: "Mga Aksyon sa Ulat",
      forwardOrArchive: "Ipasa o I-archive",
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
      likelyPattern: "Type Probable",
      recommendedActions: "Actions Recommandees",
      whatToDoNext: "Que Faire Ensuite",
      keyFindings: "Constats Cles",
      patternScan: "Analyse de Motifs",
      technicalDetails: "Details Techniques",
      triggeredRules: "Regles Declenchees",
      noTriggeredRules: "Aucune regle technique n'a ete retournee pour ce message.",
      privacyNoteTitle: "Note de Confidentialite",
      protectedReview: "Revision Protegee",
      quickTip: "Conseil Rapide",
      educationalGuidance: "Conseil Educatif",
      riskScoreBreakdown: "Detail du Score de Risque",
      advancedReview: "Revision Avancee",
      scoreDetails: "Details du Score",
      scoreDetailsDescription: "Voyez comment les heuristiques locales ont contribue au score global de risque.",
      collapse: "Reduire",
      expand: "Developper",
      noDetailedBreakdown: "Aucun detail heuristique n'est disponible pour ce resultat.",
      reportActions: "Actions du Rapport",
      forwardOrArchive: "Transmettre ou Archiver",
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

function pickQuickTip(findings: BackendHeuristicFinding[], locale: SupportedLocale) {
  const types = findings.map((finding) => finding.type);
  const tips = SCAN_COPY[locale].tips;
  if (types.includes("urgency")) {
    return tips.urgency;
  }
  if (
    types.includes("domain_mismatch") ||
    types.includes("suspicious_tld") ||
    types.includes("shortened_url") ||
    types.includes("homoglyph")
  ) {
    return tips.domain;
  }
  if (types.includes("credential_ask") || types.includes("sender_spoof")) {
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

export function adaptMessageScanResult(
  payload: BackendScanResponse,
  options: {
    locale: string;
    privacyMode: boolean;
  }
): MessageScanResult {
  const locale = normalizeLocale(options.locale);
  const heuristicFindings = payload.metadata?.heuristic_findings ?? [];
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
  const likelyScamPattern = heuristicFindings[0]
    ? localizedFindingType(heuristicFindings[0].type, locale)
    : riskLabelDisplay;

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
}) {
  const formData = new FormData();
  formData.append("image", input.file, input.file.name);
  formData.append("language", input.language);
  formData.append("privacy_mode", String(input.privacyMode));

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

export function buildPlainTextReport(result: MessageScanResult) {
  const reportCopy = SCAN_COPY[result.locale].report;
  const lines = [
    `=== ${reportCopy.title} ===`,
    `${reportCopy.riskLevel}: ${result.riskLabelDisplay}`,
    `${reportCopy.confidence}: ${result.confidenceDisplay}`,
    `${reportCopy.likelyPattern}: ${result.likelyScamPattern}`,
    "",
    `${reportCopy.summary}: ${result.summary}`,
    "",
    `${reportCopy.keyFindings}:`
  ];

  result.topReasons.forEach((reason, index) => {
    lines.push(`  ${index + 1}. ${reason}`);
  });

  lines.push("", `${reportCopy.recommendedActions}:`);

  result.recommendedActions.forEach((action, index) => {
    lines.push(`  ${index + 1}. ${action}`);
  });

  if (result.privacyNote) {
    lines.push("", `[${reportCopy.privacyMode}: ${result.privacyNote}]`);
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
  const response = await fetch(`${API_BASE_URL}/scan/history`, {
    cache: "no-store"
  });

  if (!response.ok) {
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
  const response = await fetch(`${API_BASE_URL}/scan/history`, {
    cache: "no-store"
  });

  if (!response.ok) {
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
    publishedAt: item.published_at
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
      llmModel: null
    } as ScanCapabilities;
  }

  const payload = (await response.json()) as {
    screenshot_analysis_available: boolean;
    screenshot_requires_api_key: boolean;
    llm_provider: string | null;
    llm_model: string | null;
  };

  return {
    screenshotAnalysisAvailable: payload.screenshot_analysis_available,
    screenshotRequiresApiKey: payload.screenshot_requires_api_key,
    llmProvider: payload.llm_provider,
    llmModel: payload.llm_model
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
