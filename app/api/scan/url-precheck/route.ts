import { proxyToBackend } from "@/lib/backendProxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  const response = await proxyToBackend(`/scan/url-precheck?url=${encodeURIComponent(targetUrl ?? "")}`, {
    method: "GET",
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json"
    }
  });
}
