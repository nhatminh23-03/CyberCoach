function isProductionLike(env) {
  const markers = [env.VERCEL_ENV, env.APP_ENV, env.ENVIRONMENT]
    .map((value) => (value || "").trim().toLowerCase());
  return markers.includes("production") || markers.includes("prod");
}

function isLocalApiBase(value) {
  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function validateProductionFrontendEnv(env) {
  if (!isProductionLike(env)) {
    return;
  }

  const configured = (env.API_BASE_URL || env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!configured) {
    throw new Error(
      "CyberCoach production build requires API_BASE_URL or NEXT_PUBLIC_API_BASE_URL to point at the deployed backend.",
    );
  }

  if (isLocalApiBase(configured)) {
    throw new Error(
      "CyberCoach production build must not use a localhost backend API base. Update API_BASE_URL or NEXT_PUBLIC_API_BASE_URL.",
    );
  }
}

validateProductionFrontendEnv(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
