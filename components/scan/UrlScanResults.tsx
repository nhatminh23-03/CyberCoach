"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";
import {
  DecisionSummaryPanel,
  ModelAssessmentsPanel,
  UrlEvidencePanel,
  getConsensusStatusLabel,
  getDecisionModeBadgeLabel,
  getDecisionPanelCopy
} from "@/components/scan/DecisionPanels";
import { getScanLocaleCopy, type MessageScanResult, type SupportedLocale, type UrlPrecheck } from "@/lib/scan";

type UrlScanResultsProps = {
  result: MessageScanResult | null;
  precheck: UrlPrecheck | null;
  loading: boolean;
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  reportBusy: "copy" | "txt" | "md" | null;
};

export function getUrlResultCopy(locale: SupportedLocale) {
  if (locale === "vi") {
    return {
      urlMetadata: "Thong Tin URL",
      forensicBreakdown: "Phan Tich Phap Chung",
      evidenceBuckets: "Lop Bang Chung",
      riskLayers: "Cac Lop Rui Ro",
      destinationInspection: "Kiem Tra Trang Dich",
      liveDestinationReview: "Danh Gia Dich Song",
      normalizedUrl: "URL Chuan Hoa",
      domain: "Ten Mien",
      registeredDomain: "Ten Mien Goc",
      subdomains: "So Subdomain",
      structural: "Cau Truc",
      reputation: "Danh Tieng",
      destination: "Trang Dich",
      score: "Diem",
      findings: "Phat Hien",
      notInspected: "Chua Kiem Tra",
      noBuckets: "Chua co du lieu phan lop bang chung cho URL nay.",
      phishingDatabase: "Co So Du Lieu Lua Dao",
      foundInPhishTank: "Da Tim Thay Trong PhishTank",
      notFound: "Khong Tim Thay",
      datasetUnavailable: "Chua Co Du Lieu",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()} URL lua dao da duoc doi chieu`,
      datasetHint: "Them verified_online.csv de bat xac nhan tu co so du lieu lua dao cuc bo.",
      rawIp: "IP Truc Tiep",
      urlShortener: "Rut Gon URL",
      phishTankMatch: "Trung PhishTank",
      precheckPlaceholder: "Nhap URL de xem host chuan hoa, ten mien cap cao nhat, so subdomain va trang thai doi chieu co so du lieu lua dao.",
      noLiveInspection: "Chua co du lieu kiem tra trang dich song cho URL nay.",
      inspectionBlocked: "Kiem Tra Da Bi Chan",
      inspectionFailed: "Khong The Tai Trang Dich",
      finalUrl: "URL Cuoi Cung",
      finalDomain: "Ten Mien Cuoi Cung",
      statusCode: "Ma Trang Thai",
      redirects: "Chuyen Huong",
      pageTitle: "Tieu De Trang",
      pageExcerpt: "Tom Tat Noi Dung",
      forms: "So Form",
      passwordFields: "O Mat Khau",
      externalAction: "Form Gui Sang Ten Mien Khac",
      metaRefresh: "Meta Refresh",
      queryParams: "So Tham So",
      noFindingsRecorded: "Khong ghi nhan them dau hieu nao trong lop nay.",
      destinationClean: "Kiem tra trang dich hoan tat va khong phat hien them dau hieu bat thuong.",
      yes: "Co",
      no: "Khong"
    };
  }

  if (locale === "es") {
    return {
      urlMetadata: "Metadatos de URL",
      forensicBreakdown: "Analisis Forense",
      evidenceBuckets: "Capas de Evidencia",
      riskLayers: "Capas de Riesgo",
      destinationInspection: "Inspeccion del Destino",
      liveDestinationReview: "Revision en Vivo del Destino",
      normalizedUrl: "URL Normalizada",
      domain: "Dominio",
      registeredDomain: "Dominio Registrado",
      subdomains: "Subdominios",
      structural: "Estructural",
      reputation: "Reputacion",
      destination: "Destino",
      score: "Puntaje",
      findings: "Hallazgos",
      notInspected: "Sin inspeccion",
      noBuckets: "No se devolvieron capas de evidencia para este analisis de URL.",
      phishingDatabase: "Base de Datos de Phishing",
      foundInPhishTank: "Encontrado en PhishTank",
      notFound: "No Encontrado",
      datasetUnavailable: "Base No Disponible",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()} URLs de phishing verificadas`,
      datasetHint: "Agrega verified_online.csv para habilitar la confirmacion local contra phishing.",
      rawIp: "IP Directa",
      urlShortener: "Acortador de URL",
      phishTankMatch: "Coincidencia con PhishTank",
      precheckPlaceholder: "Pega una URL para ver el host normalizado, el dominio registrado, los subdominios y el estado contra phishing.",
      noLiveInspection: "No se devolvieron datos de inspeccion en vivo para esta URL.",
      inspectionBlocked: "Inspeccion bloqueada",
      inspectionFailed: "No se pudo cargar el destino",
      finalUrl: "URL Final",
      finalDomain: "Dominio Final",
      statusCode: "Codigo de Estado",
      redirects: "Redirecciones",
      pageTitle: "Titulo de la Pagina",
      pageExcerpt: "Resumen de la Pagina",
      forms: "Formularios",
      passwordFields: "Campos de Contrasena",
      externalAction: "Formulario hacia Otro Dominio",
      metaRefresh: "Meta Refresh",
      queryParams: "Parametros",
      noFindingsRecorded: "No se registraron hallazgos en esta capa.",
      destinationClean: "La inspeccion en vivo termino sin advertencias adicionales de la pagina.",
      yes: "Si",
      no: "No"
    };
  }

  if (locale === "zh") {
    return {
      urlMetadata: "URL 元数据",
      forensicBreakdown: "取证分析",
      evidenceBuckets: "证据分层",
      riskLayers: "风险层",
      destinationInspection: "目标页面检查",
      liveDestinationReview: "实时目标审查",
      normalizedUrl: "规范化 URL",
      domain: "域名",
      registeredDomain: "注册域名",
      subdomains: "子域名",
      structural: "结构",
      reputation: "信誉",
      destination: "目标页面",
      score: "分数",
      findings: "发现",
      notInspected: "未检查",
      noBuckets: "此 URL 扫描未返回证据分层。",
      phishingDatabase: "钓鱼数据库",
      foundInPhishTank: "已在 PhishTank 中发现",
      notFound: "未发现",
      datasetUnavailable: "数据不可用",
      knownUrlsChecked: (count: number) => `已比对 ${count.toLocaleString()} 条已知钓鱼 URL`,
      datasetHint: "添加 verified_online.csv 以启用本地钓鱼数据库确认。",
      rawIp: "直接 IP",
      urlShortener: "短链接",
      phishTankMatch: "PhishTank 命中",
      precheckPlaceholder: "粘贴 URL 以预览规范化主机、注册域名、子域名数量和钓鱼数据库状态。",
      noLiveInspection: "此 URL 扫描没有返回实时目标检查数据。",
      inspectionBlocked: "检查已阻止",
      inspectionFailed: "无法加载目标页面",
      finalUrl: "最终 URL",
      finalDomain: "最终域名",
      statusCode: "状态码",
      redirects: "跳转",
      pageTitle: "页面标题",
      pageExcerpt: "页面摘要",
      forms: "表单",
      passwordFields: "密码字段",
      externalAction: "表单提交到其他域名",
      metaRefresh: "Meta Refresh",
      queryParams: "查询参数",
      noFindingsRecorded: "这一层未记录到额外发现。",
      destinationClean: "实时目标检查已完成，未发现额外页面行为警告。",
      yes: "是",
      no: "否"
    };
  }

  if (locale === "ko") {
    return {
      urlMetadata: "URL 메타데이터",
      forensicBreakdown: "포렌식 분석",
      evidenceBuckets: "증거 레이어",
      riskLayers: "위험 레이어",
      destinationInspection: "목적지 점검",
      liveDestinationReview: "실시간 목적지 검토",
      normalizedUrl: "정규화된 URL",
      domain: "도메인",
      registeredDomain: "등록 도메인",
      subdomains: "서브도메인",
      structural: "구조",
      reputation: "평판",
      destination: "목적지",
      score: "점수",
      findings: "탐지 수",
      notInspected: "미점검",
      noBuckets: "이 URL 스캔에는 증거 레이어가 반환되지 않았습니다.",
      phishingDatabase: "피싱 데이터베이스",
      foundInPhishTank: "PhishTank 일치",
      notFound: "미발견",
      datasetUnavailable: "데이터 없음",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()}개의 알려진 피싱 URL 대조 완료`,
      datasetHint: "verified_online.csv를 추가하면 로컬 피싱 데이터 확인을 사용할 수 있습니다.",
      rawIp: "직접 IP",
      urlShortener: "단축 URL",
      phishTankMatch: "PhishTank 일치",
      precheckPlaceholder: "URL을 붙여 넣으면 정규화된 호스트, 등록 도메인, 서브도메인 수와 데이터베이스 상태를 확인할 수 있습니다.",
      noLiveInspection: "이 URL 스캔에는 실시간 목적지 점검 데이터가 없습니다.",
      inspectionBlocked: "점검 차단",
      inspectionFailed: "목적지를 불러오지 못했습니다",
      finalUrl: "최종 URL",
      finalDomain: "최종 도메인",
      statusCode: "상태 코드",
      redirects: "리디렉션",
      pageTitle: "페이지 제목",
      pageExcerpt: "페이지 요약",
      forms: "폼 수",
      passwordFields: "비밀번호 필드",
      externalAction: "다른 도메인으로 제출",
      metaRefresh: "메타 리프레시",
      queryParams: "쿼리 파라미터",
      noFindingsRecorded: "이 레이어에서는 추가 탐지가 없었습니다.",
      destinationClean: "실시간 목적지 점검이 끝났고 추가 페이지 경고는 없었습니다.",
      yes: "예",
      no: "아니오"
    };
  }

  if (locale === "tl") {
    return {
      urlMetadata: "Metadata ng URL",
      forensicBreakdown: "Forensic Breakdown",
      evidenceBuckets: "Mga Layer ng Ebidensya",
      riskLayers: "Mga Layer ng Panganib",
      destinationInspection: "Inspeksyon ng Destinasyon",
      liveDestinationReview: "Live na Pagsusuri ng Destinasyon",
      normalizedUrl: "Na-normalize na URL",
      domain: "Domain",
      registeredDomain: "Rehistradong Domain",
      subdomains: "Mga Subdomain",
      structural: "Istruktura",
      reputation: "Reputasyon",
      destination: "Destinasyon",
      score: "Iskor",
      findings: "Natuklasan",
      notInspected: "Hindi nasuri",
      noBuckets: "Walang naibalik na evidence bucket para sa URL scan na ito.",
      phishingDatabase: "Database ng Phishing",
      foundInPhishTank: "Natagpuan sa PhishTank",
      notFound: "Walang Tugma",
      datasetUnavailable: "Walang Dataset",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()} kilalang phishing URL ang nasuri`,
      datasetHint: "Idagdag ang verified_online.csv para sa lokal na phishing database confirmation.",
      rawIp: "Direktang IP",
      urlShortener: "Shortener ng URL",
      phishTankMatch: "Tugma sa PhishTank",
      precheckPlaceholder: "I-paste ang URL para makita ang normalized host, rehistradong domain, bilang ng subdomain, at phishing database status.",
      noLiveInspection: "Walang live destination inspection data para sa URL na ito.",
      inspectionBlocked: "Na-block ang inspeksyon",
      inspectionFailed: "Hindi ma-load ang destinasyon",
      finalUrl: "Huling URL",
      finalDomain: "Huling Domain",
      statusCode: "Status Code",
      redirects: "Mga Redirect",
      pageTitle: "Pamagat ng Pahina",
      pageExcerpt: "Buod ng Pahina",
      forms: "Mga Form",
      passwordFields: "Mga Field ng Password",
      externalAction: "Form papunta sa ibang domain",
      metaRefresh: "Meta Refresh",
      queryParams: "Mga Parameter",
      noFindingsRecorded: "Walang naitalang karagdagang signal sa layer na ito.",
      destinationClean: "Natapos ang live destination inspection nang walang dagdag na babala sa page behavior.",
      yes: "Oo",
      no: "Hindi"
    };
  }

  if (locale === "fr") {
    return {
      urlMetadata: "Metadonnees URL",
      forensicBreakdown: "Analyse Forensique",
      evidenceBuckets: "Couches de Preuves",
      riskLayers: "Couches de Risque",
      destinationInspection: "Inspection de la Destination",
      liveDestinationReview: "Verification en Direct de la Destination",
      normalizedUrl: "URL Normalisee",
      domain: "Domaine",
      registeredDomain: "Domaine Enregistre",
      subdomains: "Sous-domaines",
      structural: "Structurel",
      reputation: "Reputation",
      destination: "Destination",
      score: "Score",
      findings: "Constats",
      notInspected: "Non inspecte",
      noBuckets: "Aucune couche de preuves n'a ete retournee pour cette analyse URL.",
      phishingDatabase: "Base de Donnees Phishing",
      foundInPhishTank: "Trouve dans PhishTank",
      notFound: "Aucune Correspondance",
      datasetUnavailable: "Base Indisponible",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()} URL de phishing connues verifiees`,
      datasetHint: "Ajoutez verified_online.csv pour activer la verification locale contre le phishing.",
      rawIp: "IP Directe",
      urlShortener: "Raccourcisseur d'URL",
      phishTankMatch: "Correspondance PhishTank",
      precheckPlaceholder: "Collez une URL pour voir l'hote normalise, le domaine enregistre, le nombre de sous-domaines et l'etat de la base phishing.",
      noLiveInspection: "Aucune donnee d'inspection en direct n'a ete retournee pour cette URL.",
      inspectionBlocked: "Inspection bloquee",
      inspectionFailed: "Impossible de charger la destination",
      finalUrl: "URL Finale",
      finalDomain: "Domaine Final",
      statusCode: "Code de Statut",
      redirects: "Redirections",
      pageTitle: "Titre de la Page",
      pageExcerpt: "Resume de la Page",
      forms: "Formulaires",
      passwordFields: "Champs de Mot de Passe",
      externalAction: "Formulaire vers un autre domaine",
      metaRefresh: "Meta Refresh",
      queryParams: "Parametres",
      noFindingsRecorded: "Aucun signal supplementaire n'a ete enregistre dans cette couche.",
      destinationClean: "L'inspection en direct est terminee sans alerte supplementaire sur le comportement de la page.",
      yes: "Oui",
      no: "Non"
    };
  }

  return {
    urlMetadata: "URL Metadata",
    forensicBreakdown: "Forensic Breakdown",
    evidenceBuckets: "Evidence Buckets",
    riskLayers: "Risk Layers",
    destinationInspection: "Destination Inspection",
    liveDestinationReview: "Live Destination Review",
    normalizedUrl: "Normalized URL",
    domain: "Domain",
    registeredDomain: "Registered Domain",
    subdomains: "Subdomains",
    structural: "Structural",
    reputation: "Reputation",
    destination: "Destination",
    score: "Score",
    findings: "Findings",
    notInspected: "Not inspected",
    noBuckets: "No evidence buckets were returned for this URL scan.",
    phishingDatabase: "Phishing Database",
    foundInPhishTank: "Found in PhishTank",
    notFound: "Not Found",
    datasetUnavailable: "Dataset Unavailable",
    knownUrlsChecked: (count: number) => `${count.toLocaleString()} known phishing URLs checked`,
    datasetHint: "Add verified_online.csv to enable local phishing-database confirmation.",
    rawIp: "Raw IP",
    urlShortener: "URL Shortener",
    phishTankMatch: "PhishTank Match",
    precheckPlaceholder: "Paste a URL to preview its normalized host, top-level domain, subdomain count, and phishing-database status.",
    noLiveInspection: "No live destination inspection data was returned for this URL scan.",
    inspectionBlocked: "Inspection blocked",
    inspectionFailed: "Unable to load destination",
    finalUrl: "Final URL",
    finalDomain: "Final Domain",
    statusCode: "Status Code",
    redirects: "Redirects",
    pageTitle: "Page Title",
    pageExcerpt: "Page Excerpt",
    forms: "Forms",
    passwordFields: "Password Fields",
    externalAction: "External Form Action",
    metaRefresh: "Meta Refresh",
    queryParams: "Query Params",
    noFindingsRecorded: "No findings were recorded in this layer.",
    destinationClean: "Live destination inspection completed without additional page-behavior warnings.",
    yes: "Yes",
    no: "No"
  };
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

function PlaceholderFeatures() {
  return (
    <section className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <ShieldCheckIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Deep Link Crawl</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Recursive extraction of target links, destination hosts, and nested path structure before you decide.
          </p>
        </div>
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <CheckCircleIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Domain Reputation</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Cross-reference against local phishing intelligence, suspicious TLDs, and deceptive domain structure.
          </p>
        </div>
        <div className="col-span-12 space-y-6 bg-surface-container-low p-8 md:col-span-4">
          <ShieldCheckIcon className="h-8 w-8 text-secondary" />
          <h3 className="font-headline text-2xl font-bold tracking-tight text-vellum">Phishing Signature</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Heuristic matching for homoglyph attacks, IP-based links, shorteners, and excessive subdomain layering.
          </p>
        </div>
      </div>

      <div className="animate-fade-up border-l-2 border-secondary bg-primary-container p-8" style={{ animationDelay: "90ms" }}>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Live Interception Log</p>
            <p className="mt-2 text-sm text-on-primary-container">Session ID: CC-URL-ALPHA</p>
          </div>
          <div className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
            Encrypted Session
          </div>
        </div>
        <div className="space-y-3 font-mono text-[12px] text-primary">
          <div>
            <span className="text-secondary">[08:42:11]</span> Initializing URL inspection environment...
          </div>
          <div>
            <span className="text-secondary">[08:42:13]</span> Waiting for target endpoint input...
          </div>
          <div>
            <span className="text-secondary">[08:42:15]</span> DNS, PhishTank, and heuristic checks will appear after analysis.
          </div>
        </div>
      </div>
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

function UrlMetadataCard({ precheck, locale }: { precheck: UrlPrecheck | null; locale: SupportedLocale }) {
  const urlCopy = getUrlResultCopy(locale);
  const tags = [
    precheck?.isRawIp ? urlCopy.rawIp : null,
    precheck?.isShortened ? urlCopy.urlShortener : null,
    precheck?.phishTankHit ? urlCopy.phishTankMatch : null
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {precheck ? (
        <>
          <div className="ghost-border bg-surface-container-lowest/55 p-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.normalizedUrl}</p>
            <p className="mt-2 break-all text-sm leading-relaxed text-on-surface">{precheck.normalizedUrl}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.domain}</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.domain}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.registeredDomain}</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.registrableDomain}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">TLD</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.tld}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.subdomains}</p>
              <p className="mt-2 text-lg font-semibold text-vellum">{precheck.subdomainCount}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/55 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.phishingDatabase}</p>
              <p className={`mt-2 text-lg font-semibold ${precheck.phishTankHit ? "text-[#ffb4ab]" : "text-vellum"}`}>
                {precheck.phishTankLoaded
                  ? precheck.phishTankHit
                    ? urlCopy.foundInPhishTank
                    : urlCopy.notFound
                  : urlCopy.datasetUnavailable}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {precheck.phishTankLoaded
                  ? urlCopy.knownUrlsChecked(precheck.phishTankCount)
                  : urlCopy.datasetHint}
              </p>
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-on-surface-variant">
          {urlCopy.precheckPlaceholder}
        </p>
      )}
    </div>
  );
}

function bucketTone(score: number) {
  if (score >= 6) {
    return "text-[#ffb4ab]";
  }
  if (score >= 3) {
    return "text-secondary";
  }
  return "text-[#d6e3ff]";
}

function compactUrlDisplay(value: string | null) {
  if (!value) {
    return { primary: "", queryCount: 0 };
  }

  try {
    const parsed = new URL(value);
    return {
      primary: `${parsed.origin}${parsed.pathname}`,
      queryCount: Array.from(parsed.searchParams.keys()).length
    };
  } catch {
    return {
      primary: value,
      queryCount: 0
    };
  }
}

function bucketLabel(key: string, locale: SupportedLocale) {
  const copy = getUrlResultCopy(locale);
  if (key === "reputation") {
    return copy.reputation;
  }
  if (key === "destination") {
    return copy.destination;
  }
  return copy.structural;
}

function bucketSummary(bucket: MessageScanResult["evidenceBuckets"][number], locale: SupportedLocale) {
  const copy = getUrlResultCopy(locale);
  if (bucket.key === "destination" && bucket.inspected === false) {
    return copy.noLiveInspection;
  }
  if (bucket.key === "destination" && bucket.finding_count === 0 && bucket.inspected !== false) {
    return copy.destinationClean;
  }
  if (bucket.finding_count === 0) {
    return copy.noFindingsRecorded;
  }
  return bucket.summary;
}

export function EvidenceBucketsCard({ result }: { result: MessageScanResult }) {
  const urlCopy = getUrlResultCopy(result.locale);

  if (result.evidenceBuckets.length === 0) {
    return <p className="text-sm leading-relaxed text-on-surface-variant">{urlCopy.noBuckets}</p>;
  }

  return (
    <div className="space-y-3">
      {result.evidenceBuckets.map((bucket) => (
        <div key={bucket.key} className="ghost-border bg-surface-container-lowest/55 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {bucketLabel(bucket.key, result.locale)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{bucketSummary(bucket, result.locale)}</p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[248px]">
              <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                <p className="font-label text-[9px] font-bold uppercase tracking-[0.12em] text-outline">{urlCopy.score}</p>
                <p className={`mt-2 font-headline text-3xl font-bold ${bucketTone(bucket.score)}`}>{bucket.score}</p>
              </div>
              <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                <p className="font-label text-[9px] font-bold uppercase tracking-[0.12em] text-outline">{urlCopy.findings}</p>
                <p className="mt-2 text-lg font-semibold text-vellum">
                  {bucket.key === "destination" && bucket.inspected === false ? urlCopy.notInspected : bucket.finding_count}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DestinationInspectionCard({ result }: { result: MessageScanResult }) {
  const urlCopy = getUrlResultCopy(result.locale);

  if (result.urlInspection.length === 0) {
    return <p className="text-sm leading-relaxed text-on-surface-variant">{urlCopy.noLiveInspection}</p>;
  }

  return (
    <div className="space-y-4">
      {result.urlInspection.map((inspection) => {
        const originalDisplay = compactUrlDisplay(inspection.normalized_url);
        const finalDisplay = compactUrlDisplay(inspection.final_url ?? inspection.normalized_url);

        return (
        <div key={inspection.normalized_url} className="ghost-border bg-surface-container-lowest/55 p-5">
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {inspection.inspection_succeeded ? urlCopy.destinationInspection : inspection.blocked_reason ? urlCopy.inspectionBlocked : urlCopy.inspectionFailed}
              </p>
              <p className="mt-2 break-words text-sm font-semibold text-vellum [overflow-wrap:anywhere]">{originalDisplay.primary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {originalDisplay.queryCount > 0 ? (
                <span className="break-words border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.12em] text-vellum [overflow-wrap:anywhere]">
                  {urlCopy.queryParams}: {originalDisplay.queryCount}
                </span>
              ) : null}
              <span className="break-words border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.12em] text-vellum [overflow-wrap:anywhere]">
                {urlCopy.redirects}: {inspection.redirect_chain.length}
              </span>
              {typeof inspection.status_code === "number" ? (
                <span className="break-words border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.12em] text-vellum [overflow-wrap:anywhere]">
                  {urlCopy.statusCode}: {inspection.status_code}
                </span>
              ) : null}
            </div>
          </div>

          {inspection.blocked_reason ? (
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{inspection.blocked_reason}</p>
          ) : inspection.error && !inspection.inspection_succeeded ? (
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{inspection.error}</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)]">
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.finalUrl}</p>
                  <p className="mt-2 break-words text-sm leading-relaxed text-on-surface [overflow-wrap:anywhere]">{finalDisplay.primary}</p>
                  {finalDisplay.queryCount > 0 ? (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">
                      {urlCopy.queryParams}: {finalDisplay.queryCount}
                    </p>
                  ) : null}
                </div>
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.finalDomain}</p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface">{inspection.final_domain ?? inspection.domain}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.forms}</p>
                  <p className="mt-2 text-sm font-semibold text-vellum">{inspection.form_count}</p>
                </div>
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.passwordFields}</p>
                  <p className="mt-2 text-sm font-semibold text-vellum">{inspection.password_field_count}</p>
                </div>
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.externalAction}</p>
                  <p className="mt-2 text-sm font-semibold text-vellum">{inspection.external_form_action ? urlCopy.yes : urlCopy.no}</p>
                </div>
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.metaRefresh}</p>
                  <p className="mt-2 text-sm font-semibold text-vellum">{inspection.meta_refresh_target ? urlCopy.yes : urlCopy.no}</p>
                </div>
              </div>

              {inspection.page_title ? (
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.pageTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface">{inspection.page_title}</p>
                </div>
              ) : null}

              {inspection.page_excerpt ? (
                <div className="border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{urlCopy.pageExcerpt}</p>
                  <div className="mt-2 max-h-36 overflow-y-auto pr-1 text-sm leading-relaxed text-on-surface-variant">
                    {inspection.page_excerpt}
                  </div>
                </div>
              ) : null}

              {inspection.redirect_chain.length > 0 ? (
                <div className="space-y-2">
                  {inspection.redirect_chain.map((hop, index) => {
                    const fromDisplay = compactUrlDisplay(hop.from_url);
                    const toDisplay = compactUrlDisplay(hop.to_url);
                    return (
                    <div key={`${hop.from_url}-${hop.to_url}-${index}`} className="border border-outline-variant/20 bg-surface-container-low p-3">
                      <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
                        {urlCopy.redirects} {index + 1}
                      </p>
                      <p className="mt-2 break-words text-sm leading-relaxed text-on-surface-variant [overflow-wrap:anywhere]">
                        {fromDisplay.primary} {"->"} {toDisplay.primary}
                      </p>
                    </div>
                  );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
}

export function UrlScanResults({
  result,
  precheck,
  loading,
  onCopyReport,
  onDownloadReport,
  reportBusy
}: UrlScanResultsProps) {
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);
  const decisionCopy = useMemo(() => getDecisionPanelCopy(result?.locale ?? "en"), [result?.locale]);
  const urlCopy = useMemo(() => getUrlResultCopy(result?.locale ?? "en"), [result?.locale]);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures />;
  }

  return (
    <section className="grid grid-cols-12 gap-6">
      <ResultShell title={result.riskLabelDisplay} eyebrow={copy.result.riskSummary} className="col-span-12 md:col-span-5">
        <div className="space-y-5">
          <div className={`font-headline text-5xl font-extrabold tracking-editorial ${RiskAccent({ label: result.riskLabel })}`}>
            {result.riskScore}
          </div>
          <div className="space-y-2">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{copy.result.heuristicScore}</p>
            <p className="text-sm text-on-surface-variant">
              {copy.result.confidence} {result.confidenceDisplay} · {result.providerLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
              {getDecisionModeBadgeLabel(result.decisionSource, result.locale)}
            </span>
            {result.consensus ? (
              <span className="border border-outline-variant/30 bg-surface-container-lowest/70 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
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

      <ResultShell title={urlCopy.urlMetadata} eyebrow={urlCopy.forensicBreakdown} className="col-span-12 md:col-span-7" delay={60}>
        <UrlMetadataCard precheck={precheck} locale={result.locale} />
      </ResultShell>

      <ResultShell title={urlCopy.evidenceBuckets} eyebrow={urlCopy.riskLayers} className="col-span-12 2xl:col-span-4" delay={105}>
        <EvidenceBucketsCard result={result} />
      </ResultShell>

      <ResultShell title={urlCopy.destinationInspection} eyebrow={urlCopy.liveDestinationReview} className="col-span-12 2xl:col-span-8" delay={115}>
        <DestinationInspectionCard result={result} />
      </ResultShell>

      <ResultShell title={copy.result.recommendedActions} eyebrow={copy.result.whatToDoNext} className="col-span-12 md:col-span-7" delay={120}>
        <RecommendedActionsCard actions={result.recommendedActions} />
      </ResultShell>

      <ResultShell title={copy.result.keyFindings} eyebrow={copy.result.patternScan} className="col-span-12 md:col-span-5" delay={180}>
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

      <ResultShell title={copy.result.reportActions} eyebrow={copy.result.forwardOrArchive} className="col-span-12" delay={420}>
        <div className="grid gap-3 md:grid-cols-3">
          <button type="button" onClick={() => void onCopyReport()} className="editorial-button justify-between px-5">
            <span>{reportBusy === "copy" ? copy.result.copying : copy.result.copyReport}</span>
            <span className="text-secondary">TXT</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("txt")} className="editorial-button justify-between px-5">
            <span>{reportBusy === "txt" ? copy.result.preparing : copy.result.downloadTxt}</span>
            <span className="text-secondary">.txt</span>
          </button>
          <button type="button" onClick={() => void onDownloadReport("md")} className="editorial-button justify-between px-5">
            <span>{reportBusy === "md" ? copy.result.preparing : copy.result.downloadMd}</span>
            <span className="text-secondary">.md</span>
          </button>
        </div>
      </ResultShell>
    </section>
  );
}
