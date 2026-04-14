import { DocumentScanPage } from "@/components/scan/DocumentScanPage";
import { MessageScanPage } from "@/components/scan/MessageScanPage";
import { ScreenshotScanPage } from "@/components/scan/ScreenshotScanPage";
import { UrlScanPage } from "@/components/scan/UrlScanPage";
import { VoiceScanPage } from "@/components/scan/VoiceScanPage";

type ScanPageProps = {
  searchParams?: {
    q?: string | string[];
    mode?: string | string[];
    view?: string | string[];
    autorun?: string | string[];
  };
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readFlag(value: string | string[] | undefined) {
  const normalized = readParam(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default function ScanPage({ searchParams }: ScanPageProps) {
  const initialQuery = readParam(searchParams?.q);
  const initialView = readParam(searchParams?.view || searchParams?.mode);
  const initialAutoRun = readFlag(searchParams?.autorun);

  if (initialView === "url") {
    return <UrlScanPage initialQuery={initialQuery} initialAutoRun={initialAutoRun} />;
  }

  if (initialView === "screenshot") {
    return <ScreenshotScanPage />;
  }

  if (initialView === "document") {
    return <DocumentScanPage />;
  }

  if (initialView === "voice") {
    return <VoiceScanPage />;
  }

  return <MessageScanPage initialQuery={initialQuery} initialView={initialView} initialAutoRun={initialAutoRun} />;
}
