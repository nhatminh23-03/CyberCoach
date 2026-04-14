import { proxyToBackend } from "@/lib/backendProxy";

type MultipartField =
  | { kind: "file"; source: string; target?: string }
  | { kind: "text"; source: string; target?: string };

type MultipartProxyConfig = {
  backendPath: string;
  fields: MultipartField[];
  fallbackContentType?: string;
};

export async function proxyMultipartRoute(request: Request, config: MultipartProxyConfig) {
  const incoming = await request.formData();
  const proxied = new FormData();

  for (const field of config.fields) {
    const value = incoming.get(field.source);
    const target = field.target ?? field.source;

    if (field.kind === "file") {
      if (value instanceof File) {
        proxied.append(target, value, value.name);
      }
      continue;
    }

    if (typeof value === "string") {
      proxied.append(target, value);
    }
  }

  const response = await proxyToBackend(config.backendPath, {
    method: "POST",
    body: proxied,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? config.fallbackContentType ?? "application/json",
    },
  });
}
