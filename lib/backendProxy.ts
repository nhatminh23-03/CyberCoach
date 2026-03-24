const DEFAULT_BACKEND_API_BASE = "http://127.0.0.1:8000/api";

export function getBackendApiBase() {
  return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BACKEND_API_BASE;
}

export async function proxyToBackend(path: string, init?: RequestInit) {
  const base = getBackendApiBase().replace(/\/$/, "");
  const target = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    return await fetch(target, init);
  } catch {
    return new Response(
      JSON.stringify({
        detail:
          "The CyberCoach backend could not be reached. Make sure FastAPI is running on port 8000, or set API_BASE_URL in the project root .env."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
