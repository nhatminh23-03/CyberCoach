import { proxyMultipartRoute } from "@/app/api/_shared/proxyMultipartRoute";

export async function POST(request: Request) {
  return proxyMultipartRoute(request, {
    backendPath: "/scan/document",
    fields: [
      { kind: "file", source: "file" },
      { kind: "text", source: "language" },
      { kind: "text", source: "privacy_mode" },
    ],
  });
}
