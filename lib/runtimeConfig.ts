const DEFAULT_LOCAL_BACKEND_API_BASE = "http://127.0.0.1:8000/api";

type RuntimeConfigInput = {
  apiBaseUrl?: string | null;
  publicApiBaseUrl?: string | null;
  nodeEnv?: string | null;
  vercelEnv?: string | null;
  appEnv?: string | null;
  environment?: string | null;
  browserHostname?: string | null;
  browserProtocol?: string | null;
};

function trimValue(value?: string | null) {
  return value?.trim() || "";
}

function isProductionLike({ nodeEnv, vercelEnv, appEnv, environment }: RuntimeConfigInput) {
  const markers = [trimValue(vercelEnv), trimValue(appEnv), trimValue(environment)];
  if (markers.some((value) => value === "production" || value === "prod")) {
    return true;
  }

  return trimValue(nodeEnv) === "production";
}

function isLocalHostname(hostname?: string | null) {
  const normalized = trimValue(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function isLocalApiBase(url: string) {
  try {
    const parsed = new URL(url);
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function requirePublicApiBase(message: string): never {
  throw new Error(message);
}

export function resolveBackendApiBase(config: RuntimeConfigInput = {}) {
  const configured = trimValue(config.apiBaseUrl) || trimValue(config.publicApiBaseUrl);
  if (configured) {
    if (isProductionLike(config) && isLocalApiBase(configured)) {
      requirePublicApiBase(
        "CyberCoach production config must not use a localhost backend API base. Set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL to the public backend URL.",
      );
    }
    return configured;
  }

  if (isProductionLike(config)) {
    requirePublicApiBase(
      "CyberCoach production config requires API_BASE_URL or NEXT_PUBLIC_API_BASE_URL.",
    );
  }

  return DEFAULT_LOCAL_BACKEND_API_BASE;
}

export function resolveDirectBackendApiBase(config: RuntimeConfigInput = {}) {
  const configured = trimValue(config.publicApiBaseUrl);
  if (configured) {
    if (isProductionLike(config) && isLocalApiBase(configured) && !isLocalHostname(config.browserHostname)) {
      requirePublicApiBase(
        "CyberCoach production config must not point NEXT_PUBLIC_API_BASE_URL at localhost for public traffic.",
      );
    }
    return configured;
  }

  const browserHostname = trimValue(config.browserHostname);
  if (isLocalHostname(browserHostname)) {
    const protocol = trimValue(config.browserProtocol) === "https:" ? "https:" : "http:";
    return `${protocol}//${browserHostname}:8000/api`;
  }

  if (isProductionLike(config)) {
    requirePublicApiBase(
      "CyberCoach production config requires NEXT_PUBLIC_API_BASE_URL for live backend connections.",
    );
  }

  return DEFAULT_LOCAL_BACKEND_API_BASE;
}
