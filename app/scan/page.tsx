import { MessageScanPage } from "@/components/scan/MessageScanPage";
import { ScreenshotScanPage } from "@/components/scan/ScreenshotScanPage";
import { UrlScanPage } from "@/components/scan/UrlScanPage";

type ScanPageProps = {
  searchParams?: {
    q?: string | string[];
    mode?: string | string[];
    view?: string | string[];
  };
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function ScanPage({ searchParams }: ScanPageProps) {
  const initialQuery = readParam(searchParams?.q);
  const initialView = readParam(searchParams?.view || searchParams?.mode);

  if (initialView === "url") {
    return <UrlScanPage initialQuery={initialQuery} />;
  }

  if (initialView === "screenshot") {
    return <ScreenshotScanPage />;
  }

  return <MessageScanPage initialQuery={initialQuery} initialView={initialView} />;
}
