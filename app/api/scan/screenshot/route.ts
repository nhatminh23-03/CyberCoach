import { proxyToBackend } from "@/lib/backendProxy";

export async function POST(request: Request) {
  const incoming = await request.formData();
  const proxied = new FormData();

  const image = incoming.get("image");
  if (image instanceof File) {
    proxied.append("image", image, image.name);
  }

  const language = incoming.get("language");
  const privacyMode = incoming.get("privacy_mode");

  if (typeof language === "string") {
    proxied.append("language", language);
  }
  if (typeof privacyMode === "string") {
    proxied.append("privacy_mode", privacyMode);
  }

  const response = await proxyToBackend("/scan/screenshot", {
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
