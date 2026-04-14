import { proxyToBackend } from "@/lib/backendProxy";

export async function POST(request: Request) {
  const incoming = await request.formData();
  const proxied = new FormData();

  const file = incoming.get("file");
  if (file instanceof File) {
    proxied.append("file", file, file.name);
  }

  const language = incoming.get("language");
  const privacyMode = incoming.get("privacy_mode");
  const transcriptOverrideText = incoming.get("transcript_override_text");

  if (typeof language === "string") {
    proxied.append("language", language);
  }
  if (typeof privacyMode === "string") {
    proxied.append("privacy_mode", privacyMode);
  }
  if (typeof transcriptOverrideText === "string") {
    proxied.append("transcript_override_text", transcriptOverrideText);
  }

  const response = await proxyToBackend("/scan/voice/upload", {
    method: "POST",
    body: proxied,
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json"
    }
  });
}
