import { proxyMultipartRoute } from "@/app/api/_shared/proxyMultipartRoute";

export async function POST(request: Request) {
  return proxyMultipartRoute(request, {
    backendPath: "/scan/screenshot",
    fields: [
      { kind: "file", source: "image" },
      { kind: "text", source: "language" },
      { kind: "text", source: "privacy_mode" },
      { kind: "text", source: "qr_payloads" },
      { kind: "text", source: "ocr_override_text" },
    ],
  });
}
