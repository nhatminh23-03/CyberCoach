"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useHighlightOnFirstVisible } from "@/components/scan/useHighlightOnFirstVisible";
import { getScanLocaleCopy, type MessageScanResult, type SupportedLocale, type UrlPrecheck } from "@/lib/scan";

type UrlScanResultsProps = {
  result: MessageScanResult | null;
  precheck: UrlPrecheck | null;
  loading: boolean;
  onCopyReport: () => Promise<void>;
  onDownloadReport: (format: "txt" | "md") => Promise<void>;
  reportBusy: "copy" | "txt" | "md" | null;
  decisionHighlightKey?: number;
};

export function getUrlResultCopy(locale: SupportedLocale) {
  if (locale === "vi") {
    return {
      reviewActivity: "Hoat Dong Kiem Tra",
      reviewReady: "San Sang Kiem Tra",
      awaitingLink: "Dang Cho Lien Ket",
      activitySummaryReady: "CyberCoach da chuan bi xong ban xem truoc cua lien ket nay va san sang quet day du.",
      activitySummaryIdle: "Hoat dong se hien thi o day sau khi ban dan lien ket vao de cho thay CyberCoach doc va kiem tra no nhu the nao.",
      normalizedHost: "Host Chuan Hoa",
      precheckStatus: "Trang Thai So Bo",
      structuralSignals: "Dau Hieu Cau Truc",
      noStructuralSignals: "Chua thay dau hieu cau truc ro rang trong ban xem truoc nay.",
      lookupReady: "San sang cho quet day du",
      urlMetadata: "Chi Tiet Lien Ket",
      forensicBreakdown: "Nhung Gi Da Kiem Tra",
      evidenceBuckets: "Nguon Rui Ro",
      riskLayers: "Tom Tat Rui Ro",
      destinationInspection: "Kiem Tra Dich Den",
      liveDestinationReview: "Neu Ban Mo Lien Ket Nay",
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
      noBuckets: "Chua co tom tat nao cho biet rui ro hien den tu dau trong lien ket nay.",
      phishingDatabase: "Co So Du Lieu Lua Dao",
      foundInPhishTank: "Da Tim Thay Trong PhishTank",
      notFound: "Khong Tim Thay",
      datasetUnavailable: "Chua Co Du Lieu",
      knownUrlsChecked: (count: number) => `${count.toLocaleString()} URL lua dao da duoc doi chieu`,
      datasetHint: "Them verified_online.csv de bat xac nhan tu co so du lieu lua dao cuc bo.",
      rawIp: "IP Truc Tiep",
      urlShortener: "Rut Gon URL",
      phishTankMatch: "Trung PhishTank",
      precheckPlaceholder: "Nhap URL de xem lien ket duoc chuan hoa the nao, ten mien goc, so subdomain va tinh trang doi chieu voi co so du lieu lua dao.",
      noLiveInspection: "Chua co thong tin kiem tra dich den cho lien ket nay.",
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
      destinationClean: "Kiem tra dich den da hoan tat va khong phat hien them dau hieu dang lo.",
      yes: "Co",
      no: "Khong"
    };
  }

  if (locale === "es") {
    return {
      reviewActivity: "Actividad de Revision",
      reviewReady: "Precheck listo",
      awaitingLink: "Esperando enlace",
      activitySummaryReady: "CyberCoach ya preparo la vista previa de este enlace y puede continuar con la revision completa.",
      activitySummaryIdle: "La actividad aparecera aqui cuando pegues un enlace para mostrar como CyberCoach lo interpreta antes del analisis completo.",
      normalizedHost: "Host normalizado",
      precheckStatus: "Estado previo",
      structuralSignals: "Senales estructurales",
      noStructuralSignals: "No se detectaron senales estructurales claras en esta vista previa.",
      lookupReady: "Listo para la revision completa",
      urlMetadata: "Detalles del Enlace",
      forensicBreakdown: "Lo que se reviso",
      evidenceBuckets: "De donde viene el riesgo",
      riskLayers: "Resumen del riesgo",
      destinationInspection: "Revision del destino",
      liveDestinationReview: "Si abres este enlace",
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
      noBuckets: "Aun no hay un resumen de donde proviene el riesgo para este enlace.",
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
      noLiveInspection: "No se devolvieron datos de revision del destino para esta URL.",
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
      destinationClean: "La revision del destino termino sin advertencias adicionales sobre la pagina.",
      yes: "Si",
      no: "No"
    };
  }

  if (locale === "zh") {
    return {
      reviewActivity: "检查活动",
      reviewReady: "预检查已完成",
      awaitingLink: "等待链接",
      activitySummaryReady: "CyberCoach 已为这个链接准备好预检查结果，可以继续完整扫描。",
      activitySummaryIdle: "当你粘贴链接后，这里会显示 CyberCoach 如何读取并预检查这个链接。",
      normalizedHost: "规范化主机",
      precheckStatus: "预检查状态",
      structuralSignals: "结构信号",
      noStructuralSignals: "这次预检查还没有发现明显的结构异常。",
      lookupReady: "可继续完整扫描",
      urlMetadata: "链接详情",
      forensicBreakdown: "已检查内容",
      evidenceBuckets: "风险主要来自哪里",
      riskLayers: "风险概览",
      destinationInspection: "目标检查",
      liveDestinationReview: "如果打开这个链接",
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
      noBuckets: "这次扫描还没有返回“风险来自哪里”的摘要。",
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
      noLiveInspection: "这次 URL 扫描没有返回目标检查数据。",
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
      destinationClean: "目标检查已完成，未发现额外的页面行为警告。",
      yes: "是",
      no: "否"
    };
  }

  if (locale === "ko") {
    return {
      reviewActivity: "검토 활동",
      reviewReady: "사전 점검 완료",
      awaitingLink: "링크 대기 중",
      activitySummaryReady: "CyberCoach가 이 링크의 미리보기를 준비했고 전체 검토를 진행할 수 있습니다.",
      activitySummaryIdle: "링크를 붙여 넣으면 전체 분석 전에 CyberCoach가 어떻게 읽고 점검하는지 여기에 표시됩니다.",
      normalizedHost: "정규화된 호스트",
      precheckStatus: "사전 점검 상태",
      structuralSignals: "구조 신호",
      noStructuralSignals: "이 미리보기에서는 뚜렷한 구조 신호가 발견되지 않았습니다.",
      lookupReady: "전체 검토 준비 완료",
      urlMetadata: "링크 세부정보",
      forensicBreakdown: "확인한 내용",
      evidenceBuckets: "위험이 오는 곳",
      riskLayers: "위험 요약",
      destinationInspection: "목적지 확인",
      liveDestinationReview: "이 링크를 열면",
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
      noBuckets: "이 링크에서 위험이 어디서 오는지에 대한 요약이 아직 없습니다.",
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
      noLiveInspection: "이 URL 스캔에는 목적지 확인 데이터가 없습니다.",
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
      destinationClean: "목적지 확인이 끝났고 추가 페이지 경고는 없었습니다.",
      yes: "예",
      no: "아니오"
    };
  }

  if (locale === "tl") {
    return {
      reviewActivity: "Aktibidad ng Pagsusuri",
      reviewReady: "Handa na ang precheck",
      awaitingLink: "Naghihintay ng link",
      activitySummaryReady: "Naihanda na ng CyberCoach ang preview ng link na ito at handa na para sa buong scan.",
      activitySummaryIdle: "Lilitaw dito ang aktibidad kapag nag-paste ka ng link para makita kung paano ito babasahin ng CyberCoach bago ang buong scan.",
      normalizedHost: "Na-normalize na host",
      precheckStatus: "Katayuan ng precheck",
      structuralSignals: "Mga palatandaang istruktural",
      noStructuralSignals: "Wala pang malinaw na structural signal sa preview na ito.",
      lookupReady: "Handa para sa buong scan",
      urlMetadata: "Detalye ng Link",
      forensicBreakdown: "Ano ang Sinuri",
      evidenceBuckets: "Saan nanggagaling ang panganib",
      riskLayers: "Buod ng panganib",
      destinationInspection: "Pagsuri sa destinasyon",
      liveDestinationReview: "Kapag binuksan ang link",
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
      noBuckets: "Wala pang buod kung saan nanggagaling ang panganib para sa link na ito.",
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
      noLiveInspection: "Walang naibalik na detalye para sa destination check ng URL na ito.",
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
      destinationClean: "Natapos ang destination check nang walang dagdag na babala tungkol sa page behavior.",
      yes: "Oo",
      no: "Hindi"
    };
  }

  if (locale === "fr") {
    return {
      reviewActivity: "Activite de Verification",
      reviewReady: "Precontrole pret",
      awaitingLink: "En attente du lien",
      activitySummaryReady: "CyberCoach a prepare l'aperçu de ce lien et peut maintenant lancer la verification complete.",
      activitySummaryIdle: "L'activite s'affichera ici quand vous collerez un lien pour montrer comment CyberCoach le lit avant l'analyse complete.",
      normalizedHost: "Hote normalise",
      precheckStatus: "Statut du precontrole",
      structuralSignals: "Signaux structurels",
      noStructuralSignals: "Aucun signal structurel clair n'a ete releve dans cet apercu.",
      lookupReady: "Pret pour la verification complete",
      urlMetadata: "Details du Lien",
      forensicBreakdown: "Ce qui a ete verifie",
      evidenceBuckets: "D'ou vient le risque",
      riskLayers: "Resume du risque",
      destinationInspection: "Verification de la destination",
      liveDestinationReview: "Si vous ouvrez ce lien",
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
      noBuckets: "Aucun resume n'indique encore d'ou vient le risque pour ce lien.",
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
      noLiveInspection: "Aucune information de verification de destination n'a ete retournee pour cette URL.",
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
      destinationClean: "La verification de la destination s'est terminee sans avertissement supplementaire sur le comportement de la page.",
      yes: "Oui",
      no: "Non"
    };
  }

  return {
    reviewActivity: "Review Activity",
    reviewReady: "Precheck Ready",
    awaitingLink: "Waiting For A Link",
    activitySummaryReady: "CyberCoach has already prepared a preview of this link and is ready for the full scan.",
    activitySummaryIdle: "Activity appears here once you paste a link, so you can see how CyberCoach reads it before the full scan runs.",
    normalizedHost: "Normalized Host",
    precheckStatus: "Precheck Status",
    structuralSignals: "Structural Signals",
    noStructuralSignals: "No clear structural warning signs were found in this preview.",
    lookupReady: "Ready for full review",
    urlMetadata: "Link Details",
    forensicBreakdown: "What We Checked",
    evidenceBuckets: "Where the risk is coming from",
    riskLayers: "Risk Breakdown",
    destinationInspection: "Destination Check",
    liveDestinationReview: "If you open this link",
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
    noBuckets: "There is not enough information yet to summarize where the risk is coming from for this link.",
    phishingDatabase: "Phishing Database",
    foundInPhishTank: "Found in PhishTank",
    notFound: "Not Found",
    datasetUnavailable: "Dataset Unavailable",
    knownUrlsChecked: (count: number) => `${count.toLocaleString()} known phishing URLs checked`,
    datasetHint: "Add verified_online.csv to enable local phishing-database confirmation.",
    rawIp: "Raw IP",
    urlShortener: "URL Shortener",
    phishTankMatch: "PhishTank Match",
    precheckPlaceholder: "Paste a link to preview the domain, subdomains, normalized host, and phishing-database status before you open it.",
    noLiveInspection: "No destination-check data was returned for this link.",
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
    noFindingsRecorded: "No additional warnings were recorded in this area.",
    destinationClean: "The destination check finished without additional page-behavior warnings.",
    yes: "Yes",
    no: "No"
  };
}

function ResultShell({
  title,
  eyebrow,
  children,
  className = "",
  delay = 0,
  highlightSessionKey = null,
  highlightEnabled = false
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  highlightSessionKey?: string | null;
  highlightEnabled?: boolean;
}) {
  const { ref, activeClassName } = useHighlightOnFirstVisible({
    sessionKey: highlightSessionKey,
    enabled: highlightEnabled
  });

  return (
    <section
      ref={ref}
      className={`ghost-border scan-card-highlightable animate-fade-up bg-surface-container-low p-8 ${activeClassName} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">{eyebrow}</p>
      <h3 className="mt-3 font-headline text-2xl font-bold tracking-tight text-vellum">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PlaceholderFeatures({ precheck, locale }: { precheck: UrlPrecheck | null; locale: SupportedLocale }) {
  const urlCopy = getUrlResultCopy(locale);
  const structuralSignals = [
    precheck?.isRawIp ? urlCopy.rawIp : null,
    precheck?.isShortened ? urlCopy.urlShortener : null,
    precheck?.phishTankHit ? urlCopy.phishTankMatch : null
  ].filter(Boolean);

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
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{urlCopy.reviewActivity}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-primary-container">
              {precheck ? urlCopy.activitySummaryReady : urlCopy.activitySummaryIdle}
            </p>
          </div>
          <div className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
            {precheck ? urlCopy.reviewReady : urlCopy.awaitingLink}
          </div>
        </div>
        {precheck ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.normalizedHost}</p>
              <p className="mt-2 break-all text-sm leading-relaxed text-primary">{precheck.domain}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.precheckStatus}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary">{urlCopy.lookupReady}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.registeredDomain}</p>
              <p className="mt-2 break-all text-sm leading-relaxed text-primary">{precheck.registrableDomain}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.phishingDatabase}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary">
                {precheck.phishTankLoaded
                  ? precheck.phishTankHit
                    ? urlCopy.foundInPhishTank
                    : urlCopy.notFound
                  : urlCopy.datasetUnavailable}
              </p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4 md:col-span-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.structuralSignals}</p>
              {structuralSignals.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {structuralSignals.map((signal) => (
                    <span
                      key={signal}
                      className="border border-secondary/30 bg-secondary/10 px-3 py-2 font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-primary">{urlCopy.noStructuralSignals}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.normalizedUrl}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary">{urlCopy.precheckPlaceholder}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.registeredDomain}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary">{urlCopy.activitySummaryIdle}</p>
            </div>
            <div className="ghost-border bg-surface-container-lowest/30 p-4">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{urlCopy.phishingDatabase}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary">{urlCopy.datasetHint}</p>
            </div>
          </div>
        )}
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

function calmInspectionMessage(inspection: MessageScanResult["urlInspection"][number]) {
  if (inspection.inspection_succeeded) {
    return null;
  }

  if (inspection.blocked_reason) {
    return "CyberCoach blocked the live destination lookup before opening the page, so this destination remains only partially inspected.";
  }

  const rawError = String(inspection.error ?? "").toLowerCase();
  if (rawError.includes("timed out") || rawError.includes("timeout")) {
    return "CyberCoach started the live destination lookup, but the page did not respond in time.";
  }
  if (
    rawError.includes("name or service not known") ||
    rawError.includes("temporary failure in name resolution") ||
    rawError.includes("nodename nor servname provided") ||
    rawError.includes("no address associated with hostname") ||
    rawError.includes("failed to resolve")
  ) {
    return "CyberCoach could not resolve this destination from the current backend environment.";
  }
  return "CyberCoach could not complete the live destination lookup from the current backend environment.";
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
    return bucket.summary || copy.noLiveInspection;
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
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {bucketLabel(bucket.key, result.locale)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{bucketSummary(bucket, result.locale)}</p>
            </div>
            <div className="grid max-w-md gap-3 sm:grid-cols-2">
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

          {inspection.blocked_reason || (inspection.error && !inspection.inspection_succeeded) ? (
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              {calmInspectionMessage(inspection)}
            </p>
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
  reportBusy,
  decisionHighlightKey = 0
}: UrlScanResultsProps) {
  const [decisionHighlightActive, setDecisionHighlightActive] = useState(false);
  const copy = useMemo(() => getScanLocaleCopy(result?.locale ?? "en"), [result?.locale]);
  const decisionCopy = useMemo(() => getDecisionPanelCopy(result?.locale ?? "en"), [result?.locale]);
  const urlCopy = useMemo(() => getUrlResultCopy(result?.locale ?? "en"), [result?.locale]);
  const highlightSessionKey = result
    ? [result.raw.metadata?.history_id ?? "", result.riskScore, result.summary, result.likelyScamPattern].join("::")
    : null;

  useEffect(() => {
    if (typeof window === "undefined" || decisionHighlightKey === 0) {
      return;
    }

    setDecisionHighlightActive(true);
    const timeout = window.setTimeout(() => {
      setDecisionHighlightActive(false);
    }, 1700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [decisionHighlightKey]);

  if (loading) {
    return <LoadingResults />;
  }

  if (!result) {
    return <PlaceholderFeatures precheck={precheck} locale="en" />;
  }

  return (
    <section className="grid grid-cols-12 gap-6">
      <ResultShell
        title={result.riskLabelDisplay}
        eyebrow={copy.result.riskSummary}
        className="col-span-12 md:col-span-5"
        highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:risk` : null}
        highlightEnabled
      >
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

      <ResultShell
        title={copy.result.recommendedActions}
        eyebrow={copy.result.whatToDoNext}
        className="col-span-12 md:col-span-7"
        delay={60}
        highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:actions` : null}
        highlightEnabled
      >
        <RecommendedActionsCard actions={result.recommendedActions} />
      </ResultShell>

      <ResultShell
        title={copy.result.keyFindings}
        eyebrow={copy.result.patternScan}
        className="col-span-12 md:col-span-5"
        delay={120}
        highlightSessionKey={highlightSessionKey ? `${highlightSessionKey}:findings` : null}
        highlightEnabled
      >
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
        <ResultShell
          title={copy.result.technicalDetails}
          eyebrow={copy.result.triggeredRules}
          className={`col-span-12 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
          delay={180}
        >
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

      <ResultShell title={urlCopy.urlMetadata} eyebrow={urlCopy.forensicBreakdown} className="col-span-12" delay={220}>
        <UrlMetadataCard precheck={precheck} locale={result.locale} />
      </ResultShell>

      <ResultShell title={urlCopy.evidenceBuckets} eyebrow={urlCopy.riskLayers} className="col-span-12" delay={240}>
        <EvidenceBucketsCard result={result} />
      </ResultShell>

      <ResultShell title={urlCopy.destinationInspection} eyebrow={urlCopy.liveDestinationReview} className="col-span-12" delay={255}>
        <DestinationInspectionCard result={result} />
      </ResultShell>

      <ResultShell
        title={decisionCopy.titles.decisionTrace}
        eyebrow={decisionCopy.titles.consensusEngine}
        className={`col-span-12 md:col-span-4 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
        delay={270}
      >
        <DecisionSummaryPanel result={result} />
      </ResultShell>

      <ResultShell
        title={decisionCopy.titles.modelAssessments}
        eyebrow={decisionCopy.titles.crossModelReview}
        className={`col-span-12 md:col-span-8 ${decisionHighlightActive ? "scan-trace-spotlight" : ""}`}
        delay={285}
      >
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
    </section>
  );
}
