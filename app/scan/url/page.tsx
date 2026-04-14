import { UrlScanPage } from "@/components/scan/UrlScanPage";

type UrlScanRouteProps = {
  searchParams?: {
    q?: string | string[];
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

export default function UrlScanRoute({ searchParams }: UrlScanRouteProps) {
  return <UrlScanPage initialQuery={readParam(searchParams?.q)} initialAutoRun={readFlag(searchParams?.autorun)} />;
}
