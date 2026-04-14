import { proxyMultipartRoute } from "@/app/api/_shared/proxyMultipartRoute";

export async function POST(request: Request) {
  return proxyMultipartRoute(request, {
    backendPath: "/scan/voice/upload",
    fields: [
      { kind: "file", source: "file" },
      { kind: "text", source: "language" },
      { kind: "text", source: "privacy_mode" },
      { kind: "text", source: "transcript_override_text" },
    ],
  });
}
