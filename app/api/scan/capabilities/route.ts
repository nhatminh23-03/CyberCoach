import { proxyToBackend } from "@/lib/backendProxy";

export async function GET() {
  const response = await proxyToBackend("/scan/capabilities", {
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
