import { proxyToBackend } from "@/lib/backendProxy";

export async function POST(request: Request) {
  const body = await request.text();

  const response = await proxyToBackend("/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": response.headers.get("Content-Disposition") ?? ""
    }
  });
}
