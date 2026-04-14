import { resolveBackendApiBase } from "@/lib/runtimeConfig";

export function getBackendApiBase() {
  return resolveBackendApiBase({
    apiBaseUrl: process.env.API_BASE_URL,
    publicApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    appEnv: process.env.APP_ENV,
    environment: process.env.ENVIRONMENT,
  });
}

export async function proxyToBackend(path: string, init?: RequestInit) {
  try {
    const base = getBackendApiBase().replace(/\/$/, "");
    const target = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    return await fetch(target, init);
  } catch (error) {
    const detail =
      error instanceof Error &&
      /production config|requires api_base_url|requires next_public_api_base_url|must not use a localhost backend api base/i.test(
        error.message,
      )
        ? "CyberCoach is missing required production API configuration. Set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL to the deployed backend."
        : "The CyberCoach backend could not be reached. Make sure FastAPI is running on port 8000, or set API_BASE_URL in the project root .env.";

    return new Response(
      JSON.stringify({
        detail,
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
