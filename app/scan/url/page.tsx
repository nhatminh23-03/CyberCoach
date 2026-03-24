import { UrlScanPage } from "@/components/scan/UrlScanPage";

type UrlScanRouteProps = {
  searchParams?: {
    q?: string | string[];
  };
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function UrlScanRoute({ searchParams }: UrlScanRouteProps) {
  return <UrlScanPage initialQuery={readParam(searchParams?.q)} />;
}
